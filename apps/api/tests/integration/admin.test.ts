import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, createTestApp, H, inbox, json, makeAdmin, register, send, verifiedUser, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await createTestApp(); });
afterAll(() => t.close());
beforeEach(() => t.reset());

const audit = async (action: string) => (await t.ctx.pool.query("select * from audit_logs where action=$1", [action])).rows;
const ADMIN_GETS = ["/admin/overview", "/admin/users", "/admin/reports", "/admin/moderation-events", "/admin/audit-logs", "/admin/abuse", "/admin/health"];

describe("role guards", () => {
  it("unauthenticated -> 401, normal user -> 403, on every admin route", async () => {
    const u = await verifiedUser(t, "alice");
    const target = u.id;
    for (const p of ADMIN_GETS) {
      expect((await api(t, "GET", p)).statusCode, p).toBe(401);
      expect((await api(t, "GET", p, { cookie: u.cookie })).statusCode, p).toBe(403);
    }
    for (const p of [`/admin/users/${target}/suspend`, `/admin/users/${target}/unsuspend`, `/admin/users/${target}/ban`, `/admin/users/${target}/unban`, `/admin/reports/${target}/resolve`]) {
      expect((await api(t, "POST", p, { body: { action: "dismiss" } })).statusCode, p).toBe(401);
      expect((await api(t, "POST", p, { cookie: u.cookie, body: { action: "dismiss" } })).statusCode, p).toBe(403);
    }
    expect((await api(t, "GET", `/admin/users/${target}`, { cookie: u.cookie })).statusCode).toBe(403);
    expect((await api(t, "GET", `/admin/users/${target}`)).statusCode).toBe(401);
  });

  it("a user cannot grant themselves a role through any profile/settings endpoint", async () => {
    const u = await verifiedUser(t, "alice");
    await api(t, "PATCH", "/profile", { cookie: u.cookie, body: { displayName: "x", role: "admin" } });
    await api(t, "PATCH", "/settings", { cookie: u.cookie, body: { role: "admin" } });
    expect((await t.ctx.pool.query("select role from users where id=$1", [u.id])).rows[0].role).toBe("user");
    expect((await api(t, "GET", "/admin/overview", { cookie: u.cookie })).statusCode).toBe(403);
  });

  it("staff with unverified email are refused", async () => {
    const a = await makeAdmin(t);
    await t.ctx.pool.query("update users set email_verified_at = null where id=$1", [a.id]);
    const r = await api(t, "GET", "/admin/overview", { cookie: a.cookie });
    expect(r.statusCode).toBe(403);
    expect(json(r).error.code).toBe("email_not_verified");
  });

  it("moderator may read and suspend but cannot ban/unban, nor act on admins or self", async () => {
    const mod = await makeAdmin(t, "moderator");
    const admin = await makeAdmin(t, "admin");
    const u = await verifiedUser(t, "alice");
    for (const p of ADMIN_GETS) expect((await api(t, "GET", p, { cookie: mod.cookie })).statusCode, p).toBe(200);
    expect((await api(t, "POST", `/admin/users/${u.id}/ban`, { cookie: mod.cookie, body: {} })).statusCode).toBe(403);
    expect((await api(t, "POST", `/admin/users/${u.id}/unban`, { cookie: mod.cookie, body: {} })).statusCode).toBe(403);
    expect((await api(t, "POST", `/admin/users/${admin.id}/suspend`, { cookie: mod.cookie, body: {} })).statusCode).toBe(403);
    expect((await api(t, "POST", `/admin/users/${mod.id}/suspend`, { cookie: mod.cookie, body: {} })).statusCode).toBe(403);
    expect((await api(t, "POST", `/admin/users/${u.id}/suspend`, { cookie: mod.cookie, body: { note: "spam" } })).statusCode).toBe(200);
    // moderator can't unsuspend a banned user either
    await t.ctx.pool.query("update users set status='banned' where id=$1", [u.id]);
    expect((await api(t, "POST", `/admin/users/${u.id}/unsuspend`, { cookie: mod.cookie, body: {} })).statusCode).toBe(403);
    expect((await t.ctx.pool.query("select status from users where id=$1", [u.id])).rows[0].status).toBe("banned");
  });

  it("admin cannot change own status; can act on other admins", async () => {
    const a1 = await makeAdmin(t); const a2 = await makeAdmin(t);
    expect((await api(t, "POST", `/admin/users/${a1.id}/ban`, { cookie: a1.cookie, body: {} })).statusCode).toBe(403);
    expect((await api(t, "POST", `/admin/users/${a2.id}/suspend`, { cookie: a1.cookie, body: {} })).statusCode).toBe(200);
  });

  it("CSRF header is still required for admin mutations", async () => {
    const a = await makeAdmin(t); const u = await verifiedUser(t, "alice");
    const r = await t.app.inject({ method: "POST", url: `/api/v1/admin/users/${u.id}/ban`, headers: { cookie: a.cookie, "content-type": "application/json" }, payload: "{}" });
    expect(r.statusCode).toBe(403);
    const r2 = await t.app.inject({ method: "POST", url: `/api/v1/admin/users/${u.id}/ban`, headers: { ...H, cookie: a.cookie, origin: "https://evil.example" }, payload: "{}" });
    expect(r2.statusCode).toBe(403);
  });
});

describe("overview", () => {
  it("reports accurate counts", async () => {
    const a = await makeAdmin(t);
    const u1 = await verifiedUser(t, "alice"); const u2 = await verifiedUser(t, "bobby");
    for (let i = 0; i < 3; i++) await send(t, "alice", `an ordinary question ${i}`, `198.51.100.${10 + i}`);
    await send(t, "alice", "you are so ugly", "198.51.100.20");   // filtered
    await send(t, "bobby", "I will kill you", "198.51.100.21");     // rejected
    const m = (await inbox(t, u1.cookie)).items[0];
    await api(t, "POST", `/messages/${m.id}/report`, { cookie: u1.cookie, body: { reason: "spam" } });
    await api(t, "POST", `/messages/${m.id}/block`, { cookie: u1.cookie });
    await t.ctx.pool.query("update users set status='suspended' where id=$1", [u2.id]);
    const o = json(await api(t, "GET", "/admin/overview", { cookie: a.cookie }));
    expect(o.users).toMatchObject({ total: 3, suspended: 1, banned: 0, newToday: 3 });
    expect(o.messages).toMatchObject({ total: 4, today: 4, filtered: 1, rejectedToday: 1 });
    expect(o.reports).toEqual({ open: 1, total: 1 });
    expect(o.rates.blockRate).toBeCloseTo(1 / 4);
    expect(o.rates.reportRate).toBeCloseTo(1 / 4);
    expect(o.rates.moderationRate).toBeCloseTo((1 + 1) / 5);
    expect(o.daily).toHaveLength(14);
    expect(o.daily.at(-1)).toMatchObject({ messages: 4, reports: 1, signups: 3 });
  });
});

describe("users", () => {
  it("lists with search by username/email/uuid, status filter and cursor pagination; no password hashes in output", async () => {
    const a = await makeAdmin(t);
    for (const n of ["alpha1", "alpha2", "alpha3", "beta1"]) await verifiedUser(t, n);
    const all = json(await api(t, "GET", "/admin/users", { cookie: a.cookie, query: { limit: "2" } }));
    expect(all.items).toHaveLength(2);
    expect(all.nextCursor).toBeTruthy();
    const p2 = json(await api(t, "GET", "/admin/users", { cookie: a.cookie, query: { limit: "2", cursor: all.nextCursor } }));
    expect(p2.items.length).toBeGreaterThan(0);
    expect(new Set([...all.items, ...p2.items].map((x: any) => x.id)).size).toBe(all.items.length + p2.items.length);
    const q = json(await api(t, "GET", "/admin/users", { cookie: a.cookie, query: { q: "alpha" } }));
    expect(q.items.map((x: any) => x.username).sort()).toEqual(["alpha1", "alpha2", "alpha3"]);
    expect(json(await api(t, "GET", "/admin/users", { cookie: a.cookie, query: { q: "beta1@EXAMPLE" } })).items).toHaveLength(1);
    const one = json(await api(t, "GET", "/admin/users", { cookie: a.cookie, query: { q: all.items[0].id } }));
    expect(one.items.map((x: any) => x.id)).toContain(all.items[0].id);
    expect(json(await api(t, "GET", "/admin/users", { cookie: a.cookie, query: { status: "banned" } })).items).toHaveLength(0);
    expect((await api(t, "GET", "/admin/users", { cookie: a.cookie, query: { status: "root" } })).statusCode).toBe(400);
    expect(JSON.stringify(all) + JSON.stringify(p2)).not.toMatch(/scrypt|password/i);
  });

  it("SQL-injection looking and LIKE-wildcard search input is treated literally", async () => {
    const a = await makeAdmin(t);
    await verifiedUser(t, "alice"); await verifiedUser(t, "bobby");
    const search = async (q: string) => api(t, "GET", "/admin/users", { cookie: a.cookie, query: { q } });
    for (const q of ["' OR '1'='1", "'; DROP TABLE users; --", "\" OR 1=1 --", "alice' UNION SELECT * FROM sessions --", "\\", "%'", "${1+1}", "a\u0000b"]) {
      const r = await search(q);
      expect(r.statusCode, q).toBeLessThan(500);
      if (r.statusCode === 200) expect(json(r).items, q).toHaveLength(0);
    }
    expect((await t.ctx.pool.query("select count(*)::int n from users")).rows[0].n).toBe(3);
    // wildcards must not match everything
    for (const q of ["%", "_", "%%", "a%", "_lice", "al_ce"]) {
      const r = json(await search(q));
      expect(r.items.map((x: any) => x.username), q).toEqual([]);
    }
    expect(json(await search("lic")).items).toHaveLength(1);
    expect((await search("x".repeat(81))).statusCode).toBe(400);
  });

  it("GET /admin/users/:id: 404 for unknown and malformed ids, never 500", async () => {
    const a = await makeAdmin(t);
    for (const id of ["00000000-0000-4000-8000-000000000000", "nope", "1' OR '1'='1", "%00", "../x"]) {
      const r = await api(t, "GET", `/admin/users/${encodeURIComponent(id)}`, { cookie: a.cookie });
      expect(r.statusCode, id).toBe(404);
    }
  });

  it("suspend / unsuspend: effect on sending, notification, audit log", async () => {
    const a = await makeAdmin(t); const u = await verifiedUser(t, "alice");
    const s = await api(t, "POST", `/admin/users/${u.id}/suspend`, { cookie: a.cookie, body: { note: "investigating" } });
    expect(json(s).status).toBe("suspended");
    expect((await send(t, "alice", "message to suspended")).statusCode).toBe(423);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(200); // suspended users keep their session
    expect(json(await api(t, "GET", "/profiles/alice")).acceptingMessages).toBe(false);
    expect(json(await api(t, "POST", `/admin/users/${u.id}/unsuspend`, { cookie: a.cookie, body: {} })).status).toBe("active");
    expect((await send(t, "alice", "message after restore")).statusCode).toBe(201);
    const logs = [...(await audit("user.suspend")), ...(await audit("user.unsuspend"))];
    expect(logs).toHaveLength(2);
    expect(logs[0].actor_id).toBe(a.id);
    expect((await audit("user.suspend"))[0].meta).toMatchObject({ note: "investigating", from: "active", to: "suspended" });
    const n = json(await api(t, "GET", "/notifications", { cookie: u.cookie }));
    expect(n.items.filter((i: any) => i.type === "safety").length).toBe(2);
  });

  it("ban revokes all sessions and blocks login + public profile; unban (admin) restores login", async () => {
    const a = await makeAdmin(t); const u = await verifiedUser(t, "alice");
    const second = json(await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } }));
    expect(second.user.id).toBe(u.id);
    expect(json(await api(t, "POST", `/admin/users/${u.id}/ban`, { cookie: a.cookie, body: { note: "abuse" } })).status).toBe("banned");
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
    expect((await t.ctx.pool.query("select count(*)::int n from sessions where user_id=$1 and revoked_at is null", [u.id])).rows[0].n).toBe(0);
    const login = await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } });
    expect(login.statusCode).toBe(403);
    expect(json(login).error.code).toBe("account_suspended");
    expect((await api(t, "GET", "/profiles/alice")).statusCode).toBe(404);
    expect((await send(t, "alice", "to a banned user")).statusCode).toBe(404);
    expect((await audit("user.ban"))).toHaveLength(1);
    expect(json(await api(t, "POST", `/admin/users/${u.id}/unban`, { cookie: a.cookie, body: {} })).status).toBe("active");
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } })).statusCode).toBe(200);
    expect((await audit("user.unban"))).toHaveLength(1);
  });

  it("note over 300 chars rejected; unknown user -> 404", async () => {
    const a = await makeAdmin(t); const u = await verifiedUser(t, "alice");
    expect((await api(t, "POST", `/admin/users/${u.id}/suspend`, { cookie: a.cookie, body: { note: "x".repeat(301) } })).statusCode).toBe(400);
    expect((await api(t, "POST", `/admin/users/00000000-0000-4000-8000-000000000000/ban`, { cookie: a.cookie, body: {} })).statusCode).toBe(404);
    expect((await api(t, "POST", `/admin/users/not-a-uuid/ban`, { cookie: a.cookie, body: {} })).statusCode).toBe(404);
    expect(await audit("user.suspend")).toHaveLength(0);
  });
});

describe("reports queue", () => {
  async function reported(ip = "198.51.100.30", body = "you are so ugly") {
    const a = await makeAdmin(t);
    const u = await verifiedUser(t, "alice");
    await send(t, "alice", body, ip);
    const m = (await inbox(t, u.cookie, "filtered")).items[0] ?? (await inbox(t, u.cookie)).items[0];
    await api(t, "POST", `/messages/${m.id}/report`, { cookie: u.cookie, body: { reason: "harassment" } });
    const list = json(await api(t, "GET", "/admin/reports", { cookie: a.cookie }));
    return { a, u, m, report: list.items[0], ip };
  }

  it("lists open reports with message snapshot, recipient and same-source count; status filter", async () => {
    const { a, report, u } = await reported();
    expect(report).toMatchObject({ status: "open", reason: "harassment", message: { body: "you are so ugly" }, recipient: { username: "alice" }, sameSourceReports: 1 });
    expect(report.reporterId).toBe(u.id);
    expect(JSON.stringify(report)).not.toMatch(/source_?hash|"sourceHash"/i);
    expect(json(await api(t, "GET", "/admin/reports", { cookie: a.cookie, query: { status: "resolved" } })).items).toHaveLength(0);
    expect((await api(t, "GET", "/admin/reports", { cookie: a.cookie, query: { status: "x" } })).statusCode).toBe(400);
  });

  it("dismiss: closes the report and writes an audit log; cannot resolve twice (409)", async () => {
    const { a, report } = await reported();
    const r = await api(t, "POST", `/admin/reports/${report.id}/resolve`, { cookie: a.cookie, body: { action: "dismiss", note: "fine" } });
    expect(r.statusCode).toBe(200);
    expect(json(r)).toMatchObject({ status: "dismissed", resolution: "dismiss" });
    expect((await audit("report.dismiss"))).toHaveLength(1);
    expect((await api(t, "POST", `/admin/reports/${report.id}/resolve`, { cookie: a.cookie, body: { action: "dismiss" } })).statusCode).toBe(409);
    expect(json(await api(t, "GET", "/admin/reports", { cookie: a.cookie, query: { status: "dismissed" } })).items).toHaveLength(1);
  });

  it("remove_message deletes the message but keeps the report snapshot", async () => {
    const { a, report, m, u } = await reported();
    const r = await api(t, "POST", `/admin/reports/${report.id}/resolve`, { cookie: a.cookie, body: { action: "remove_message" } });
    expect(json(r)).toMatchObject({ status: "resolved", resolution: "remove_message" });
    expect((await api(t, "GET", `/messages/${m.id}`, { cookie: u.cookie })).statusCode).toBe(404);
    const again = json(await api(t, "GET", "/admin/reports", { cookie: a.cookie, query: { status: "resolved" } }));
    expect(again.items[0].message.body).toBe("you are so ugly");
    expect((await audit("report.remove_message"))).toHaveLength(1);
  });

  it("suspend_user bans the anonymous source for 7 days; ban_user is permanent and admin-only; sender is silently dropped", async () => {
    const one = await reported("198.51.100.31");
    const mod = await makeAdmin(t, "moderator");
    // moderator: can suspend source, cannot ban
    expect((await api(t, "POST", `/admin/reports/${one.report.id}/resolve`, { cookie: mod.cookie, body: { action: "ban_user" } })).statusCode).toBe(403);
    expect((await api(t, "POST", `/admin/reports/${one.report.id}/resolve`, { cookie: mod.cookie, body: { action: "suspend_user" } })).statusCode).toBe(200);
    let b = (await t.ctx.pool.query("select * from banned_sources")).rows;
    expect(b).toHaveLength(1);
    const days = (new Date(b[0].until).getTime() - Date.now()) / 86400_000;
    expect(days).toBeGreaterThan(6.9); expect(days).toBeLessThanOrEqual(7);
    const before = (await inbox(t, one.u.cookie, "filtered")).items.length;
    expect((await send(t, "alice", "I am a suspended source", one.ip)).statusCode).toBe(201);
    expect((await inbox(t, one.u.cookie, "filtered")).items.length + (await inbox(t, one.u.cookie)).items.length).toBe(before);
    expect((await audit("report.suspend_user"))[0].actor_id).toBe(mod.id);

    // second report from another source, admin bans permanently
    await send(t, "alice", "you are so ugly lol", "198.51.100.32");
    const m2 = (await inbox(t, one.u.cookie, "filtered")).items.find((x) => x.body.includes("lol"))!;
    await api(t, "POST", `/messages/${m2.id}/report`, { cookie: one.u.cookie, body: { reason: "other" } });
    const open = json(await api(t, "GET", "/admin/reports", { cookie: one.a.cookie })).items;
    expect((await api(t, "POST", `/admin/reports/${open[0].id}/resolve`, { cookie: one.a.cookie, body: { action: "ban_user", note: "x" } })).statusCode).toBe(200);
    b = (await t.ctx.pool.query("select * from banned_sources order by created_at")).rows;
    expect(b).toHaveLength(2);
    expect(b[1].until).toBeNull();
    expect(b[1].created_by).toBe(one.a.id);
    expect((await audit("report.ban_user"))).toHaveLength(1);
  });

  it("source already expired from the report -> resolved as source_expired, no ban row", async () => {
    const { a, report } = await reported();
    await t.ctx.pool.query("update reports set source_hash=null; update messages set source_hash=null");
    const r = await api(t, "POST", `/admin/reports/${report.id}/resolve`, { cookie: a.cookie, body: { action: "ban_user" } });
    expect(json(r).resolution).toBe("ban_user:source_expired");
    expect((await t.ctx.pool.query("select count(*)::int n from banned_sources")).rows[0].n).toBe(0);
  });

  it("invalid action / unknown report / malformed id", async () => {
    const { a, report } = await reported();
    expect((await api(t, "POST", `/admin/reports/${report.id}/resolve`, { cookie: a.cookie, body: { action: "nuke" } })).statusCode).toBe(400);
    expect((await api(t, "POST", `/admin/reports/00000000-0000-4000-8000-000000000000/resolve`, { cookie: a.cookie, body: { action: "dismiss" } })).statusCode).toBe(404);
    expect((await api(t, "POST", `/admin/reports/zzz/resolve`, { cookie: a.cookie, body: { action: "dismiss" } })).statusCode).toBe(404);
  });
});

describe("audit logs, moderation events, abuse, health", () => {
  it("every admin mutation is audited with actor and target; audit endpoint paginates; tampered cursor -> 400", async () => {
    const a = await makeAdmin(t);
    const users = [await verifiedUser(t, "alice"), await verifiedUser(t, "bobby")];
    await send(t, "alice", "you are so ugly");
    const m = (await inbox(t, users[0]!.cookie, "filtered")).items[0];
    await api(t, "POST", `/messages/${m.id}/report`, { cookie: users[0]!.cookie, body: { reason: "spam" } });
    const rep = json(await api(t, "GET", "/admin/reports", { cookie: a.cookie })).items[0];
    await api(t, "POST", `/admin/users/${users[1]!.id}/suspend`, { cookie: a.cookie, body: {} });
    await api(t, "POST", `/admin/users/${users[1]!.id}/unsuspend`, { cookie: a.cookie, body: {} });
    await api(t, "POST", `/admin/users/${users[1]!.id}/ban`, { cookie: a.cookie, body: {} });
    await api(t, "POST", `/admin/users/${users[1]!.id}/unban`, { cookie: a.cookie, body: {} });
    await api(t, "POST", `/admin/reports/${rep.id}/resolve`, { cookie: a.cookie, body: { action: "dismiss" } });
    // failed attempts (self ban) must not be audited as success
    await api(t, "POST", `/admin/users/${a.id}/ban`, { cookie: a.cookie, body: {} });
    const logs = json(await api(t, "GET", "/admin/audit-logs", { cookie: a.cookie }));
    expect(logs.items.map((l: any) => l.action).sort()).toEqual(["report.dismiss", "user.ban", "user.suspend", "user.unban", "user.unsuspend"]);
    expect(logs.items.every((l: any) => l.actorId === a.id)).toBe(true);
    expect(logs.items.find((l: any) => l.action === "user.ban").targetId).toBe(users[1]!.id);
    const bad = await api(t, "GET", "/admin/audit-logs", { cookie: a.cookie, query: { cursor: "garbage" } });
    expect(bad.statusCode).toBe(400);
    // GET requests do not write audit logs
    const n0 = (await t.ctx.pool.query("select count(*)::int n from audit_logs")).rows[0].n;
    await api(t, "GET", "/admin/overview", { cookie: a.cookie });
    expect((await t.ctx.pool.query("select count(*)::int n from audit_logs")).rows[0].n).toBe(n0);
  });

  it("moderation events record rejects, holds, duplicates, blocks, reports and admin actions; DTO has no source hash", async () => {
    const a = await makeAdmin(t); const u = await verifiedUser(t, "alice");
    await send(t, "alice", "I will kill you", "198.51.100.40");
    await send(t, "alice", "you are so ugly", "198.51.100.41");
    await send(t, "alice", "a lovely question", "198.51.100.42");
    const ev = json(await api(t, "GET", "/admin/moderation-events", { cookie: a.cookie }));
    expect(ev.items.map((e: any) => e.outcome).sort()).toEqual(["allow", "hold", "reject"]);
    expect(ev.items.find((e: any) => e.outcome === "reject").categories).toContain("threat");
    expect(JSON.stringify(ev)).not.toMatch(/sourceHash|source_hash|[0-9a-f]{64}/);
    await api(t, "POST", `/admin/users/${u.id}/suspend`, { cookie: a.cookie, body: {} });
    const ev2 = json(await api(t, "GET", "/admin/moderation-events", { cookie: a.cookie }));
    expect(ev2.items[0]).toMatchObject({ kind: "admin_action", outcome: "suspend" });
  });

  it("abuse view groups by truncated source reference (never the full hash) and counts challenges", async () => {
    const a = await makeAdmin(t); await verifiedUser(t, "alice");
    for (let i = 0; i < 3; i++) await send(t, "alice", "I will kill you", "198.51.100.50");
    await t.ctx.pool.query("insert into moderation_events(kind,outcome) values ('message','challenge')");
    const ab = json(await api(t, "GET", "/admin/abuse", { cookie: a.cookie }));
    expect(ab.floodingLast24h).toBe(1);
    expect(ab.topSources[0]).toMatchObject({ messages: 0, rejected: 3 });
    expect(ab.topSources[0].sourceRef).toMatch(/^[0-9a-f]{8}$/);
    expect(ab.rejectedByCategory.find((c: any) => c.category === "threat").count).toBe(3);
    expect(JSON.stringify(ab)).not.toMatch(/[0-9a-f]{64}/);
  });

  it("health reports db status, counters and version without secrets", async () => {
    const a = await makeAdmin(t);
    const h = json(await api(t, "GET", "/admin/health", { cookie: a.cookie }));
    expect(h).toMatchObject({ status: "ok", db: { ok: true }, version: expect.any(String) });
    expect(h.counters.requests).toBeGreaterThan(0);
    expect(JSON.stringify(h)).not.toMatch(/postgres:|APP_SECRET|test-secret/);
    expect((await t.app.inject({ method: "GET", url: "/health" })).json()).toMatchObject({ status: "ok" });
    expect((await t.app.inject({ method: "GET", url: "/ready" })).statusCode).toBe(200);
  });
});
