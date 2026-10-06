import type { FastifyBaseLogger } from "fastify";
import { sql } from "drizzle-orm";
import type { AppContext } from "../context";

/** Periodic housekeeping: privacy retention, expired tokens/sessions, expired bans. Safe to run on every instance. */
export async function runMaintenance(ctx: AppContext) {
  const days = ctx.config.SOURCE_HASH_RETENTION_DAYS;
  // Privacy: anonymous source identifiers are only kept for the abuse-prevention window.
  await ctx.db.execute(sql`update messages set source_hash = null, device_hash = null where created_at < now() - make_interval(days => ${days}) and (source_hash is not null or device_hash is not null)`);
  await ctx.db.execute(sql`update moderation_events set source_hash = null where created_at < now() - make_interval(days => ${days}) and source_hash is not null`);
  await ctx.db.execute(sql`update reports set source_hash = null where created_at < now() - make_interval(days => ${days * 3}) and source_hash is not null`);
  await ctx.db.execute(sql`delete from message_evidence where keep_until < now()`);
  await ctx.db.execute(sql`delete from banned_sources where until is not null and until < now()`);
  await ctx.db.execute(sql`delete from sessions where expires_at < now() - interval '7 days' or revoked_at < now() - interval '7 days'`);
  await ctx.db.execute(sql`delete from email_tokens where expires_at < now() - interval '7 days'`);
  await ctx.db.execute(sql`update links set paused = false, paused_until = null where paused and paused_until is not null and paused_until < now()`);
  await ctx.db.execute(sql`delete from notifications where created_at < now() - interval '90 days'`);
  await ctx.db.execute(sql`delete from email_outbox where created_at < now() - interval '3 days'`);
}

export function startMaintenance(ctx: AppContext, log: FastifyBaseLogger): () => void {
  const tick = () => runMaintenance(ctx).catch((e) => log.error({ err: e }, "maintenance failed"));
  const first = setTimeout(tick, 15_000);
  const timer = setInterval(tick, 60 * 60_000);
  first.unref(); timer.unref();
  return () => { clearTimeout(first); clearInterval(timer); };
}
