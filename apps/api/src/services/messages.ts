import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { BlockDto, MessageDto, MessageStatus, ModerationCategory, Page, ReportReason, SendMessageInput } from "@unsaid/shared";
import type { AppContext } from "../context";
import { bannedSources, blocks, hiddenWords, links, messageEvidence, messages, moderationEvents, reports, users } from "../db/schema";
import { encryptField, hmacHex } from "../lib/crypto";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { AppError, E } from "../lib/errors";
import { issueChallenge, verifyChallenge } from "../lib/pow";
import { HOUR, MIN } from "../lib/ratelimit";
import { messageDto } from "../mappers";
import { foldForMatching } from "../moderation/normalize";
import { moderate } from "../moderation/engine";
import { isClosed, isPaused, ProfileService } from "./profiles";

type User = typeof users.$inferSelect;
export interface SenderContext { ip: string; deviceId: string | null; userAgent?: string | null }

const REJECT_COPY: Partial<Record<ModerationCategory, string>> = {
  threat: "That message sounds threatening, so it wasn't sent. Please keep it kind.",
  hate: "That message contains hateful language, so it wasn't sent.",
  sexual: "That message contains sexual content, so it wasn't sent.",
  self_harm: "That message could hurt someone, so it wasn't sent. If you're struggling yourself, please reach out to someone you trust.",
  personal_info: "That message contains personal information, so it wasn't sent.",
  dangerous: "That message contains dangerous content, so it wasn't sent.",
  spam: "That looks like spam, so it wasn't sent.",
  harassment: "That message looks like harassment, so it wasn't sent. Try saying it kindly."
};
const MILESTONES = new Set([10, 50, 100, 500, 1000]);

export class MessageService {
  constructor(private ctx: AppContext, private profilesSvc: ProfileService) {}

  sourceHash(ip: string) { return hmacHex(this.ctx.config.APP_SECRET, `ip:${ip}`); }
  deviceHash(id: string | null) { return id ? hmacHex(this.ctx.config.APP_SECRET, `dev:${id}`) : null; }

  private async hitLimit(key: string, max: number, windowMs: number) {
    if (this.ctx.config.RATE_LIMIT_DISABLED) return;
    const r = await this.ctx.rl.hit(key, windowMs);
    if (r.count > max) { this.ctx.metrics.rateLimited++; throw E.rateLimited(Math.ceil(r.retryAfterMs / 1000)); }
  }

  private async event(e: Partial<typeof moderationEvents.$inferInsert> & { outcome: string }) {
    await this.ctx.db.insert(moderationEvents).values({ kind: "message", categories: [], ...e }).catch(() => undefined);
  }

  /** The anonymous send flow. See docs/API.md "Send flow". */
  async send(input: SendMessageInput, sender: SenderContext): Promise<{ status: "delivered" }> {
    const { ctx } = this;
    const target = await this.profilesSvc.resolveTarget(input.username ? { username: input.username } : { slug: input.slug! });
    if (!target) throw E.notFound("This link doesn't exist.");
    const { user, link, settings: set } = target;
    if (isClosed(link)) throw new AppError("link_paused", "This round has closed. Thanks for stopping by!");
    if (isPaused(link) || !set.acceptingMessages || user.status !== "active") throw new AppError("link_paused", "This link isn't taking messages right now.");

    const src = this.sourceHash(sender.ip);
    const dev = this.deviceHash(sender.deviceId);

    // Throttling (hard limits)
    await this.hitLimit(`msg:ip:${src}`, 60, HOUR);
    await this.hitLimit(`msg:ip-rcpt:${src}:${user.id}`, 6, 10 * MIN);
    await this.hitLimit(`msg:rcpt:${user.id}`, 300, HOUR);

    // Risk → proof-of-work challenge
    if (!ctx.config.RATE_LIMIT_DISABLED) {
      const recent = await ctx.rl.count(`msg:risk:${src}`, 10 * MIN);
      const [{ rejects } = { rejects: 0 }] = await ctx.db.select({ rejects: sql<number>`count(*)::int` }).from(moderationEvents)
        .where(and(eq(moderationEvents.sourceHash, src), eq(moderationEvents.outcome, "reject"), gt(moderationEvents.createdAt, new Date(Date.now() - HOUR))));
      if (recent >= 3 || rejects >= 2) {
        const ok = input.challenge ? await verifyChallenge(ctx.config.APP_SECRET, ctx.config.POW_DIFFICULTY, ctx.rl, input.challenge) : false;
        if (!ok) {
          await this.event({ outcome: "challenge", userId: user.id, sourceHash: src });
          throw new AppError("challenge_required", "Quick check before sending — this will only take a moment.", { challenge: issueChallenge(ctx.config.APP_SECRET, ctx.config.POW_DIFFICULTY) });
        }
      }
      await ctx.rl.hit(`msg:risk:${src}`, 10 * MIN);
    }

    // Platform-wide source ban (admin action): accept silently, store nothing.
    const [banned] = await ctx.db.select({ id: bannedSources.id }).from(bannedSources).where(and(eq(bannedSources.sourceHash, src), or(isNull(bannedSources.until), gt(bannedSources.until, new Date())))).limit(1);
    if (banned) { await this.event({ outcome: "banned_source", userId: user.id, sourceHash: src }); return { status: "delivered" }; }

    // Recipient's blocks: accept silently so a blocked sender can't probe, but store nothing.
    const [blocked] = await ctx.db.select({ id: blocks.id }).from(blocks).where(and(eq(blocks.ownerId, user.id), or(eq(blocks.sourceHash, src), dev ? eq(blocks.deviceHash, dev) : sql`false`))).limit(1);
    if (blocked) { await this.event({ outcome: "blocked", userId: user.id, sourceHash: src }); return { status: "delivered" }; }

    // Duplicate detection (normalised body)
    const bodyHash = hmacHex(ctx.config.APP_SECRET, `body:${foldForMatching(input.body)}`);
    const dayAgo = new Date(Date.now() - 24 * HOUR);
    const isDuplicate = async (db: Pick<typeof ctx.db, "select">) => {
      const [dup] = await db.select({ same: sql<number>`count(*) filter (where ${messages.sourceHash} = ${src})::int`, all: sql<number>`count(*)::int` })
        .from(messages).where(and(eq(messages.recipientId, user.id), eq(messages.bodyHash, bodyHash), gt(messages.createdAt, dayAgo)));
      return (dup?.same ?? 0) > 0 || (dup?.all ?? 0) >= 3;
    };
    if (await isDuplicate(ctx.db)) { await this.event({ outcome: "duplicate", userId: user.id, sourceHash: src }); return { status: "delivered" }; }

    // Moderation (hidden words + rules)
    const hidden = (await ctx.db.select({ w: hiddenWords.word }).from(hiddenWords).where(eq(hiddenWords.userId, user.id))).map((r) => r.w);
    const verdict = moderate(input.body, { enhanced: set.enhancedModeration, hiddenWords: hidden });
    if (verdict.decision === "reject") {
      await this.event({ outcome: "reject", categories: verdict.categories, score: verdict.score, userId: user.id, sourceHash: src });
      const cat = verdict.categories.find((c) => REJECT_COPY[c]) ?? "harassment";
      throw new AppError("moderation_rejected", REJECT_COPY[cat]!, { categories: verdict.categories });
    }
    const status: MessageStatus = verdict.decision === "hold" ? "filtered" : "inbox";
    // Re-check duplicates and insert under an advisory lock keyed by (recipient, body) so parallel identical sends cannot all slip past the check.
    const msg = await ctx.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${user.id}:${bodyHash}`}, 0))`);
      if (await isDuplicate(tx)) return null;
      const [row] = await tx.insert(messages).values({
        recipientId: user.id, linkId: link.id, body: input.body, status, sourceHash: src, deviceHash: dev, bodyHash,
        filteredCategories: status === "filtered" ? verdict.categories : []
      }).returning();
      return row!;
    });
    if (!msg) { await this.event({ outcome: "duplicate", userId: user.id, sourceHash: src }); return { status: "delivered" }; }
    await this.event({ outcome: verdict.decision, categories: verdict.categories, score: verdict.score, messageId: msg.id, userId: user.id, sourceHash: src });
    // Safety evidence (disclosed in the privacy policy): encrypted network address, short retention, admin-only.
    await ctx.db.insert(messageEvidence).values({
      messageId: msg.id, ipEnc: encryptField(ctx.config.APP_SECRET, sender.ip), channel: input.src ?? "direct",
      userAgent: sender.userAgent ? sender.userAgent.slice(0, 300) : null, keepUntil: new Date(Date.now() + ctx.config.EVIDENCE_DAYS * 24 * HOUR)
    }).catch((e) => console.error("evidence insert failed", e));
    await this.profilesSvc.bumpStat(link.id, "messages");

    // Notifications (never block the sender's response on them)
    void this.notifyRecipient(user, status, msg.id);
    return { status: "delivered" };
  }

  private async notifyRecipient(user: User, status: MessageStatus, messageId: string) {
    try {
      if (status === "inbox") {
        await this.ctx.notifier.notify({ userId: user.id, type: "new_message", title: "New anonymous message{s}", body: "You have {n} unread anonymous message{s}.", data: { messageId }, coalesceKey: "inbox" });
        const [{ n } = { n: 0 }] = await this.ctx.db.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.recipientId, user.id), eq(messages.status, "inbox")));
        if (MILESTONES.has(n)) await this.ctx.notifier.notify({ userId: user.id, type: "message_activity", title: `${n} messages and counting`, body: `You've received ${n} anonymous messages. People have things to say!` });
      } else {
        await this.ctx.notifier.notify({ userId: user.id, type: "safety", title: "A message was held for you", body: "Our filters held {n} message{s} in your Filtered folder. Review them when you're ready.", coalesceKey: "filtered" });
      }
    } catch { /* notification failures must not affect delivery */ }
  }

  // ---- inbox ----
  async list(userId: string, status: MessageStatus, cursor: string | undefined, limit: number, linkId?: string): Promise<Page<MessageDto>> {
    const c = decodeCursor(cursor);
    const rows = await this.ctx.db.select({ m: messages, label: links.label, primary: links.isPrimary }).from(messages).leftJoin(links, eq(links.id, messages.linkId))
      .where(and(eq(messages.recipientId, userId), eq(messages.status, status), linkId ? eq(messages.linkId, linkId) : undefined, c ? or(lt(messages.createdAt, new Date(c.t)), and(eq(messages.createdAt, new Date(c.t)), lt(messages.id, c.id))) : undefined))
      .orderBy(desc(messages.createdAt), desc(messages.id)).limit(limit + 1);
    const page = rows.slice(0, limit);
    return { items: page.map((r) => messageDto(r.m, r.primary ? null : r.label)), nextCursor: rows.length > limit ? encodeCursor(page.at(-1)!.m.createdAt, page.at(-1)!.m.id) : null };
  }

  private async own(userId: string, id: string) {
    const [row] = await this.ctx.db.select({ m: messages, label: links.label, primary: links.isPrimary }).from(messages).leftJoin(links, eq(links.id, messages.linkId))
      .where(and(eq(messages.id, id), eq(messages.recipientId, userId))).limit(1);
    if (!row) throw E.notFound("That message doesn't exist.");
    return row;
  }
  async get(userId: string, id: string) { const r = await this.own(userId, id); return messageDto(r.m, r.primary ? null : r.label); }

  async update(userId: string, id: string, patch: { read?: boolean; status?: "inbox" | "archived" }) {
    const cur = await this.own(userId, id);
    const set: Partial<typeof messages.$inferInsert> = {};
    if (patch.read !== undefined) set.readAt = patch.read ? (cur.m.readAt ?? new Date()) : null;
    if (patch.status) {
      set.status = patch.status;
      // moving a filtered message to the inbox is an explicit "this is fine" by the owner
      if (cur.m.status === "filtered" && patch.status === "inbox") set.filteredCategories = [];
    }
    if (Object.keys(set).length) await this.ctx.db.update(messages).set(set).where(eq(messages.id, id));
    return this.get(userId, id);
  }

  async remove(userId: string, id: string) {
    const res = await this.ctx.db.delete(messages).where(and(eq(messages.id, id), eq(messages.recipientId, userId))).returning({ id: messages.id });
    if (!res.length) throw E.notFound("That message doesn't exist.");
  }

  async reply(user: User, id: string, text: string, isPublic: boolean) {
    const cur = await this.own(user.id, id);
    if (isPublic) {
      if (!user.emailVerifiedAt) throw new AppError("email_not_verified", "Verify your email to publish answers.");
      if (user.status !== "active") throw new AppError("account_suspended", "Your account can't publish right now.");
      if (cur.m.filteredCategories.length) throw E.conflict("Move this message to your inbox before answering publicly.");
      const v = moderate(text, { enhanced: true });
      if (v.decision !== "allow") throw new AppError("moderation_rejected", "Your answer can't be published because it may break our community rules.");
    }
    await this.ctx.db.update(messages).set({
      replyText: text, replyPublic: isPublic, repliedAt: new Date(), answerId: isPublic ? (cur.m.answerId ?? randomUUID()) : cur.m.answerId,
      readAt: cur.m.readAt ?? new Date(), status: cur.m.status === "filtered" ? "filtered" : "inbox"
    }).where(eq(messages.id, id));
    return this.get(user.id, id);
  }
  async removeReply(userId: string, id: string) {
    await this.own(userId, id);
    await this.ctx.db.update(messages).set({ replyText: null, replyPublic: false, repliedAt: null }).where(eq(messages.id, id));
    return this.get(userId, id);
  }

  async report(user: User, id: string, reason: ReportReason, details?: string) {
    const cur = await this.own(user.id, id);
    await this.ctx.db.insert(reports).values({
      messageId: id, reporterId: user.id, recipientId: user.id, reason, details: details ?? null, messageBody: cur.m.body,
      messageCreatedAt: cur.m.createdAt, filteredCategories: cur.m.filteredCategories, sourceHash: cur.m.sourceHash
    }).onConflictDoNothing();
    // A report keeps the evidence for the longer window so it can be handed to the authorities if needed.
    await this.ctx.db.update(messageEvidence).set({ keepUntil: new Date(Date.now() + this.ctx.config.EVIDENCE_REPORTED_DAYS * 24 * HOUR) }).where(eq(messageEvidence.messageId, id)).catch(() => undefined);
    await this.ctx.db.insert(moderationEvents).values({ kind: "report", outcome: "report", categories: [reason === "other" ? "harassment" : reason as ModerationCategory], messageId: id, userId: user.id, sourceHash: cur.m.sourceHash }).catch(() => undefined);
  }

  async block(user: User, id: string): Promise<BlockDto> {
    const cur = await this.own(user.id, id);
    if (!cur.m.sourceHash && !cur.m.deviceHash) throw E.conflict("This message is too old to block its source.");
    const ref = (cur.m.sourceHash ?? cur.m.deviceHash)!.slice(0, 4).toUpperCase();
    const values = { ownerId: user.id, sourceHash: cur.m.sourceHash, deviceHash: cur.m.deviceHash, label: `Anonymous source ${ref}` };
    const [row] = await this.ctx.db.insert(blocks).values(values).onConflictDoNothing().returning();
    const existing = row ?? (await this.ctx.db.select().from(blocks).where(and(eq(blocks.ownerId, user.id), cur.m.sourceHash ? eq(blocks.sourceHash, cur.m.sourceHash) : eq(blocks.deviceHash, cur.m.deviceHash!))).limit(1))[0]!;
    await this.ctx.db.update(messages).set({ status: "archived" }).where(eq(messages.id, id));
    return { id: existing.id, createdAt: existing.createdAt.toISOString(), label: existing.label };
  }
  async listBlocks(userId: string): Promise<BlockDto[]> {
    const rows = await this.ctx.db.select().from(blocks).where(eq(blocks.ownerId, userId)).orderBy(desc(blocks.createdAt));
    return rows.map((b) => ({ id: b.id, createdAt: b.createdAt.toISOString(), label: b.label }));
  }
  async unblock(userId: string, id: string) {
    const res = await this.ctx.db.delete(blocks).where(and(eq(blocks.id, id), eq(blocks.ownerId, userId))).returning({ id: blocks.id });
    if (!res.length) throw E.notFound();
  }
}
