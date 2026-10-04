import { and, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import type { AdminAbuseDto, AdminAuditLogDto, AdminHealthDto, AdminModerationEventDto, AdminOverviewDto, AdminReportDto, AdminUserDto, ModerationCategory, Page, ReportAction } from "@unsaid/shared";
import type { AppContext } from "../context";
import { auditLogs, bannedSources, messages, moderationEvents, profiles, reports, sessions, users } from "../db/schema";
import { decodeCursor, encodeCursor } from "../lib/cursor";
import { E } from "../lib/errors";

type User = typeof users.$inferSelect;
const UUID = /^[0-9a-f-]{36}$/i;

export class AdminService {
  constructor(private ctx: AppContext) {}

  async audit(actor: User, action: string, targetType: string | null, targetId: string | null, meta: Record<string, unknown> = {}) {
    await this.ctx.db.insert(auditLogs).values({ actorId: actor.id, action, targetType, targetId, meta });
  }

  async overview(): Promise<AdminOverviewDto> {
    const r = await this.ctx.db.execute<Record<string, number>>(sql`
      select
        (select count(*) from users)::int as users_total,
        (select count(*) from users where last_seen_at > now() - interval '7 days')::int as active7d,
        (select count(*) from users where status='suspended')::int as suspended,
        (select count(*) from users where status='banned')::int as banned,
        (select count(*) from users where created_at >= date_trunc('day', now()))::int as new_today,
        (select count(*) from messages)::int as msgs_total,
        (select count(*) from messages where created_at >= date_trunc('day', now()))::int as msgs_today,
        (select count(*) from messages where status='filtered')::int as msgs_filtered,
        (select count(*) from moderation_events where kind='message' and outcome='reject' and created_at >= date_trunc('day', now()))::int as rejected_today,
        (select count(*) from moderation_events where kind='message' and outcome='reject')::int as rejected_total,
        (select count(*) from reports where status='open')::int as reports_open,
        (select count(*) from reports)::int as reports_total,
        (select count(*) from blocks)::int as blocks_total`);
    const x = r.rows[0]!;
    const denom = Math.max(1, x.msgs_total! + x.rejected_total!);
    const daily = await this.ctx.db.execute<{ date: string; messages: number; reports: number; signups: number }>(sql`
      select to_char(g.day,'YYYY-MM-DD') as date,
        (select count(*) from messages m where m.created_at >= g.day and m.created_at < g.day + interval '1 day')::int as messages,
        (select count(*) from reports p where p.created_at >= g.day and p.created_at < g.day + interval '1 day')::int as reports,
        (select count(*) from users u where u.created_at >= g.day and u.created_at < g.day + interval '1 day')::int as signups
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') as g(day) order by g.day`);
    return {
      users: { total: x.users_total!, active7d: x.active7d!, suspended: x.suspended!, banned: x.banned!, newToday: x.new_today! },
      messages: { total: x.msgs_total!, today: x.msgs_today!, filtered: x.msgs_filtered!, rejectedToday: x.rejected_today! },
      reports: { open: x.reports_open!, total: x.reports_total! },
      rates: {
        blockRate: x.msgs_total! ? x.blocks_total! / x.msgs_total! : 0,
        reportRate: x.msgs_total! ? x.reports_total! / x.msgs_total! : 0,
        moderationRate: (x.msgs_filtered! + x.rejected_total!) / denom
      },
      daily: daily.rows
    };
  }

  private userSelect() {
    return this.ctx.db.select({
      u: users, displayName: profiles.displayName,
      received: sql<number>`(select count(*) from messages m where m.recipient_id = ${users.id})::int`,
      filed: sql<number>`(select count(*) from reports r where r.reporter_id = ${users.id})::int`
    }).from(users).innerJoin(profiles, eq(profiles.userId, users.id));
  }
  private userDto(r: { u: User; displayName: string; received: number; filed: number }): AdminUserDto {
    return { id: r.u.id, email: r.u.email, username: r.u.username, displayName: r.displayName, role: r.u.role, status: r.u.status, emailVerified: Boolean(r.u.emailVerifiedAt), messagesReceived: r.received, reportsFiled: r.filed, createdAt: r.u.createdAt.toISOString(), lastSeenAt: r.u.lastSeenAt?.toISOString() ?? null };
  }

  async users(q: { q?: string; status?: string; cursor?: string; limit: number }): Promise<Page<AdminUserDto>> {
    const c = decodeCursor(q.cursor);
    const term = q.q?.replace(/\u0000/g, "").trim();
    const like = term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null;
    const rows = await this.userSelect().where(and(
      q.status ? eq(users.status, q.status as User["status"]) : undefined,
      term ? or(ilike(users.username, like!), ilike(users.email, like!), UUID.test(term) ? eq(users.id, term) : undefined) : undefined,
      c ? or(lt(users.createdAt, new Date(c.t)), and(eq(users.createdAt, new Date(c.t)), lt(users.id, c.id))) : undefined
    )).orderBy(desc(users.createdAt), desc(users.id)).limit(q.limit + 1);
    const page = rows.slice(0, q.limit);
    return { items: page.map((r) => this.userDto(r)), nextCursor: rows.length > q.limit ? encodeCursor(page.at(-1)!.u.createdAt, page.at(-1)!.u.id) : null };
  }
  async user(id: string): Promise<AdminUserDto> {
    if (!UUID.test(id)) throw E.notFound();
    const [r] = await this.userSelect().where(eq(users.id, id)).limit(1);
    if (!r) throw E.notFound("User not found.");
    return this.userDto(r);
  }

  async setStatus(actor: User, id: string, status: "active" | "suspended" | "banned", action: string, note?: string): Promise<AdminUserDto> {
    if (!UUID.test(id)) throw E.notFound();
    const [target] = await this.ctx.db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!target) throw E.notFound("User not found.");
    if (target.id === actor.id) throw E.forbidden("You can't change your own status.");
    if (target.role === "admin" && actor.role !== "admin") throw E.forbidden("Only admins can act on admins.");
    if ((status === "banned" || target.status === "banned") && actor.role !== "admin") throw E.forbidden("Only admins can ban or unban.");
    await this.ctx.db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, id));
    if (status === "banned") await this.ctx.db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, id), sql`revoked_at is null`));
    await this.audit(actor, action, "user", id, { note: note ?? null, from: target.status, to: status });
    await this.ctx.db.insert(moderationEvents).values({ kind: "admin_action", outcome: action.replace("user.", ""), userId: id });
    if (status !== "banned") {
      await this.ctx.notifier.notify({ userId: id, type: "safety", title: status === "suspended" ? "Your account was suspended" : "Your account was restored", body: status === "suspended" ? "Your link is paused while we review activity. Contact support if you think this is a mistake." : "Your account is active again." }).catch(() => undefined);
    }
    return this.user(id);
  }

  async reports(q: { status: "open" | "resolved" | "dismissed"; cursor?: string; limit: number }): Promise<Page<AdminReportDto>> {
    const c = decodeCursor(q.cursor);
    const rows = await this.ctx.db.select({
      r: reports, ru: { id: users.id, username: users.username, status: users.status },
      same: sql<number>`case when ${reports.sourceHash} is null then 1 else (select count(*) from reports x where x.source_hash = ${reports.sourceHash})::int end`
    }).from(reports).innerJoin(users, eq(users.id, reports.recipientId)).where(and(eq(reports.status, q.status),
      c ? or(lt(reports.createdAt, new Date(c.t)), and(eq(reports.createdAt, new Date(c.t)), lt(reports.id, c.id))) : undefined))
      .orderBy(desc(reports.createdAt), desc(reports.id)).limit(q.limit + 1);
    const page = rows.slice(0, q.limit);
    return { items: page.map((x) => this.reportDto(x.r, x.ru, x.same)), nextCursor: rows.length > q.limit ? encodeCursor(page.at(-1)!.r.createdAt, page.at(-1)!.r.id) : null };
  }
  private reportDto(r: typeof reports.$inferSelect, ru: { id: string; username: string; status: User["status"] }, same: number): AdminReportDto {
    return {
      id: r.id, status: r.status, reason: r.reason as AdminReportDto["reason"], details: r.details, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null, resolution: r.resolution,
      message: { id: r.messageId ?? "", body: r.messageBody, filteredCategories: r.filteredCategories as ModerationCategory[], createdAt: r.messageCreatedAt.toISOString() },
      recipient: ru, reporterId: r.reporterId, sameSourceReports: same
    };
  }

  async resolveReport(actor: User, id: string, action: ReportAction, note?: string): Promise<AdminReportDto> {
    if (!UUID.test(id)) throw E.notFound();
    const [row] = await this.ctx.db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!row) throw E.notFound("Report not found.");
    if (row.status !== "open") throw E.conflict("This report was already handled.");
    if ((action === "ban_user") && actor.role !== "admin") throw E.forbidden("Only admins can ban users.");
    const [msg] = row.messageId ? await this.ctx.db.select().from(messages).where(eq(messages.id, row.messageId)).limit(1) : [];
    let resolution: string = action;
    if (action === "remove_message" && row.messageId) await this.ctx.db.delete(messages).where(eq(messages.id, row.messageId));
    if (action === "suspend_user" || action === "ban_user") {
      // Anonymous senders have no account: the action applies to the anonymous *source* (keyed hash), platform-wide.
      const hash = msg?.sourceHash ?? row.sourceHash;
      if (!hash) resolution = `${action}:source_expired`;
      else {
        const until = action === "suspend_user" ? new Date(Date.now() + 7 * 86_400_000) : null;
        await this.ctx.db.insert(bannedSources).values({ sourceHash: hash, until, reason: note ?? row.reason, createdBy: actor.id })
          .onConflictDoUpdate({ target: bannedSources.sourceHash, set: { until, reason: note ?? row.reason, createdBy: actor.id } });
      }
    }
    const status = action === "dismiss" ? "dismissed" : "resolved";
    await this.ctx.db.update(reports).set({ status, resolution, resolvedBy: actor.id, resolvedAt: new Date() }).where(eq(reports.id, id));
    await this.audit(actor, `report.${action}`, "report", id, { note: note ?? null });
    await this.ctx.db.insert(moderationEvents).values({ kind: "admin_action", outcome: action, userId: row.recipientId, sourceHash: row.sourceHash });
    const [done] = await this.ctx.db.select({ r: reports, ru: { id: users.id, username: users.username, status: users.status } }).from(reports).innerJoin(users, eq(users.id, reports.recipientId)).where(eq(reports.id, id));
    return this.reportDto(done!.r, done!.ru, 1);
  }

  async moderationEvents(cursor?: string): Promise<Page<AdminModerationEventDto>> {
    const c = decodeCursor(cursor);
    const rows = await this.ctx.db.select().from(moderationEvents).where(c ? or(lt(moderationEvents.createdAt, new Date(c.t)), and(eq(moderationEvents.createdAt, new Date(c.t)), lt(moderationEvents.id, c.id))) : undefined).orderBy(desc(moderationEvents.createdAt), desc(moderationEvents.id)).limit(51);
    const page = rows.slice(0, 50);
    return { items: page.map((e) => ({ id: e.id, kind: e.kind, outcome: e.outcome, categories: e.categories as ModerationCategory[], createdAt: e.createdAt.toISOString(), messageId: e.messageId, userId: e.userId })), nextCursor: rows.length > 50 ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id) : null };
  }
  async auditLogs(cursor?: string): Promise<Page<AdminAuditLogDto>> {
    const c = decodeCursor(cursor);
    const rows = await this.ctx.db.select().from(auditLogs).where(c ? or(lt(auditLogs.createdAt, new Date(c.t)), and(eq(auditLogs.createdAt, new Date(c.t)), lt(auditLogs.id, c.id))) : undefined).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(51);
    const page = rows.slice(0, 50);
    return { items: page.map((a) => ({ id: a.id, actorId: a.actorId, action: a.action, targetType: a.targetType, targetId: a.targetId, meta: a.meta, createdAt: a.createdAt.toISOString() })), nextCursor: rows.length > 50 ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id) : null };
  }

  async abuse(): Promise<AdminAbuseDto> {
    const { db } = this.ctx;
    const top = await db.execute<{ ref: string; messages: number; rejected: number; reports: number; last: Date }>(sql`
      with agg as (
        select left(source_hash, 8) as ref,
          count(*) filter (where outcome in ('allow','hold'))::int as messages,
          count(*) filter (where outcome = 'reject')::int as rejected,
          max(created_at) as last
        from moderation_events where source_hash is not null and created_at > now() - interval '7 days' and kind = 'message'
        group by left(source_hash, 8) having count(*) >= 2
      )
      select agg.ref, agg.messages, agg.rejected, agg.last,
        (select count(*) from reports r where left(r.source_hash, 8) = agg.ref)::int as reports
      from agg order by agg.rejected desc, agg.messages desc limit 20`);
    const [flood] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from moderation_events where outcome in ('challenge') and created_at > now() - interval '24 hours'`)).rows;
    const cats = await db.execute<{ category: string; count: number }>(sql`select c as category, count(*)::int as count from moderation_events, unnest(categories) c where outcome = 'reject' and created_at > now() - interval '7 days' group by c order by count desc`);
    return {
      topSources: top.rows.map((r) => ({ sourceRef: r.ref, messages: r.messages, rejected: r.rejected, reports: r.reports, lastSeenAt: new Date(r.last).toISOString() })),
      floodingLast24h: flood?.n ?? 0, rejectedByCategory: cats.rows
    };
  }

  async health(version: string): Promise<AdminHealthDto> {
    const t0 = performance.now();
    let ok = true;
    try { await this.ctx.pool.query("select 1"); } catch { ok = false; }
    const m = this.ctx.metrics;
    return { status: ok ? "ok" : "degraded", uptimeSeconds: Math.round((Date.now() - m.startedAt) / 1000), db: { ok, latencyMs: Math.round((performance.now() - t0) * 10) / 10 }, memoryMb: Math.round(process.memoryUsage().rss / 1048576), version, counters: { requests: m.requests, errors5xx: m.errors5xx, rateLimited: m.rateLimited }, checkedAt: new Date().toISOString() };
  }
}
