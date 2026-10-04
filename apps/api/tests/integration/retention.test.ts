import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runMaintenance } from "../../src/services/maintenance";
import { api, createTestApp, inbox, json, makeAdmin, send, verifiedUser, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await createTestApp({ SOURCE_HASH_RETENTION_DAYS: "30" }); });
afterAll(() => t.close());
beforeEach(() => t.reset());
const q = async (sql: string, p: unknown[] = []) => (await t.ctx.pool.query(sql, p)).rows;

describe("runMaintenance (privacy retention & housekeeping)", () => {
  it("nulls source/device hashes on messages, events and reports only after their retention window; content is kept", async () => {
    const A = await verifiedUser(t, "alice");
    for (const [i, ip] of ["198.51.100.1", "198.51.100.2", "198.51.100.3"].entries()) await send(t, "alice", `retention test message ${i}`, ip);
    const ids = (await inbox(t, A.cookie)).items.map((m) => m.id) as string[];
    await api(t, "POST", `/messages/${ids[0]}/report`, { cookie: A.cookie, body: { reason: "spam" } });
    await api(t, "POST", `/messages/${ids[1]}/report`, { cookie: A.cookie, body: { reason: "spam" } });
    // ids[0]: 31 days old, ids[1]: 5 days old, ids[2]: fresh
    await q("update messages set created_at = now() - interval '31 days' where id=$1", [ids[0]]);
    await q("update messages set created_at = now() - interval '5 days' where id=$1", [ids[1]]);
    await q("update moderation_events set created_at = now() - interval '31 days' where message_id=$1", [ids[0]]);
    // reports keep hashes 3x longer (90 days)
    await q("update reports set created_at = now() - interval '60 days' where message_id=$1", [ids[0]]);
    await q("update reports set created_at = now() - interval '100 days' where message_id=$1", [ids[1]]);
    await runMaintenance(t.ctx);
    const m = Object.fromEntries((await q("select id, source_hash, device_hash, body from messages")).map((r) => [r.id, r]));
    expect(m[ids[0]!].source_hash).toBeNull(); expect(m[ids[0]!].device_hash).toBeNull();
    expect(m[ids[1]!].source_hash).not.toBeNull();
    expect(m[ids[2]!].source_hash).not.toBeNull();
    expect(m[ids[0]!].body).toContain("retention test");
    const ev = await q("select message_id, source_hash from moderation_events where kind='message'");
    expect(ev.find((e) => e.message_id === ids[0])!.source_hash).toBeNull();
    expect(ev.find((e) => e.message_id === ids[2])!.source_hash).not.toBeNull();
    const rep = Object.fromEntries((await q("select message_id, source_hash from reports")).map((r) => [r.message_id, r.source_hash]));
    expect(rep[ids[0]!]).not.toBeNull();  // 60 days < 90
    expect(rep[ids[1]!]).toBeNull();      // 100 days > 90
    // a message whose source expired can no longer be blocked
    expect((await api(t, "POST", `/messages/${ids[0]}/block`, { cookie: A.cookie })).statusCode).toBe(409);
    expect((await api(t, "POST", `/messages/${ids[2]}/block`, { cookie: A.cookie })).statusCode).toBe(201);
    // existing blocks are owner-chosen settings and survive
    expect((await q("select count(*)::int n from blocks"))[0].n).toBe(1);
  });

  it("honours SOURCE_HASH_RETENTION_DAYS", async () => {
    const short = await createTestApp({ SOURCE_HASH_RETENTION_DAYS: "2" });
    try {
      const A = await verifiedUser(short, "alice");
      await send(short, "alice", "short retention message");
      await short.ctx.pool.query("update messages set created_at = now() - interval '3 days'");
      await runMaintenance(short.ctx);
      expect((await short.ctx.pool.query("select source_hash from messages")).rows[0].source_hash).toBeNull();
      expect(A.id).toBeTruthy();
    } finally { await short.close(); }
  });

  it("deletes expired sessions/tokens/bans, expires paused_until, prunes old notifications and outbox", async () => {
    const A = await verifiedUser(t, "alice");
    const uid = A.id;
    // sessions
    await q("insert into sessions(user_id, token_hash, expires_at) values ($1,'old-expired', now() - interval '8 days'), ($1,'recent-expired', now() - interval '2 days'), ($1,'live', now() + interval '1 day')", [uid]);
    await q("insert into sessions(user_id, token_hash, expires_at, revoked_at) values ($1,'old-revoked', now() + interval '1 day', now() - interval '8 days'), ($1,'recent-revoked', now() + interval '1 day', now() - interval '1 day')", [uid]);
    // email tokens
    await q("insert into email_tokens(user_id, kind, token_hash, expires_at) values ($1,'reset','t-old', now() - interval '8 days'), ($1,'reset','t-recent', now() - interval '1 day'), ($1,'reset','t-live', now() + interval '1 hour')", [uid]);
    // bans
    await q("insert into banned_sources(source_hash, until) values ('b-expired', now() - interval '1 minute'), ('b-active', now() + interval '1 day'), ('b-permanent', null)");
    // paused links
    const [pl] = await q("select id from links where user_id=$1", [uid]);
    await q("update links set paused = true, paused_until = now() - interval '1 minute' where id=$1", [pl.id]);
    const extra = json(await api(t, "POST", "/links", { cookie: A.cookie, body: { label: "stay paused" } }));
    await q("update links set paused = true, paused_until = now() + interval '1 hour' where id=$1", [extra.id]);
    const perm = json(await api(t, "POST", "/links", { cookie: A.cookie, body: { label: "paused forever" } }));
    await q("update links set paused = true, paused_until = null where id=$1", [perm.id]);
    // notifications / outbox
    await q("insert into notifications(user_id,type,title,body,created_at) values ($1,'safety','old','x', now() - interval '91 days'), ($1,'safety','new','x', now() - interval '1 day')", [uid]);
    await q("insert into email_outbox(to_email,subject,body_text,created_at) values ('o@x.com','old','x', now() - interval '4 days'), ('o@x.com','new','x', now())");

    await runMaintenance(t.ctx);

    const s = (await q("select token_hash from sessions where token_hash in ('old-expired','recent-expired','live','old-revoked','recent-revoked')")).map((r) => r.token_hash).sort();
    expect(s).toEqual(["live", "recent-expired", "recent-revoked"]);
    expect((await q("select token_hash from email_tokens where token_hash like 't-%'")).map((r) => r.token_hash).sort()).toEqual(["t-live", "t-recent"]);
    expect((await q("select source_hash from banned_sources")).map((r) => r.source_hash).sort()).toEqual(["b-active", "b-permanent"]);
    const lk = Object.fromEntries((await q("select id, paused, paused_until from links where user_id=$1", [uid])).map((r) => [r.id, r]));
    expect(lk[pl.id]).toMatchObject({ paused: false, paused_until: null });
    expect(lk[extra.id].paused).toBe(true);
    expect(lk[perm.id].paused).toBe(true);
    expect((await q("select title from notifications where user_id=$1", [uid])).map((r) => r.title)).toEqual(["new"]);
    expect((await q("select subject from email_outbox where to_email='o@x.com'")).map((r) => r.subject)).toEqual(["new"]);
    // sender can reach the expired-pause link again; the live session still works
    expect((await send(t, "alice", "pause was auto-lifted")).statusCode).toBe(201);
    expect((await api(t, "GET", "/auth/me", { cookie: A.cookie })).statusCode).toBe(200);
  });

  it("is idempotent, safe on an empty database, and leaves audit logs and fresh data alone", async () => {
    await runMaintenance(t.ctx);
    const adm = await makeAdmin(t);
    const u = await verifiedUser(t, "alice");
    await api(t, "POST", `/admin/users/${u.id}/suspend`, { cookie: adm.cookie, body: {} });
    await q("update audit_logs set created_at = now() - interval '400 days'");
    await runMaintenance(t.ctx); await runMaintenance(t.ctx);
    expect((await q("select count(*)::int n from audit_logs"))[0].n).toBe(1);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(200);
  });
});
