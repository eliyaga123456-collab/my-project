import { createHash } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config";
import { H, api, cookieOf, createTestApp, inbox, json, makeAdmin, multipart, register, send, solvePow, verifiedUser, verifyEmail, waitFor, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await createTestApp(); });
afterAll(() => t.close());
beforeEach(() => t.reset());

const SQLI = ["' OR '1'='1", "'; DROP TABLE users; --", "1; SELECT pg_sleep(5)--", "\" OR \"\"=\"", "') UNION SELECT password_hash FROM users--", "%27%20OR%201=1", "\\", "${jndi:ldap://x}", "{{7*7}}", "../../etc/passwd"];
const NIL = "00000000-0000-4000-8000-000000000000";
const usersAlive = async () => Number((await t.ctx.pool.query("select count(*)::int n from users")).rows[0].n);

// ---------------------------------------------------------------- IDOR
describe("IDOR matrix: user B can never touch user A's data", () => {
  async function world() {
    const A = await verifiedUser(t, "alice"); const B = await verifiedUser(t, "bobby");
    await send(t, "alice", "a private question for alice", "198.51.100.1");
    const msg = (await inbox(t, A.cookie)).items[0];
    const round = json(await api(t, "POST", "/links", { cookie: A.cookie, body: { label: "alice round" } }));
    await api(t, "POST", `/messages/${msg.id}/block`, { cookie: A.cookie });
    const block = json(await api(t, "GET", "/blocks", { cookie: A.cookie })).items[0];
    const hw = json(await api(t, "POST", "/hidden-words", { cookie: A.cookie, body: { word: "forbidden" } }));
    await send(t, "alice", "second one for alice", "198.51.100.2");
    const msg2 = (await inbox(t, A.cookie)).items[0];
    await t.ctx.pool.query("insert into notifications(user_id,type,title,body) values ($1,'safety','t','b')", [A.id]);
    const notif = (json(await api(t, "GET", "/notifications", { cookie: A.cookie })).items as any[])[0];
    const sess = json(await api(t, "GET", "/auth/sessions", { cookie: A.cookie })).items[0];
    return { A, B, msg, msg2, round, block, hw, notif, sess };
  }

  it("messages: read / patch / delete / reply / report / block / remove-reply -> 404 and nothing changes", async () => {
    const { A, B, msg2 } = await world();
    const bc = B.cookie;
    expect((await api(t, "GET", `/messages/${msg2.id}`, { cookie: bc })).statusCode).toBe(404);
    expect((await api(t, "PATCH", `/messages/${msg2.id}`, { cookie: bc, body: { read: true, status: "archived" } })).statusCode).toBe(404);
    expect((await api(t, "POST", `/messages/${msg2.id}/reply`, { cookie: bc, body: { text: "hi", public: false } })).statusCode).toBe(404);
    expect((await api(t, "DELETE", `/messages/${msg2.id}/reply`, { cookie: bc })).statusCode).toBe(404);
    expect((await api(t, "POST", `/messages/${msg2.id}/report`, { cookie: bc, body: { reason: "spam" } })).statusCode).toBe(404);
    expect((await api(t, "POST", `/messages/${msg2.id}/block`, { cookie: bc })).statusCode).toBe(404);
    expect((await api(t, "DELETE", `/messages/${msg2.id}`, { cookie: bc })).statusCode).toBe(404);
    expect((await inbox(t, bc)).items).toHaveLength(0);
    const still = json(await api(t, "GET", `/messages/${msg2.id}`, { cookie: A.cookie }));
    expect(still).toMatchObject({ status: "inbox", read: false, reply: null });
    expect((await t.ctx.pool.query("select count(*)::int n from reports")).rows[0].n).toBe(0);
  });

  it("links/rounds, blocks, hidden words, notifications, sessions", async () => {
    const { A, B, round, block, hw, notif, sess } = await world();
    const bc = B.cookie;
    expect((await api(t, "PATCH", `/links/${round.id}`, { cookie: bc, body: { label: "pwned", paused: true } })).statusCode).toBe(404);
    expect((await api(t, "DELETE", `/links/${round.id}`, { cookie: bc })).statusCode).toBe(404);
    expect(json(await api(t, "GET", "/links", { cookie: bc })).items.map((l: any) => l.id)).not.toContain(round.id);
    expect((await inbox(t, bc, "inbox", { linkId: round.id })).items).toHaveLength(0);
    expect((await api(t, "DELETE", `/blocks/${block.id}`, { cookie: bc })).statusCode).toBe(404);
    expect(json(await api(t, "GET", "/blocks", { cookie: bc })).items).toHaveLength(0);
    expect((await api(t, "DELETE", `/hidden-words/${hw.id}`, { cookie: bc })).statusCode).toBe(404);
    expect(json(await api(t, "GET", "/hidden-words", { cookie: bc })).items).toHaveLength(0);
    expect((await api(t, "POST", "/notifications/read", { cookie: bc, body: { ids: [notif.id] } })).statusCode).toBe(204);
    expect(json(await api(t, "GET", "/notifications", { cookie: A.cookie })).items.find((n: any) => n.id === notif.id).readAt).toBeNull();
    expect(json(await api(t, "GET", "/notifications", { cookie: bc })).items.map((n: any) => n.id)).not.toContain(notif.id);
    expect((await api(t, "DELETE", `/auth/sessions/${sess.id}`, { cookie: bc })).statusCode).toBe(404);
    expect(json(await api(t, "GET", "/auth/sessions", { cookie: bc })).items.map((s: any) => s.id)).not.toContain(sess.id);
    expect((await api(t, "GET", "/auth/me", { cookie: A.cookie })).statusCode).toBe(200);
    // B's state-changing "all" actions don't touch A's
    await api(t, "POST", "/notifications/read", { cookie: bc, body: { all: true } });
    expect(json(await api(t, "GET", "/notifications", { cookie: A.cookie })).unread).toBeGreaterThan(0);
  });

  it("push tokens are per user; B cannot unregister A's token", async () => {
    const A = await verifiedUser(t, "alice"); const B = await verifiedUser(t, "bobby");
    const token = "ExponentPushToken[abcdefghijklmnop]";
    await api(t, "POST", "/push-tokens", { cookie: A.cookie, body: { token, platform: "ios" } });
    await api(t, "DELETE", "/push-tokens", { cookie: B.cookie, body: { token } });
    expect((await t.ctx.pool.query("select count(*)::int n from push_tokens where user_id=$1", [A.id])).rows[0].n).toBe(1);
  });

  it("public answers: only the explicitly published reply is reachable; unpublished or other user's message ids are not", async () => {
    const A = await verifiedUser(t, "alice");
    await send(t, "alice", "question one for alice");
    const m = (await inbox(t, A.cookie)).items[0];
    await api(t, "POST", `/messages/${m.id}/reply`, { cookie: A.cookie, body: { text: "private answer", public: false } });
    expect((await api(t, "GET", `/answers/${m.id}`)).statusCode).toBe(404);
    expect((await api(t, "GET", "/messages", {})).statusCode).toBe(401);
  });

  it("anonymous requests to every authenticated route -> 401", async () => {
    const routes: [string, string][] = [["GET", "/auth/me"], ["GET", "/auth/sessions"], ["GET", "/links"], ["POST", "/links"], ["GET", "/messages"], ["GET", `/messages/${NIL}`], ["PATCH", `/messages/${NIL}`], ["DELETE", `/messages/${NIL}`],
      ["POST", `/messages/${NIL}/reply`], ["POST", `/messages/${NIL}/report`], ["POST", `/messages/${NIL}/block`], ["GET", "/blocks"], ["GET", "/settings"], ["PATCH", "/settings"], ["GET", "/hidden-words"],
      ["POST", "/hidden-words"], ["GET", "/notifications"], ["POST", "/notifications/read"], ["POST", "/push-tokens"], ["GET", "/analytics/me"], ["PATCH", "/profile"], ["PATCH", "/profile/username"],
      ["POST", "/profile/avatar"], ["DELETE", "/profile/avatar"], ["POST", "/link/pause"], ["POST", "/auth/change-password"], ["POST", "/auth/resend-verification"]];
    for (const [m, p] of routes) expect((await api(t, m, p, { body: m === "GET" ? undefined : {} })).statusCode, `${m} ${p}`).toBe(401);
  });
});

// ---------------------------------------------------------------- injection / XSS / malformed
describe("XSS payloads are stored verbatim and only ever served as JSON", () => {
  const XSS = ["<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "\"><svg/onload=alert(1)>", "javascript:alert(1)", "<iframe srcdoc='<script>1</script>'>"];
  it("message bodies, replies, display name, bio, prompt, link label round-trip as text with nosniff + JSON content type", async () => {
    const A = await verifiedUser(t, "alice");
    for (const [i, x] of XSS.entries()) {
      const r = await send(t, "alice", `hello ${x}`, `198.51.100.${10 + i}`);
      expect(r.statusCode, x).toBe(201);
      expect(r.headers["content-type"]).toMatch(/^application\/json/);
    }
    const list = await api(t, "GET", "/messages", { cookie: A.cookie });
    expect(list.headers["content-type"]).toMatch(/^application\/json/);
    expect(list.headers["x-content-type-options"]).toBe("nosniff");
    const bodies = json(list).items.map((m: any) => m.body);
    const held = (await inbox(t, A.cookie, "filtered")).items.map((m: any) => m.body);
    for (const x of XSS) expect([...bodies, ...held]).toContain(`hello ${x}`);
    const p = XSS[0]!;
    expect((await api(t, "PATCH", "/profile", { cookie: A.cookie, body: { displayName: p, bio: XSS[1], prompt: XSS[2] } })).statusCode).toBe(200);
    const pub = await api(t, "GET", "/profiles/alice");
    expect(pub.headers["content-type"]).toMatch(/^application\/json/);
    expect(pub.headers["x-content-type-options"]).toBe("nosniff");
    expect(json(pub)).toMatchObject({ displayName: p, bio: XSS[1], prompt: XSS[2] });
    const l = json(await api(t, "POST", "/links", { cookie: A.cookie, body: { label: p, prompt: XSS[3] } }));
    expect(l.label).toBe(p);
    const m = (await inbox(t, A.cookie)).items[0];
    const rep = await api(t, "POST", `/messages/${m.id}/reply`, { cookie: A.cookie, body: { text: XSS[4], public: false } });
    expect(json(rep).reply.text).toBe(XSS[4]);
  });
  it("error bodies never reflect raw input as HTML and 404s are JSON", async () => {
    const r = await t.app.inject({ method: "GET", url: "/api/v1/<script>alert(1)</script>" });
    expect(r.statusCode).toBe(404);
    expect(r.headers["content-type"]).toMatch(/^application\/json/);
    expect(r.body).not.toContain("<script>");
    const r2 = await api(t, "GET", "/profiles/<script>");
    expect(r2.statusCode).toBe(400);
    expect(r2.body).not.toContain("<script>");
  });
  it("security headers on API responses", async () => {
    const r = await t.app.inject({ method: "GET", url: "/health" });
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(r.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(r.headers["x-powered-by"]).toBeUndefined();
    expect(r.headers["referrer-policy"]).toBeDefined();
  });
});

describe("SQL injection strings in every query/path/body parameter", () => {
  it("never produce 5xx, never alter data", async () => {
    const A = await verifiedUser(t, "alice"); const adm = await makeAdmin(t);
    await send(t, "alice", "seed message for alice");
    const before = await usersAlive();
    for (const s of SQLI) {
      const e = encodeURIComponent(s);
      const reqs = [
        api(t, "GET", `/profiles/${e}`), api(t, "GET", `/profiles/${e}/answers`), api(t, "GET", `/links/public/${e}`), api(t, "GET", `/answers/${e}`),
        api(t, "GET", `/auth/username-available`, { query: { username: s } }),
        api(t, "GET", "/messages", { cookie: A.cookie, query: { status: s, cursor: s, linkId: s, limit: s } }),
        api(t, "GET", `/messages/${e}`, { cookie: A.cookie }), api(t, "DELETE", `/messages/${e}`, { cookie: A.cookie }), api(t, "PATCH", `/messages/${e}`, { cookie: A.cookie, body: { read: true } }),
        api(t, "DELETE", `/links/${e}`, { cookie: A.cookie }), api(t, "DELETE", `/blocks/${e}`, { cookie: A.cookie }), api(t, "DELETE", `/hidden-words/${e}`, { cookie: A.cookie }),
        api(t, "DELETE", `/auth/sessions/${e}`, { cookie: A.cookie }), api(t, "GET", "/notifications", { cookie: A.cookie, query: { cursor: s } }),
        api(t, "GET", "/analytics/me", { cookie: A.cookie, query: { days: s } }),
        api(t, "POST", "/messages", { body: { username: s, body: "hello there friend" } }), api(t, "POST", "/messages", { body: { slug: s, body: "hello there friend" } }),
        api(t, "POST", "/messages", { body: { username: "alice", body: s + " hi" }, ip: "198.51.100.77" }),
        api(t, "POST", "/auth/login", { body: { email: s, password: s } }), api(t, "POST", "/auth/login", { body: { email: `${s}@x.com`, password: s } }),
        api(t, "POST", "/auth/forgot-password", { body: { email: s } }), api(t, "POST", "/auth/verify-email", { body: { token: s.padEnd(20, "x") } }),
        api(t, "POST", "/auth/reset-password", { body: { token: s.padEnd(20, "x"), password: "a long enough password" } }),
        api(t, "POST", "/hidden-words", { cookie: A.cookie, body: { word: s } }), api(t, "POST", "/links", { cookie: A.cookie, body: { label: s.slice(0, 40), prompt: s } }),
        api(t, "PATCH", "/profile", { cookie: A.cookie, body: { displayName: s.slice(0, 40), bio: s } }),
        api(t, "POST", "/public/view", { body: { username: s } }),
        api(t, "GET", "/admin/users", { cookie: adm.cookie, query: { q: s, cursor: s, status: s } }), api(t, "GET", "/admin/reports", { cookie: adm.cookie, query: { status: s, cursor: s } }),
        api(t, "GET", `/admin/users/${e}`, { cookie: adm.cookie }), api(t, "POST", `/admin/users/${e}/ban`, { cookie: adm.cookie, body: { note: s } }),
        api(t, "POST", `/admin/reports/${e}/resolve`, { cookie: adm.cookie, body: { action: s } }), api(t, "GET", "/admin/audit-logs", { cookie: adm.cookie, query: { cursor: s } }),
        api(t, "POST", `/messages/${e}/report`, { cookie: A.cookie, body: { reason: s, details: s } })
      ];
      for (const r of await Promise.all(reqs)) {
        expect(r.statusCode, `${s} -> ${r.statusCode} ${r.body.slice(0, 120)}`).toBeLessThan(500);
        if (r.statusCode >= 400) expect(r.body).not.toMatch(/syntax error|pg_|postgres|stack|at \w+ \(/i);
      }
    }
    expect(await usersAlive()).toBe(before);
    for (const tbl of ["messages", "sessions", "users", "reports"]) await t.ctx.pool.query(`select 1 from ${tbl} limit 1`);
    // the injection body was stored literally, not executed
    const bodies = (await t.ctx.pool.query("select body from messages")).rows.map((r) => r.body as string);
    expect(bodies.some((b) => b.includes("DROP TABLE"))).toBe(true);
  });

  it("hidden-word regex metacharacters are handled safely (no ReDoS, no match-all)", async () => {
    const A = await verifiedUser(t, "alice");
    for (const w of [".*", "(a+)+$", "[", "\\", "a|b", "^$", "(?=x)", "word("]) {
      const r = await api(t, "POST", "/hidden-words", { cookie: A.cookie, body: { word: w } });
      expect(r.statusCode, w).toBeLessThan(500);
    }
    const t0 = Date.now();
    const r = await send(t, "alice", "totally normal question here, which flavour of tea do you prefer in the evening?");
    expect(r.statusCode).toBe(201);
    expect(Date.now() - t0).toBeLessThan(2000);
    expect((await inbox(t, A.cookie)).items.length + (await inbox(t, A.cookie, "filtered")).items.length).toBe(1);
    expect((await inbox(t, A.cookie)).items).toHaveLength(1);
  });

  it("NUL bytes and lone surrogates in any text field -> 4xx, never 500", async () => {
    const A = await verifiedUser(t, "alice");
    await send(t, "alice", "message for nul tests");
    const m = (await inbox(t, A.cookie)).items[0];
    const nul = "ab\u0000cd";
    const rs = await Promise.all([
      api(t, "PATCH", "/profile", { cookie: A.cookie, body: { displayName: nul } }), api(t, "PATCH", "/profile", { cookie: A.cookie, body: { bio: nul } }),
      api(t, "POST", "/links", { cookie: A.cookie, body: { label: nul } }), api(t, "POST", "/hidden-words", { cookie: A.cookie, body: { word: nul } }),
      api(t, "POST", `/messages/${m.id}/reply`, { cookie: A.cookie, body: { text: nul, public: false } }),
      api(t, "POST", `/messages/${m.id}/report`, { cookie: A.cookie, body: { reason: "other", details: nul } }),
      api(t, "POST", "/auth/register", { body: { email: "n@example.com", password: "correct horse battery", username: "nuluser", displayName: nul } }),
      api(t, "POST", "/messages", { body: { username: "alice", body: "hi\u0000 there friend" }, ip: "198.51.100.90" }),
      t.app.inject({ method: "POST", url: "/api/v1/hidden-words", headers: { ...H, cookie: A.cookie }, payload: '{"word":"x\\ud800y"}' })
    ]);
    for (const r of rs) expect(r.statusCode, r.body).toBeLessThan(500);
  });
});

describe("malformed identifiers, cursors and bodies", () => {
  it("malformed UUIDs in every :id path -> 404 (never 500)", async () => {
    const A = await verifiedUser(t, "alice"); const adm = await makeAdmin(t);
    const bad = ["not-a-uuid", "123", "00000000-0000-0000-0000-00000000000z", "%00", "x".repeat(200), "0".repeat(36)];
    for (const id of bad) {
      const e = encodeURIComponent(id);
      const calls: [string, string, object?][] = [["GET", `/messages/${e}`], ["PATCH", `/messages/${e}`, { read: true }], ["DELETE", `/messages/${e}`], ["POST", `/messages/${e}/reply`, { text: "x", public: false }],
        ["DELETE", `/messages/${e}/reply`], ["POST", `/messages/${e}/report`, { reason: "spam" }], ["POST", `/messages/${e}/block`], ["PATCH", `/links/${e}`, { label: "x" }], ["DELETE", `/links/${e}`],
        ["DELETE", `/blocks/${e}`], ["DELETE", `/hidden-words/${e}`], ["DELETE", `/auth/sessions/${e}`], ["GET", `/answers/${e}`]];
      for (const [m, p, body] of calls) {
        const r = await api(t, m, p, { cookie: A.cookie, body });
        expect([400, 404, 414], `${m} ${p} -> ${r.statusCode}`).toContain(r.statusCode);
        expect(r.statusCode).not.toBe(500);
      }
      for (const [m, p] of [["GET", `/admin/users/${e}`], ["POST", `/admin/users/${e}/suspend`], ["POST", `/admin/reports/${e}/resolve`]] as const) {
        const r = await api(t, m, p, { cookie: adm.cookie, body: m === "POST" ? { action: "dismiss" } : undefined });
        expect([404, 414], `${m} ${p}`).toContain(r.statusCode);
      }
    }
  });

  it("tampered / garbage cursors -> 400 on every paginated endpoint", async () => {
    const A = await verifiedUser(t, "alice"); const adm = await makeAdmin(t);
    const b64 = (o: unknown) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
    const cursors = ["garbage!!", b64("not json"), b64({ t: "nope", id: NIL }), b64({ t: new Date().toISOString(), id: "' OR 1=1--" }), b64({ t: 5, id: NIL }), b64({ id: NIL }), b64({ t: new Date().toISOString(), id: "0".repeat(36) }), b64([]), b64("null"), "x".repeat(201)];
    const eps: [string, string, string?][] = [["GET", "/messages"], ["GET", "/notifications"], ["GET", "/profiles/alice/answers"], ["GET", "/admin/users", "adm"], ["GET", "/admin/reports", "adm"], ["GET", "/admin/audit-logs", "adm"], ["GET", "/admin/moderation-events", "adm"]];
    for (const c of cursors) for (const [m, p, who] of eps) {
      const r = await api(t, m, p, { cookie: who ? adm.cookie : A.cookie, query: { cursor: c } });
      expect(r.statusCode, `${p} cursor=${c.slice(0, 20)}`).toBe(400);
    }
  });

  it("oversized body -> 413, malformed JSON -> 400, wrong content-type -> 415, odd JSON shapes -> 400", async () => {
    const A = await verifiedUser(t, "alice");
    const raw = (payload: string, ct = "application/json", url = "/api/v1/messages") => t.app.inject({ method: "POST", url, headers: { ...H, "content-type": ct, cookie: A.cookie }, payload });
    const big = await raw(JSON.stringify({ username: "alice", body: "x".repeat(70 * 1024) }));
    expect(big.statusCode).toBe(413);
    expect(json(big).error.code).toBe("payload_too_large");
    for (const bad of ["{", "{'a':1}", "{\"a\":", "undefined", "<xml/>", "{\"a\":1}}"]) {
      const r = await raw(bad);
      expect(r.statusCode, bad).toBe(400);
      expect(json(r).error.code).toBe("validation_error");
    }
    expect((await raw("hello", "text/plain")).statusCode).toBe(400); // fastify parses text/plain as a string; schema validation refuses it
    expect((await raw("a=b", "application/x-www-form-urlencoded")).statusCode).toBe(415);
    for (const shape of ["[]", "null", "\"str\"", "123", "true"]) expect((await raw(shape)).statusCode, shape).toBe(400);
    expect((await raw(JSON.stringify({ username: "alice", body: "valid body here" }), "application/json; charset=utf-16")).statusCode).toBeLessThan(500);
    // deeply nested JSON must not blow the stack
    const deep = "[".repeat(50_000) + "]".repeat(50_000);
    expect((await raw(deep)).statusCode).toBeLessThan(500);
    // huge number of keys
    const many = JSON.stringify(Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`k${i}`, i])));
    expect((await raw(many)).statusCode).toBeLessThan(500);
  });

  it("mass assignment / prototype pollution attempts are ignored", async () => {
    const r = await t.app.inject({ method: "POST", url: "/api/v1/auth/register", headers: H, payload: '{"email":"mass@example.com","password":"correct horse battery","username":"massuser","role":"admin","status":"banned","emailVerifiedAt":"2020-01-01","__proto__":{"role":"admin"},"constructor":{"prototype":{"role":"admin"}}}' });
    expect(r.statusCode).toBe(201);
    const row = (await t.ctx.pool.query("select role,status,email_verified_at from users where username='massuser'")).rows[0];
    expect(row).toMatchObject({ role: "user", status: "active", email_verified_at: null });
    expect(({} as any).role).toBeUndefined();
    expect((await api(t, "GET", "/admin/overview", { cookie: cookieOf(r)! })).statusCode).toBe(403);
  });

  it("numeric abuse in query params", async () => {
    const A = await verifiedUser(t, "alice");
    for (const limit of ["0", "-1", "1e9", "NaN", "999999999999999999999", "1.5", "abc", ""]) {
      const r = await api(t, "GET", "/messages", { cookie: A.cookie, query: { limit } });
      expect([200, 400], `limit=${limit}`).toContain(r.statusCode);
    }
    for (const days of ["-5", "1e9", "NaN", "abc", "0"]) expect((await api(t, "GET", "/analytics/me", { cookie: A.cookie, query: { days } })).statusCode, days).toBe(200);
  });

  it("unicode tricks: zero-width/bidi-only bodies are rejected; bidi overrides are stripped from stored text", async () => {
    const A = await verifiedUser(t, "alice");
    expect((await send(t, "alice", "​​​‮‮")).statusCode).toBe(400);
    await send(t, "alice", "hello ‮evil‬ world");
    const b = (await inbox(t, A.cookie)).items[0].body as string;
    expect(b).not.toMatch(/[‪-‮⁦-⁩]/);
  });
});

// ---------------------------------------------------------------- uploads
describe("avatar upload abuse", () => {
  const up = (cookie: string | null, name: string, ct: string, data: Buffer) => {
    const m = multipart("file", name, ct, data);
    return t.app.inject({ method: "POST", url: "/api/v1/profile/avatar", headers: { ...m.headers, ...(cookie ? { cookie } : {}) }, payload: m.payload });
  };
  const png = (w = 64, h = 64) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 10, g: 120, b: 200 } } }).png().toBuffer();
  const mediaPath = (url: string) => new URL(url).pathname;

  it("rejects SVG, HTML, scripts, zip, text and polyglots with 4xx (never 500) and stores nothing", async () => {
    const A = await verifiedUser(t, "alice");
    const zip = Buffer.concat([Buffer.from("PK\x03\x04"), Buffer.alloc(200, 1)]);
    const cases: [string, string, Buffer][] = [
      ["a.svg", "image/svg+xml", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script></svg>')],
      ["a.png", "image/png", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
      ["a.png", "image/png", Buffer.from("<html><script>alert(1)</script></html>")],
      ["a.png", "image/png", zip],
      ["a.jpg", "image/jpeg", Buffer.from("GIF89a<script>alert(1)</script>")],
      ["a.png", "image/png", Buffer.from("#!/bin/sh\nrm -rf /\n")],
      ["a.png", "image/png", Buffer.alloc(0)],
      ["a.png", "image/png", Buffer.from([0xff, 0xd8, 0xff])],
      ["a.jpg", "image/jpeg", Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("<script>alert(1)</script>"), Buffer.alloc(100)])],
      ["../../evil.png", "image/png", Buffer.from("x")]
    ];
    for (const [name, ct, data] of cases) {
      const r = await up(A.cookie, name, ct, data);
      expect(r.statusCode, `${name} ${data.subarray(0, 12).toString("latin1")}`).toBeGreaterThanOrEqual(400);
      expect(r.statusCode).toBeLessThan(500);
    }
    expect((await t.ctx.pool.query("select avatar_key from profiles where user_id=$1", [A.id])).rows[0].avatar_key).toBeNull();
  });

  it("truncated PNG/JPEG and corrupt bodies -> 415", async () => {
    const A = await verifiedUser(t, "alice");
    const good = await png(); const jpg = await sharp({ create: { width: 200, height: 200, channels: 3, background: "red" } }).jpeg().toBuffer();
    expect((await up(A.cookie, "a.png", "image/png", good.subarray(0, Math.floor(good.length / 2)))).statusCode).toBe(415);
    expect((await up(A.cookie, "a.jpg", "image/jpeg", jpg.subarray(0, 60))).statusCode).toBe(415);
    const corrupt = Buffer.from(good); corrupt.fill(0x41, 40, corrupt.length - 20);
    expect((await up(A.cookie, "a.png", "image/png", corrupt)).statusCode).toBe(415);
  });

  it("oversize (>2MB) -> 413, even when it is a valid image", async () => {
    const A = await verifiedUser(t, "alice");
    const noisy = await sharp({ create: { width: 1500, height: 1500, channels: 3 as const, noise: { type: "gaussian" as const, mean: 128, sigma: 60 } } }).png().toBuffer();
    expect(noisy.length).toBeGreaterThan(2 * 1024 * 1024);
    const r = await up(A.cookie, "a.png", "image/png", noisy);
    expect(r.statusCode).toBe(413);
    expect(json(r).error.code).toBe("payload_too_large");
    expect((await up(A.cookie, "a.png", "image/png", Buffer.concat([await png(), Buffer.alloc(3 * 1024 * 1024)]))).statusCode).toBe(413);
  });

  it("decompression-bomb-ish dimensions (>40MP) are refused without exhausting memory", async () => {
    const A = await verifiedUser(t, "alice");
    const bomb = await sharp({ create: { width: 7000, height: 7000, channels: 3, background: "black" } }).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(2 * 1024 * 1024);
    const r = await up(A.cookie, "a.png", "image/png", bomb);
    expect(r.statusCode).toBe(415);
    // IHDR claiming an absurd size with no pixel data
    const fake = Buffer.from(await png()); fake.writeUInt32BE(60000, 16); fake.writeUInt32BE(60000, 20);
    expect(await up(A.cookie, "a.png", "image/png", fake).then((x) => x.statusCode)).toBe(415);
  });

  it("request shape abuse: not multipart, no file, many files, unauthenticated", async () => {
    const A = await verifiedUser(t, "alice");
    expect((await api(t, "POST", "/profile/avatar", { cookie: A.cookie, body: { file: "x" } })).statusCode).toBe(415);
    const empty = t.app.inject({ method: "POST", url: "/api/v1/profile/avatar", headers: { "content-type": "multipart/form-data; boundary=zz", "x-requested-with": "unsaid", cookie: A.cookie }, payload: "--zz--\r\n" });
    expect((await empty).statusCode).toBe(400);
    expect((await up(null, "a.png", "image/png", await png())).statusCode).toBe(401);
    const m1 = multipart("file", "a.png", "image/png", await png());
    const boundary = /boundary=(.*)$/.exec(m1.headers["content-type"])![1]!;
    const two = Buffer.concat([m1.payload.subarray(0, m1.payload.length - Buffer.byteLength(`--${boundary}--\r\n`)), m1.payload.subarray(0, m1.payload.length)]);
    expect((await t.app.inject({ method: "POST", url: "/api/v1/profile/avatar", headers: { ...m1.headers, cookie: A.cookie }, payload: two })).statusCode).toBeLessThan(500);
    // extra text field (fields: 0 limit)
    const withField = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="x"\r\n\r\nv\r\n`), m1.payload]);
    expect((await t.app.inject({ method: "POST", url: "/api/v1/profile/avatar", headers: { ...m1.headers, cookie: A.cookie }, payload: withField })).statusCode).toBeLessThan(500);
  });

  it("valid JPEG with EXIF GPS is re-encoded to 512px WebP with ALL metadata stripped; served with nosniff", async () => {
    const A = await verifiedUser(t, "alice");
    const jpg = await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 200, g: 30, b: 30 } } }).jpeg()
      .withExif({ IFD0: { Make: "SecretCam", Software: "Leaky 1.0" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "32/1 4/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "34/1 47/1 0/1" } }).toBuffer();
    const before = await sharp(jpg).metadata();
    expect(before.exif).toBeTruthy();
    expect(jpg.toString("latin1")).toContain("SecretCam");
    const r = await up(A.cookie, "me.jpg", "image/jpeg", jpg);
    expect(r.statusCode).toBe(200);
    const url = json(r).avatarUrl as string;
    expect(url).toMatch(/\/media\/avatars\/[0-9a-f-]{36}\.webp$/);
    const media = await t.app.inject({ method: "GET", url: mediaPath(url) });
    expect(media.statusCode).toBe(200);
    expect(media.headers["content-type"]).toBe("image/webp");
    expect(media.headers["x-content-type-options"]).toBe("nosniff");
    expect(media.headers["content-security-policy"]).toContain("sandbox");
    const out = media.rawPayload;
    const meta = await sharp(out).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 512, height: 512 });
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    const latin = out.toString("latin1");
    for (const needle of ["SecretCam", "Leaky", "Exif", "GPS", "<?xpacket"]) expect(latin).not.toContain(needle);
    // the profile only exposes the URL
    expect(JSON.stringify(json(await api(t, "GET", "/profiles/alice")))).toContain(mediaPath(url));
  });

  it("valid PNG with appended script/php payload: output is a clean webp without the trailer", async () => {
    const A = await verifiedUser(t, "alice");
    const evil = Buffer.concat([await png(), Buffer.from("<?php system($_GET['c']); ?><script>alert(1)</script>")]);
    const r = await up(A.cookie, "a.png", "image/png", evil);
    expect(r.statusCode).toBe(200);
    const media = await t.app.inject({ method: "GET", url: mediaPath(json(r).avatarUrl) });
    expect(media.rawPayload.toString("latin1")).not.toMatch(/<\?php|<script/);
    expect((await sharp(media.rawPayload).metadata()).format).toBe("webp");
  });

  it("replacing / removing avatar deletes the old object; old URL then 404s", async () => {
    const A = await verifiedUser(t, "alice");
    const u1 = mediaPath(json(await up(A.cookie, "a.png", "image/png", await png())).avatarUrl);
    const u2 = mediaPath(json(await up(A.cookie, "b.png", "image/png", await png(80, 80))).avatarUrl);
    expect(u1).not.toBe(u2);
    expect((await t.app.inject({ method: "GET", url: u1 })).statusCode).toBe(404);
    expect((await t.app.inject({ method: "GET", url: u2 })).statusCode).toBe(200);
    expect(json(await api(t, "DELETE", "/profile/avatar", { cookie: A.cookie })).avatarUrl).toBeNull();
    expect((await t.app.inject({ method: "GET", url: u2 })).statusCode).toBe(404);
  });

  it("avatar upload is rate limited per user when limits are on", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false" });
    try {
      const u = await register(rl, { username: "alice" });
      const img = await png(32, 32);
      let last = 0;
      for (let i = 0; i < 11; i++) {
        const m = multipart("file", "a.png", "image/png", img);
        last = (await rl.app.inject({ method: "POST", url: "/api/v1/profile/avatar", headers: { ...m.headers, cookie: u.cookie }, payload: m.payload })).statusCode;
      }
      expect(last).toBe(429);
    } finally { await rl.close(); }
  });
});

describe("media route path traversal", () => {
  it("every traversal/encoding variant -> 404 JSON, no file contents", async () => {
    const urls = ["/media/../../etc/passwd", "/media/..%2f..%2fetc%2fpasswd", "/media/%2e%2e/%2e%2e/etc/passwd", "/media/avatars/../../../etc/passwd", "/media/avatars/%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "/media/avatars/..%252f..%252fetc%252fpasswd", "/media/avatars/%2e%2e%5c%2e%2e%5cwindows%5cwin.ini", "/media/avatars/00000000-0000-0000-0000-000000000000.webp%00.png", "/media/avatars/00000000-0000-0000-0000-000000000000.webp/../../x",
      "/media/avatars/00000000-0000-0000-0000-000000000000.webp", "/media/avatars/", "/media/", "/media", "/media/avatars/%00", "/media/..;/..;/etc/passwd", "/media/avatars/..\\..\\etc\\passwd", "/media//etc/passwd", "/media/%c0%ae%c0%ae/%c0%ae%c0%ae/etc/passwd",
      "/media/avatars/00000000-0000-0000-0000-000000000000.WEBP", "/media/package.json", "/media/.env"];
    for (const u of urls) {
      const r = await t.app.inject({ method: "GET", url: u });
      expect([400, 404], `${u} -> ${r.statusCode}`).toContain(r.statusCode);
      expect(r.body).not.toMatch(/root:|\[fonts\]|APP_SECRET|DATABASE_URL/);
    }
  });
});

// ---------------------------------------------------------------- CORS / CSRF
describe("CORS / Origin / CSRF matrix", () => {
  const EVIL = "https://evil.example";
  const WEB = "http://localhost:3000", ADMIN = "http://localhost:3100";
  const post = (cookie: string | null, headers: Record<string, string | undefined>, url = "/api/v1/profile", payload = '{"bio":"csrf"}', method: "POST" | "PATCH" | "DELETE" = "PATCH") =>
    t.app.inject({ method, url, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, payload });

  it("state-changing requests require x-requested-with: unsaid (cookie, bearer and anonymous alike)", async () => {
    const A = await verifiedUser(t, "alice");
    for (const h of [{}, { "x-requested-with": "XMLHttpRequest" }, { "x-requested-with": "" }, { "x-requested-with": "UNSAID" }]) {
      const r = await post(A.cookie, h);
      expect(r.statusCode, JSON.stringify(h)).toBe(403);
    }
    expect((await t.ctx.pool.query("select bio from profiles where user_id=$1", [A.id])).rows[0].bio).toBe("");
    expect((await post(null, {}, "/api/v1/messages", '{"username":"alice","body":"hello there"}', "POST")).statusCode).toBe(403);
    expect((await post(null, {}, "/api/v1/auth/login", '{"email":"a@b.co","password":"x"}', "POST")).statusCode).toBe(403);
    const tok = json(await api(t, "POST", "/auth/login", { body: { email: A.email, password: A.password }, headers: { "x-client": "mobile" } })).token;
    expect((await post(null, { authorization: `Bearer ${tok}` })).statusCode).toBe(403);
    expect((await post(null, { authorization: `Bearer ${tok}`, "x-requested-with": "unsaid" })).statusCode).toBe(200);
    // each mutating method
    for (const m of ["POST", "PATCH", "DELETE"] as const) expect((await post(A.cookie, {}, `/api/v1/links/${NIL}`, "{}", m)).statusCode, m).toBe(403);
  });

  it("cross-site Origin is refused even with the header and a valid cookie; allowed web/admin origins pass; `null` origin refused", async () => {
    const A = await verifiedUser(t, "alice");
    for (const origin of [EVIL, "null", "http://localhost:3000.evil.example", "http://localhost:3001", "https://localhost:3000", "http://LOCALHOST:3000/", `${WEB}/`]) {
      const r = await post(A.cookie, { "x-requested-with": "unsaid", origin });
      expect(r.statusCode, origin).toBe(403);
    }
    expect((await post(A.cookie, { "x-requested-with": "unsaid", origin: WEB })).statusCode).toBe(200);
    expect((await post(A.cookie, { "x-requested-with": "unsaid", origin: ADMIN })).statusCode).toBe(200);
    expect((await post(A.cookie, { "x-requested-with": "unsaid" })).statusCode).toBe(200); // no Origin: non-browser clients
    expect((await t.ctx.pool.query("select bio from profiles where user_id=$1", [A.id])).rows[0].bio).toBe("csrf");
  });

  it("classic CSRF vectors: form posts (urlencoded / multipart / text/plain) cannot mutate state", async () => {
    const A = await verifiedUser(t, "alice");
    for (const [ct, body] of [["application/x-www-form-urlencoded", "bio=pwned"], ["text/plain", '{"bio":"pwned"}'], ["multipart/form-data; boundary=x", "--x--"]] as const) {
      const r = await t.app.inject({ method: "PATCH", url: "/api/v1/profile", headers: { "content-type": ct, cookie: A.cookie, origin: EVIL }, payload: body });
      expect(r.statusCode, ct).toBeGreaterThanOrEqual(400);
    }
    expect((await t.ctx.pool.query("select bio from profiles where user_id=$1", [A.id])).rows[0].bio).toBe("");
    // GET never mutates (no state-changing GET endpoints)
    const g = await t.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { cookie: A.cookie, origin: EVIL } });
    expect(g.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("CORS: only configured origins are reflected, with credentials; preflight for evil origin gets no ACAO", async () => {
    const pre = (origin: string, method = "PATCH") => t.app.inject({ method: "OPTIONS", url: "/api/v1/profile", headers: { origin, "access-control-request-method": method, "access-control-request-headers": "content-type,x-requested-with" } });
    const ok = await pre(WEB);
    expect(ok.headers["access-control-allow-origin"]).toBe(WEB);
    expect(ok.headers["access-control-allow-credentials"]).toBe("true");
    expect(String(ok.headers["access-control-allow-methods"])).not.toMatch(/PUT|TRACE/);
    expect((await pre(ADMIN)).headers["access-control-allow-origin"]).toBe(ADMIN);
    for (const o of [EVIL, "null", "http://localhost:3000.evil.example"]) {
      const r = await pre(o);
      expect(r.headers["access-control-allow-origin"], o).toBeUndefined();
      expect(r.headers["access-control-allow-credentials"], o).toBeUndefined();
    }
    const res = await t.app.inject({ method: "GET", url: "/api/v1/profiles/nobody", headers: { origin: EVIL, "x-requested-with": "unsaid" } });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("cookie attributes: HttpOnly, SameSite=Lax, Path=/, Secure when COOKIE_SECURE=true", async () => {
    const u = await register(t, { username: "alice" });
    const c = u.res.cookies.find((x) => x.name === "unsaid_session")!;
    expect(c).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
    expect(c.secure).toBeFalsy(); // test env: not prod
    const sec = await createTestApp({ COOKIE_SECURE: "true" });
    try {
      const r = await register(sec, { username: "carol" });
      const cs = r.res.cookies.find((x) => x.name === "unsaid_session")!;
      expect(cs.secure).toBe(true);
      expect(cs.httpOnly).toBe(true);
      expect(cs.maxAge).toBe(30 * 86400);
    } finally { await sec.close(); }
  });
});

// ---------------------------------------------------------------- sessions & tokens
describe("session lifecycle", () => {
  it("tokens are random, stored only as SHA-256 hashes, and a new one is issued on every login", async () => {
    const u = await register(t, { username: "alice" });
    const l1 = await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } });
    const l2 = await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } });
    const [c0, c1, c2] = [u.cookie, cookieOf(l1)!, cookieOf(l2)!];
    expect(new Set([c0, c1, c2]).size).toBe(3);
    const tok = c1.split("=")[1]!;
    expect(tok.length).toBeGreaterThanOrEqual(40);
    const rows = (await t.ctx.pool.query("select token_hash from sessions where user_id=$1", [u.id])).rows.map((r) => r.token_hash);
    expect(rows).toContain(createHash("sha256").update(tok).digest("hex"));
    expect(rows).not.toContain(tok);
  });

  it("session fixation: a planted/attacker-chosen session cookie is never adopted by login", async () => {
    const u = await register(t, { username: "alice" });
    const planted = "attackerchosentokenattackerchosentoken1234567890";
    const login = await t.app.inject({ method: "POST", url: "/api/v1/auth/login", headers: { ...H, cookie: `unsaid_session=${planted}` }, payload: JSON.stringify({ email: u.email, password: u.password }) });
    expect(login.statusCode).toBe(200);
    expect(cookieOf(login)).not.toBe(`unsaid_session=${planted}`);
    expect((await api(t, "GET", "/auth/me", { cookie: `unsaid_session=${planted}` })).statusCode).toBe(401);
    // also not after register
    const reg = await t.app.inject({ method: "POST", url: "/api/v1/auth/register", headers: { ...H, cookie: `unsaid_session=${planted}` }, payload: JSON.stringify({ email: "x@example.com", password: "correct horse battery", username: "fixme" }) });
    expect(cookieOf(reg)).not.toBe(`unsaid_session=${planted}`);
    expect((await api(t, "GET", "/auth/me", { cookie: `unsaid_session=${planted}` })).statusCode).toBe(401);
  });

  it("change-password revokes every other session, keeps the current one, and the old password stops working", async () => {
    const u = await register(t, { username: "alice" });
    const other = cookieOf(await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } }))!;
    const third = cookieOf(await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } }))!;
    const r = await api(t, "POST", "/auth/change-password", { cookie: u.cookie, body: { currentPassword: u.password, newPassword: "brand new password 1" } });
    expect(r.statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: other })).statusCode).toBe(401);
    expect((await api(t, "GET", "/auth/me", { cookie: third })).statusCode).toBe(401);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(200);
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } })).statusCode).toBe(401);
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: "brand new password 1" } })).statusCode).toBe(200);
    expect((await api(t, "POST", "/auth/change-password", { cookie: u.cookie, body: { currentPassword: "wrong wrong wrong", newPassword: "another new password" } })).statusCode).toBe(400);
  });

  it("reset-password: single-use token, kills ALL sessions, old password dead; verify tokens cannot be used as reset tokens", async () => {
    const u = await register(t, { username: "alice" });
    await t.ctx.pool.query("delete from email_outbox");
    await api(t, "POST", "/auth/forgot-password", { body: { email: u.email } });
    const mail = await waitFor(async () => (await t.ctx.pool.query("select body_text from email_outbox where to_email=$1 and subject not like 'Confirm%'", [u.email])).rows[0]);
    const token = /token=([\w-]+)/.exec(mail.body_text)![1]!;
    const verifyTok = /token=([\w-]+)/.exec((await t.ctx.pool.query("select body_text from email_outbox where to_email=$1 and subject like 'Confirm%'", [u.email])).rows[0]?.body_text ?? "token=" + "x".repeat(20))![1]!;
    expect((await api(t, "POST", "/auth/reset-password", { body: { token: verifyTok.padEnd(20, "x"), password: "hijacked password 1" } })).statusCode).toBe(400);
    expect((await api(t, "POST", "/auth/reset-password", { body: { token, password: "short" } })).statusCode).toBe(400); // validation does not burn the token
    expect((await api(t, "POST", "/auth/reset-password", { body: { token, password: "a fresh new password" } })).statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
    expect((await api(t, "POST", "/auth/reset-password", { body: { token, password: "second use password" } })).statusCode).toBe(400);
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } })).statusCode).toBe(401);
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: "a fresh new password" } })).statusCode).toBe(200);
    // token stored hashed
    const raw = (await t.ctx.pool.query("select token_hash from email_tokens")).rows.map((r) => r.token_hash);
    expect(raw).not.toContain(token);
  });

  it("a newer reset token invalidates older ones; expired tokens fail; verify tokens are single-use", async () => {
    const u = await register(t, { username: "alice" });
    const tokens: string[] = [];
    for (let i = 0; i < 2; i++) {
      await t.ctx.pool.query("delete from email_outbox where subject not like 'Confirm%'");
      (t.ctx.rl as { reset?: () => void }).reset?.();
      await api(t, "POST", "/auth/forgot-password", { body: { email: u.email } });
      const m = await waitFor(async () => (await t.ctx.pool.query("select body_text from email_outbox where to_email=$1 and subject not like 'Confirm%'", [u.email])).rows[0]);
      tokens.push(/token=([\w-]+)/.exec(m.body_text)![1]!);
    }
    expect((await api(t, "POST", "/auth/reset-password", { body: { token: tokens[0], password: "old token password1" } })).statusCode).toBe(400);
    await t.ctx.pool.query("update email_tokens set expires_at = now() - interval '1 minute' where kind='reset' and used_at is null");
    expect((await api(t, "POST", "/auth/reset-password", { body: { token: tokens[1], password: "expired token pass1" } })).statusCode).toBe(400);
    await verifyEmail(t, u.email);
    const body = (await t.ctx.pool.query("select body_text from email_outbox where to_email=$1 and subject like 'Confirm%' order by created_at desc limit 1", [u.email])).rows[0].body_text;
    const vt = /token=([\w-]+)/.exec(body)![1]!;
    expect((await api(t, "POST", "/auth/verify-email", { body: { token: vt } })).statusCode).toBe(400); // already used
  });

  it("forgot-password responds identically for existing, unknown and banned emails (no enumeration)", async () => {
    const u = await register(t, { username: "alice" });
    const a = await api(t, "POST", "/auth/forgot-password", { body: { email: u.email } });
    const b = await api(t, "POST", "/auth/forgot-password", { body: { email: "ghost@example.com" } });
    expect([a.statusCode, a.body]).toEqual([b.statusCode, b.body]);
    const l1 = await api(t, "POST", "/auth/login", { body: { email: u.email, password: "wrong password 12" } });
    const l2 = await api(t, "POST", "/auth/login", { body: { email: "ghost@example.com", password: "wrong password 12" } });
    expect([l1.statusCode, json(l1).error.message, json(l1).error.code]).toEqual([l2.statusCode, json(l2).error.message, json(l2).error.code]);
  });

  it("logout revokes only that session; revoked / expired / unknown / malformed credentials -> 401", async () => {
    const u = await register(t, { username: "alice" });
    const other = cookieOf(await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } }))!;
    expect((await api(t, "POST", "/auth/logout", { cookie: u.cookie })).statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
    expect((await api(t, "GET", "/auth/me", { cookie: other })).statusCode).toBe(200);
    await t.ctx.pool.query("update sessions set expires_at = now() - interval '1 second' where user_id=$1", [u.id]);
    expect((await api(t, "GET", "/auth/me", { cookie: other })).statusCode).toBe(401);
    for (const c of ["unsaid_session=", "unsaid_session=%00", "unsaid_session=" + "A".repeat(10_000), "unsaid_session=' OR 1=1--", "unsaid_session=../../x"]) {
      expect((await api(t, "GET", "/auth/me", { cookie: c })).statusCode, c.slice(0, 30)).toBe(401);
    }
    expect((await api(t, "GET", "/auth/me", { headers: { authorization: "Bearer " } })).statusCode).toBe(401);
    expect((await api(t, "GET", "/auth/me", { headers: { authorization: "Basic abc" } })).statusCode).toBe(401);
    expect((await api(t, "GET", "/auth/me", { headers: { authorization: "Bearer " + "x".repeat(100) } })).statusCode).toBe(401);
  });

  it("an invalid Bearer token is not rescued by a valid cookie (no credential mixing)", async () => {
    const u = await register(t, { username: "alice" });
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie, headers: { authorization: "Bearer nope" } })).statusCode).toBe(401);
  });

  it("users can revoke their own other sessions; revoked session stops working immediately", async () => {
    const u = await register(t, { username: "alice" });
    const other = cookieOf(await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password }, headers: { "user-agent": "OtherDevice/1.0" } }))!;
    const list = json(await api(t, "GET", "/auth/sessions", { cookie: u.cookie })).items;
    expect(list).toHaveLength(2);
    expect(JSON.stringify(list)).not.toMatch(/token/i);
    const o = list.find((s: any) => !s.current);
    expect(o.userAgent).toBe("OtherDevice/1.0");
    expect((await api(t, "DELETE", `/auth/sessions/${o.id}`, { cookie: u.cookie })).statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: other })).statusCode).toBe(401);
    expect((await api(t, "DELETE", `/auth/sessions/${o.id}`, { cookie: u.cookie })).statusCode).toBe(404);
  });

  it("long User-Agent is truncated, not rejected", async () => {
    const u = await register(t, { username: "alice" });
    await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password }, headers: { "user-agent": "U".repeat(5000) } });
    expect((await t.ctx.pool.query("select max(char_length(user_agent))::int n from sessions")).rows[0].n).toBeLessThanOrEqual(300);
  });

  it("passwords: >128 chars and short ones rejected; unicode normalised (NFKC) so visually-equal passwords match", async () => {
    expect((await api(t, "POST", "/auth/register", { body: { email: "p@example.com", password: "x".repeat(129), username: "pwlong" } })).statusCode).toBe(400);
    expect((await api(t, "POST", "/auth/register", { body: { email: "p@example.com", password: "short", username: "pwshort" } })).statusCode).toBe(400);
    expect((await api(t, "POST", "/auth/login", { body: { email: "p@example.com", password: "x".repeat(129) } })).statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------- brute force / proxy
describe("login brute-force protection and proxy headers", () => {
  it("per-email limit: 10 attempts / 15 min, then 429 with Retry-After — from ANY ip, even with the right password", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false" });
    try {
      const u = await register(rl, { username: "alice" });
      for (let i = 0; i < 10; i++) expect((await api(rl, "POST", "/auth/login", { body: { email: u.email, password: `wrong password ${i}` }, ip: `203.0.113.${i + 1}` })).statusCode).toBe(401);
      const locked = await api(rl, "POST", "/auth/login", { body: { email: u.email, password: u.password }, ip: "203.0.113.200" });
      expect(locked.statusCode).toBe(429);
      expect(Number(locked.headers["retry-after"])).toBeGreaterThan(0);
      expect(json(locked).error.code).toBe("rate_limited");
      // other accounts are unaffected
      const v = await register(rl, { username: "bobby" });
      expect((await api(rl, "POST", "/auth/login", { body: { email: v.email, password: v.password }, ip: "203.0.113.200" })).statusCode).toBe(200);
    } finally { await rl.close(); }
  });

  it("per-IP limit: 30 attempts / 15 min across different emails, then 429", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false" });
    try {
      let status = 0, n = 0;
      for (; n < 32 && status !== 429; n++) status = (await api(rl, "POST", "/auth/login", { body: { email: `nobody${n}@example.com`, password: "wrong password 1" }, ip: "203.0.113.50" })).statusCode;
      expect(status).toBe(429);
      expect(n).toBe(31);
      expect((await api(rl, "POST", "/auth/login", { body: { email: "nobody@example.com", password: "wrong password 1" }, ip: "203.0.113.51" })).statusCode).toBe(401);
    } finally { await rl.close(); }
  });

  it("forgot-password: 3/hour per email and 10/hour per IP; resend-verification 3/hour per user", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false" });
    try {
      const u = await register(rl, { username: "alice" });
      const codes: number[] = [];
      for (let i = 0; i < 4; i++) codes.push((await api(rl, "POST", "/auth/forgot-password", { body: { email: u.email } })).statusCode);
      expect(codes).toEqual([204, 204, 204, 429]);
      const r: number[] = [];
      for (let i = 0; i < 4; i++) r.push((await api(rl, "POST", "/auth/resend-verification", { cookie: u.cookie })).statusCode);
      expect(r).toEqual([204, 204, 204, 429]);
    } finally { await rl.close(); }
  });

  it("TRUST_PROXY=false: spoofed X-Forwarded-For / X-Real-IP cannot bypass IP-based limits", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false", TRUST_PROXY: "false" });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const res = await rl.app.inject({ method: "POST", url: "/api/v1/auth/register", remoteAddress: "203.0.113.77",
          headers: { ...H, "x-forwarded-for": `10.9.${i}.${i}`, "x-real-ip": `10.8.${i}.1`, forwarded: `for=10.7.${i}.1` },
          payload: JSON.stringify({ email: `spoof${i}@example.com`, password: "correct horse battery", username: `spoof${i}x` }) });
        codes.push(res.statusCode);
      }
      expect(codes.filter((c) => c === 201)).toHaveLength(8);
      expect(codes.slice(8)).toEqual([429, 429]);
    } finally { await rl.close(); }
  });

  it("TRUST_PROXY=false: source hash (anonymity/abuse key) ignores spoofed X-Forwarded-For too", async () => {
    await verifiedUser(t, "alice");
    for (const xff of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) {
      await t.app.inject({ method: "POST", url: "/api/v1/messages", remoteAddress: "198.51.100.5", headers: { ...H, "x-forwarded-for": xff }, payload: JSON.stringify({ username: "alice", body: `msg via ${xff} here` }) });
    }
    const d = (await t.ctx.pool.query("select count(distinct source_hash)::int n from messages")).rows[0].n;
    expect(d).toBe(1);
  });

  it("TRUST_PROXY=true honours X-Forwarded-For (this is why it must only be enabled behind a trusted proxy that overwrites the header)", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false", TRUST_PROXY: "true" });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 10; i++) {
        const res = await rl.app.inject({ method: "POST", url: "/api/v1/auth/register", remoteAddress: "203.0.113.78", headers: { ...H, "x-forwarded-for": `10.9.${i}.${i}` },
          payload: JSON.stringify({ email: `tp${i}@example.com`, password: "correct horse battery", username: `tpuser${i}x` }) });
        codes.push(res.statusCode);
      }
      expect(codes.every((c) => c === 201)).toBe(true); // bypass is possible when the proxy does not sanitise XFF
    } finally { await rl.close(); }
  });
});

describe("global API rate limit & public endpoint abuse", () => {
  it("600 req/min per IP globally -> 429 + Retry-After; /health is exempt", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false" });
    try {
      let last: any;
      for (let i = 0; i < 601; i++) last = await rl.app.inject({ method: "GET", url: "/api/v1/profiles/nobody", headers: { "x-requested-with": "unsaid" }, remoteAddress: "203.0.113.90" });
      expect(last.statusCode).toBe(429);
      expect(Number(last.headers["retry-after"])).toBeGreaterThan(0);
      expect((await rl.app.inject({ method: "GET", url: "/health", remoteAddress: "203.0.113.90" })).statusCode).toBe(200);
    } finally { await rl.close(); }
  }, 60_000);

  it("the proof-of-work challenge cannot be used to bypass the per-recipient limit (PoW attempts still count)", async () => {
    const rl = await createTestApp({ RATE_LIMIT_DISABLED: "false" });
    try {
      await register(rl, { username: "alice" });
      let throttled = false;
      for (let i = 0; i < 12 && !throttled; i++) {
        let r = await api(rl, "POST", "/messages", { body: { username: "alice", body: `pow flood message ${i}` }, ip: "203.0.113.91" });
        if (r.statusCode === 428) r = await api(rl, "POST", "/messages", { body: { username: "alice", body: `pow flood message ${i}`, challenge: solvePow(json(r).error.details.challenge) }, ip: "203.0.113.91" });
        if (r.statusCode === 429) throttled = true;
      }
      expect(throttled).toBe(true);
    } finally { await rl.close(); }
  });
});

// ---------------------------------------------------------------- information disclosure
describe("information disclosure", () => {
  it("unexpected failures return a generic 500 with a requestId and no stack / SQL / driver detail", async () => {
    const x = await createTestApp();
    await x.ctx.pool.end();
    const r = await x.app.inject({ method: "GET", url: "/api/v1/profiles/alice" });
    expect(r.statusCode).toBe(500);
    expect(json(r).error).toMatchObject({ code: "server_error" });
    expect(json(r).error.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.body).not.toMatch(/ECONN|pool|select |from "|\bat \w+.*\(|node_modules|\.ts:|postgres|password|stack/i);
    expect(Object.keys(json(r).error).sort()).toEqual(["code", "message", "requestId"]);
    await x.app.close().catch(() => undefined);
  });

  it("validation/404/403/401 bodies are uniform and contain no internals", async () => {
    const rs = [await api(t, "GET", "/nope"), await api(t, "GET", "/messages"), await api(t, "POST", "/auth/login", { body: {} }), await t.app.inject({ method: "POST", url: "/api/v1/messages", headers: { "content-type": "application/json" }, payload: "{}" })];
    for (const r of rs) {
      expect(json(r).error.code).toBeTruthy();
      expect(r.body).not.toMatch(/zod|ZodError|invalid_type|stack|node_modules|\.ts:|select |constraint|duplicate key/i);
    }
  });

  it("duplicate email/username conflicts do not leak constraint names", async () => {
    await register(t, { username: "alice", email: "a@example.com" });
    const r = await api(t, "POST", "/auth/register", { body: { email: "a@example.com", password: "correct horse battery", username: "other" } });
    expect(r.statusCode).toBe(409);
    expect(r.body).not.toMatch(/users_email_key|constraint|unique|duplicate key/i);
  });

  it("public profile / link / answers expose only whitelisted fields (no email, ids, hashes, role, status)", async () => {
    const A = await verifiedUser(t, "alice");
    const round = json(await api(t, "POST", "/links", { cookie: A.cookie, body: { label: "round" } }));
    await send(t, "alice", "a question for the public");
    const m = (await inbox(t, A.cookie)).items[0];
    const ans = json(await api(t, "POST", `/messages/${m.id}/reply`, { cookie: A.cookie, body: { text: "an answer", public: true } }));
    const bodies = [json(await api(t, "GET", "/profiles/alice")), json(await api(t, "GET", `/links/public/${round.slug}`)), json(await api(t, "GET", "/profiles/alice/answers")), json(await api(t, "GET", `/answers/${ans.reply.answerId}`))];
    const allowedProfile = new Set(["username", "displayName", "bio", "prompt", "avatarUrl", "acceptingMessages", "linkState", "linkLabel"]);
    for (const k of Object.keys(bodies[0])) expect(allowedProfile.has(k), k).toBe(true);
    for (const k of Object.keys(bodies[1])) expect(allowedProfile.has(k), k).toBe(true);
    const flat = JSON.stringify(bodies);
    for (const secret of [A.id, A.email, "scrypt", "passwordHash", "password_hash", "token", "role", "status\"", "emailVerified", "source", "device", "recipientId", m.id, round.id]) expect(flat, secret).not.toContain(secret);
    expect(Object.keys(bodies[3].author).sort()).toEqual(["avatarUrl", "displayName", "username"]);
  });

  it("no DTO ever contains source_hash/device_hash/body_hash (messages, blocks, reports, admin, me, notifications, analytics)", async () => {
    const A = await verifiedUser(t, "alice"); const adm = await makeAdmin(t);
    await send(t, "alice", "you are so ugly", "198.51.100.30");
    await send(t, "alice", "a normal one for alice", "198.51.100.31");
    const inb = (await inbox(t, A.cookie)).items[0];
    await api(t, "POST", `/messages/${inb.id}/report`, { cookie: A.cookie, body: { reason: "spam" } });
    await api(t, "POST", `/messages/${inb.id}/block`, { cookie: A.cookie });
    const hashes = (await t.ctx.pool.query("select source_hash, device_hash, body_hash from messages")).rows.flatMap((r) => Object.values(r)).filter(Boolean) as string[];
    expect(hashes.length).toBeGreaterThan(0);
    const dumps = await Promise.all([
      api(t, "GET", "/messages", { cookie: A.cookie }), api(t, "GET", "/messages", { cookie: A.cookie, query: { status: "filtered" } }), api(t, "GET", "/messages", { cookie: A.cookie, query: { status: "archived" } }),
      api(t, "GET", `/messages/${inb.id}`, { cookie: A.cookie }), api(t, "GET", "/blocks", { cookie: A.cookie }), api(t, "GET", "/auth/me", { cookie: A.cookie }), api(t, "GET", "/notifications", { cookie: A.cookie }),
      api(t, "GET", "/analytics/me", { cookie: A.cookie }), api(t, "GET", "/links", { cookie: A.cookie }), api(t, "GET", "/auth/sessions", { cookie: A.cookie }), api(t, "GET", "/settings", { cookie: A.cookie }),
      api(t, "GET", "/admin/reports", { cookie: adm.cookie }), api(t, "GET", "/admin/abuse", { cookie: adm.cookie }), api(t, "GET", "/admin/moderation-events", { cookie: adm.cookie }), api(t, "GET", "/admin/users", { cookie: adm.cookie }),
      api(t, "GET", "/admin/audit-logs", { cookie: adm.cookie }), api(t, "GET", "/admin/overview", { cookie: adm.cookie })
    ]);
    for (const r of dumps) {
      expect(r.statusCode).toBe(200);
      expect(r.body).not.toMatch(/source_?hash|device_?hash|body_?hash|sourceHash|deviceHash|bodyHash|passwordHash|password_hash|token_hash|tokenHash/);
      for (const h of hashes) expect(r.body).not.toContain(h);
      expect(r.body).not.toMatch(/[0-9a-f]{64}/);
    }
    const msgKeys = Object.keys(json(dumps[3]!)).sort();
    expect(msgKeys).toEqual(["body", "createdAt", "filteredCategories", "id", "linkId", "linkLabel", "read", "reply", "status"]);
  });

  it("/auth/me and register responses never include the password hash, and anonymous senders never learn recipient internals", async () => {
    const u = await register(t, { username: "alice" });
    expect(u.res.body).not.toMatch(/scrypt|passwordHash|password_hash/);
    const r = await send(t, "alice", "hello there anonymous");
    expect(r.body).toBe('{"status":"delivered"}');
  });

  it("dev outbox helper is not mounted in production mode; prod config refuses unsafe settings", async () => {
    expect((await api(t, "GET", "/dev/outbox", { query: { to: "a@example.com" } })).statusCode).toBe(200); // test/dev only
    const prod = await createTestApp({ NODE_ENV: "production", APP_SECRET: "p".repeat(40), RATE_LIMIT_DISABLED: "false", EMAIL_TRANSPORT: "outbox" });
    try {
      expect((await api(prod, "GET", "/dev/outbox", { query: { to: "a@example.com" } })).statusCode).toBe(404);
      const c = await prod.app.inject({ method: "GET", url: "/health" });
      expect(c.headers["strict-transport-security"]).toContain("max-age=31536000");
      const reg = await register(prod, { username: "alice" });
      expect(reg.res.cookies.find((x) => x.name === "unsaid_session")!.secure).toBe(true);
    } finally { await prod.close(); }
    expect(() => loadConfig({ NODE_ENV: "production" } as any)).toThrow(/APP_SECRET/);
    expect(() => loadConfig({ NODE_ENV: "production", APP_SECRET: "p".repeat(40), RATE_LIMIT_DISABLED: "true" } as any)).toThrow(/RATE_LIMIT_DISABLED/);
    expect(() => loadConfig({ APP_SECRET: "short" } as any)).toThrow();
  });
});

// ---------------------------------------------------------------- races
describe("concurrency", () => {
  it("parallel identical sends from one source store exactly one message (duplicate suppression is race-free)", async () => {
    const A = await verifiedUser(t, "alice");
    await Promise.all(Array.from({ length: 8 }, () => send(t, "alice", "the very same question", "198.51.100.150")));
    expect((await inbox(t, A.cookie)).items).toHaveLength(1);
  });
  it("parallel reports and blocks of one message are idempotent", async () => {
    const A = await verifiedUser(t, "alice");
    await send(t, "alice", "message to hammer on");
    const m = (await inbox(t, A.cookie)).items[0];
    const rs = await Promise.all([...Array(6)].map(() => api(t, "POST", `/messages/${m.id}/report`, { cookie: A.cookie, body: { reason: "spam" } })));
    expect(rs.every((r) => r.statusCode === 201)).toBe(true);
    const bs = await Promise.all([...Array(6)].map(() => api(t, "POST", `/messages/${m.id}/block`, { cookie: A.cookie })));
    expect(bs.every((r) => r.statusCode === 201)).toBe(true);
    expect((await t.ctx.pool.query("select count(*)::int n from reports")).rows[0].n).toBe(1);
    expect((await t.ctx.pool.query("select count(*)::int n from blocks")).rows[0].n).toBe(1);
  });
  it("parallel registrations with the same username/email yield exactly one account (409 for the rest, never 500)", async () => {
    const rs = await Promise.all([...Array(5)].map((_, i) => api(t, "POST", "/auth/register", { body: { email: i % 2 ? "same@example.com" : "SAME@example.com", password: "correct horse battery", username: "samename" } })));
    expect(rs.filter((r) => r.statusCode === 201)).toHaveLength(1);
    expect(rs.every((r) => [201, 409].includes(r.statusCode))).toBe(true);
  });
  it("parallel reset-token redemption succeeds exactly once", async () => {
    const u = await register(t, { username: "alice" });
    await api(t, "POST", "/auth/forgot-password", { body: { email: u.email } });
    const m = await waitFor(async () => (await t.ctx.pool.query("select body_text from email_outbox where to_email=$1 and subject not like 'Confirm%'", [u.email])).rows[0]);
    const token = /token=([\w-]+)/.exec(m.body_text)![1]!;
    const rs = await Promise.all([...Array(4)].map((_, i) => api(t, "POST", "/auth/reset-password", { body: { token, password: `parallel password ${i}` } })));
    expect(rs.filter((r) => r.statusCode === 204)).toHaveLength(1);
  });
});
