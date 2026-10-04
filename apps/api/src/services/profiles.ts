import { and, asc, desc, eq, gt, isNotNull, lt, or, sql } from "drizzle-orm";
import type { AnswerDto, LinkDto, Page, ProfileDto, PublicProfileDto, UpdateProfileInput } from "@unsaid/shared";
import type { AppContext } from "../context";
import { linkDailyStats, links, messages, profiles, settings, users } from "../db/schema";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { E, pgError } from "../lib/errors";
import { avatarUrl, profileDto } from "../mappers";
import { generateSlug } from "./slug";
import { newAvatarKey, processAvatar } from "./storage";
import { LIMITS } from "@unsaid/shared";

type Link = typeof links.$inferSelect;
type User = typeof users.$inferSelect;
const DAY = 86_400_000;

export const isPaused = (l: Pick<Link, "paused" | "pausedUntil">) => l.paused && (!l.pausedUntil || l.pausedUntil.getTime() > Date.now());
export const isClosed = (l: Pick<Link, "closesAt">) => Boolean(l.closesAt && l.closesAt.getTime() <= Date.now());

export interface ResolvedTarget {
  user: User; link: Link; profile: typeof profiles.$inferSelect; settings: typeof settings.$inferSelect;
}

export class ProfileService {
  constructor(private ctx: AppContext) {}

  async resolveTarget(by: { username: string } | { slug: string }): Promise<ResolvedTarget | null> {
    const { db } = this.ctx;
    const base = db.select({ user: users, link: links, profile: profiles, settings: settings }).from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id)).innerJoin(settings, eq(settings.userId, users.id)).innerJoin(links, eq(links.userId, users.id));
    const [row] = "username" in by
      ? await base.where(and(eq(users.username, by.username), eq(links.isPrimary, true))).limit(1)
      : await base.where(eq(links.slug, by.slug)).limit(1);
    if (!row || row.user.status === "banned") return null;
    return row;
  }

  toPublic(t: ResolvedTarget): PublicProfileDto {
    const closed = isClosed(t.link);
    const paused = isPaused(t.link) || !t.settings.acceptingMessages || t.user.status !== "active";
    const base = profileDto(this.ctx, t.user, t.profile);
    return { ...base, prompt: t.link.prompt ?? base.prompt, acceptingMessages: !paused && !closed, linkState: closed ? "closed" : paused ? "paused" : "open", linkLabel: t.link.isPrimary ? null : t.link.label };
  }

  async getPublic(by: { username: string } | { slug: string }): Promise<PublicProfileDto> {
    const t = await this.resolveTarget(by);
    if (!t) throw E.notFound("This link doesn't exist.");
    return this.toPublic(t);
  }

  async recordView(by: { username: string } | { slug: string }, sourceKey: string) {
    const t = await this.resolveTarget(by);
    if (!t) return;
    if (!(await this.ctx.rl.setOnce(`view:${t.link.id}:${sourceKey}`, 30 * 60_000))) return;
    await this.bumpStat(t.link.id, "views");
  }
  async bumpStat(linkId: string, col: "views" | "messages") {
    await this.ctx.db.insert(linkDailyStats).values({ linkId, day: sql`current_date` as unknown as string, [col]: 1 })
      .onConflictDoUpdate({ target: [linkDailyStats.linkId, linkDailyStats.day], set: { [col]: sql`${linkDailyStats[col]} + 1` } });
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<ProfileDto> {
    const [u] = await this.ctx.db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [p] = await this.ctx.db.update(profiles).set({ ...input, updatedAt: new Date() }).where(eq(profiles.userId, userId)).returning();
    return profileDto(this.ctx, u!, p!);
  }

  async changeUsername(user: User, username: string): Promise<ProfileDto> {
    if (username === user.username) throw E.validation("That's already your username.", { username: ["That's already your username."] });
    if (user.usernameChangedAt && Date.now() - user.usernameChangedAt.getTime() < 7 * DAY) throw E.conflict("You can change your username once every 7 days.", { username: ["You can change your username once every 7 days."] });
    try {
      const [u] = await this.ctx.db.update(users).set({ username, usernameChangedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id)).returning();
      const [p] = await this.ctx.db.select().from(profiles).where(eq(profiles.userId, user.id));
      return profileDto(this.ctx, u!, p!);
    } catch (e) {
      if (pgError(e).code === "23505") throw E.conflict("That username is taken.", { username: ["That username is taken."] });
      throw e;
    }
  }

  async usernameAvailable(username: string) {
    const [r] = await this.ctx.db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    return !r;
  }

  async setAvatar(user: User, file: Buffer): Promise<ProfileDto> {
    const processed = await processAvatar(file);
    const key = newAvatarKey();
    await this.ctx.storage.put(key, processed, "image/webp");
    const [old] = await this.ctx.db.select({ k: profiles.avatarKey }).from(profiles).where(eq(profiles.userId, user.id));
    const [p] = await this.ctx.db.update(profiles).set({ avatarKey: key, updatedAt: new Date() }).where(eq(profiles.userId, user.id)).returning();
    if (old?.k) await this.ctx.storage.delete(old.k);
    return profileDto(this.ctx, user, p!);
  }
  async removeAvatar(user: User): Promise<ProfileDto> {
    const [old] = await this.ctx.db.select({ k: profiles.avatarKey }).from(profiles).where(eq(profiles.userId, user.id));
    const [p] = await this.ctx.db.update(profiles).set({ avatarKey: null, updatedAt: new Date() }).where(eq(profiles.userId, user.id)).returning();
    if (old?.k) await this.ctx.storage.delete(old.k);
    return profileDto(this.ctx, user, p!);
  }

  // ---- public answers ----
  async answers(username: string, cursor: string | undefined, limit = 20): Promise<Page<AnswerDto>> {
    const t = await this.resolveTarget({ username });
    if (!t) throw E.notFound("This profile doesn't exist.");
    if (!t.settings.showAnswersPublicly) return { items: [], nextCursor: null };
    const c = decodeCursor(cursor);
    const rows = await this.ctx.db.select().from(messages).where(and(eq(messages.recipientId, t.user.id), eq(messages.replyPublic, true), isNotNull(messages.answerId),
      c ? or(lt(messages.repliedAt, new Date(c.t)), and(eq(messages.repliedAt, new Date(c.t)), lt(messages.id, c.id))) : undefined))
      .orderBy(desc(messages.repliedAt), desc(messages.id)).limit(limit + 1);
    const page = rows.slice(0, limit);
    const author = { username: t.user.username, displayName: t.profile.displayName, avatarUrl: avatarUrl(this.ctx, t.profile.avatarKey) };
    return { items: page.map((m) => ({ id: m.answerId!, question: m.body, answer: m.replyText!, createdAt: (m.repliedAt ?? m.createdAt).toISOString(), author })), nextCursor: rows.length > limit ? encodeCursor(page.at(-1)!.repliedAt!, page.at(-1)!.id) : null };
  }

  async answer(answerId: string): Promise<AnswerDto> {
    const [row] = await this.ctx.db.select({ m: messages, u: users, p: profiles, s: settings }).from(messages)
      .innerJoin(users, eq(users.id, messages.recipientId)).innerJoin(profiles, eq(profiles.userId, users.id)).innerJoin(settings, eq(settings.userId, users.id))
      .where(and(eq(messages.answerId, answerId), eq(messages.replyPublic, true))).limit(1);
    if (!row || row.u.status === "banned" || !row.s.showAnswersPublicly) throw E.notFound("This answer isn't available.");
    return { id: row.m.answerId!, question: row.m.body, answer: row.m.replyText!, createdAt: (row.m.repliedAt ?? row.m.createdAt).toISOString(), author: { username: row.u.username, displayName: row.p.displayName, avatarUrl: avatarUrl(this.ctx, row.p.avatarKey) } };
  }

  // ---- links ----
  url(l: Link, username: string) {
    return l.isPrimary ? `${this.ctx.config.WEB_URL}/u/${username}` : `${this.ctx.config.WEB_URL}/l/${l.slug}`;
  }
  async listLinks(user: User): Promise<LinkDto[]> {
    const rows = await this.ctx.db.select({
      l: links,
      views: sql<number>`coalesce((select sum(views) from link_daily_stats s where s.link_id = ${links.id}),0)::int`,
      msgs: sql<number>`(select count(*) from messages m where m.link_id = ${links.id})::int`
    }).from(links).where(eq(links.userId, user.id)).orderBy(desc(links.isPrimary), asc(links.createdAt));
    return rows.map((r) => this.linkDto(r.l, user.username, r.views, r.msgs));
  }
  linkDto(l: Link, username: string, views = 0, msgs = 0): LinkDto {
    const paused = isPaused(l);
    return { id: l.id, slug: l.slug, label: l.label, isPrimary: l.isPrimary, paused, pausedUntil: paused ? l.pausedUntil?.toISOString() ?? null : null, prompt: l.prompt, closesAt: l.closesAt?.toISOString() ?? null, closed: isClosed(l), url: this.url(l, username), views, messages: msgs, createdAt: l.createdAt.toISOString() };
  }
  async getLinkDto(user: User, id: string) {
    const all = await this.listLinks(user);
    const dto = all.find((l) => l.id === id);
    if (!dto) throw E.notFound();
    return dto;
  }
  private parseClose(v: string | null | undefined) {
    if (!v) return null;
    const d = new Date(v);
    if (d.getTime() <= Date.now()) throw E.validation("Choose a closing time in the future.", { closesAt: ["Choose a closing time in the future."] });
    if (d.getTime() > Date.now() + 366 * DAY) throw E.validation("Rounds can stay open for up to a year.", { closesAt: ["Rounds can stay open for up to a year."] });
    return d;
  }
  async createLink(user: User, input: { label: string; prompt?: string; closesAt?: string | null }) {
    const label = input.label;
    const [{ n } = { n: 0 }] = await this.ctx.db.select({ n: sql<number>`count(*)::int` }).from(links).where(eq(links.userId, user.id));
    if (n >= LIMITS.linksPerUser) throw E.conflict(`You can have up to ${LIMITS.linksPerUser} links.`);
    const [l] = await this.ctx.db.insert(links).values({ userId: user.id, slug: generateSlug(10), label, prompt: input.prompt ?? null, closesAt: this.parseClose(input.closesAt) }).returning();
    return this.linkDto(l!, user.username);
  }
  async updateLink(user: User, id: string, input: { label?: string; paused?: boolean; prompt?: string | null; closesAt?: string | null }) {
    const patch: Partial<typeof links.$inferInsert> = {};
    if (input.label !== undefined) patch.label = input.label;
    if (input.prompt !== undefined) patch.prompt = input.prompt;
    if (input.closesAt !== undefined) patch.closesAt = this.parseClose(input.closesAt);
    if (input.paused !== undefined) { patch.paused = input.paused; patch.pausedUntil = null; }
    if (Object.keys(patch).length) {
      const r = await this.ctx.db.update(links).set(patch).where(and(eq(links.id, id), eq(links.userId, user.id))).returning({ id: links.id });
      if (!r.length) throw E.notFound();
    }
    return this.getLinkDto(user, id);
  }
  async deleteLink(user: User, id: string) {
    const [l] = await this.ctx.db.select().from(links).where(and(eq(links.id, id), eq(links.userId, user.id))).limit(1);
    if (!l) throw E.notFound();
    if (l.isPrimary) throw E.conflict("Your main link can't be deleted. Pause it instead.");
    await this.ctx.db.delete(links).where(eq(links.id, id));
  }
  async pausePrimary(user: User, paused: boolean, until?: string | null) {
    const when = until ? new Date(until) : null;
    if (when && when.getTime() <= Date.now()) throw E.validation("Choose a time in the future.", { until: ["Choose a time in the future."] });
    const [l] = await this.ctx.db.update(links).set({ paused, pausedUntil: paused ? when : null }).where(and(eq(links.userId, user.id), eq(links.isPrimary, true))).returning();
    return this.getLinkDto(user, l!.id);
  }
}
