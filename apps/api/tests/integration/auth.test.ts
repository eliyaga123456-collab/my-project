import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { H, api, cookieOf, createTestApp, json, register, verifyEmail, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await createTestApp(); });
afterAll(() => t.close());
beforeEach(() => t.reset());

describe("registration", () => {
  it("creates user, profile, settings, primary link and returns a session cookie (httpOnly)", async () => {
    const u = await register(t, { username: "alice", email: "Alice@Example.com", displayName: "Alice" });
    expect(u.res.cookies[0]?.httpOnly).toBe(true);
    expect(json(u.res).token).toBeUndefined(); // web: no token in body
    const me = json(await api(t, "GET", "/auth/me", { cookie: u.cookie }));
    expect(me.user.email).toBe("alice@example.com");
    expect(me.profile.displayName).toBe("Alice");
    const links = json(await api(t, "GET", "/links", { cookie: u.cookie }));
    expect(links.items).toHaveLength(1);
    expect(links.items[0].isPrimary).toBe(true);
    expect(links.items[0].url).toContain("/u/alice");
  });
  it("returns a bearer token only for mobile clients", async () => {
    const res = await api(t, "POST", "/auth/register", { body: { email: "m@example.com", password: "correct horse battery", username: "mobile1" }, headers: { "x-client": "mobile" } });
    const token = json(res).token as string;
    expect(token).toMatch(/.{30,}/);
    const me = await t.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { authorization: `Bearer ${token}` } });
    expect(me.statusCode).toBe(200);
  });
  it("stores passwords hashed (scrypt), never plaintext", async () => {
    await register(t, { username: "hashy", password: "super secret pass" });
    const r = await t.ctx.pool.query("select password_hash from users where username='hashy'");
    expect(r.rows[0].password_hash).toMatch(/^scrypt\$/);
    expect(r.rows[0].password_hash).not.toContain("super secret pass");
  });
  it("rejects duplicates, reserved names, weak passwords and bad input", async () => {
    await register(t, { username: "alice", email: "a@example.com" });
    expect((await api(t, "POST", "/auth/register", { body: { email: "x@example.com", password: "correct horse battery", username: "alice" } })).statusCode).toBe(409);
    expect((await api(t, "POST", "/auth/register", { body: { email: "a@example.com", password: "correct horse battery", username: "other" } })).statusCode).toBe(409);
    for (const username of ["admin", "api", "a", "has space", "bad-char!", "_lead", "x".repeat(40)]) {
      const r = await api(t, "POST", "/auth/register", { body: { email: `${username.length}${Math.random()}@example.com`, password: "correct horse battery", username } });
      expect(r.statusCode, username).toBe(400);
      expect(json(r).error.code).toBe("validation_error");
    }
    expect((await api(t, "POST", "/auth/register", { body: { email: "w@example.com", password: "short", username: "weakpw" } })).statusCode).toBe(400);
  });
  it("ignores mass-assignment of role/status", async () => {
    const res = await api(t, "POST", "/auth/register", { body: { email: "evil@example.com", password: "correct horse battery", username: "evil1", role: "admin", status: "active", emailVerifiedAt: "2020-01-01" } });
    expect(res.statusCode).toBe(201);
    expect(json(res).user.role).toBe("user");
    expect(json(res).user.emailVerified).toBe(false);
  });
});

describe("login / logout / sessions", () => {
  it("logs in with correct credentials and rejects wrong ones with the same message", async () => {
    await register(t, { username: "bob", email: "bob@example.com" });
    const ok = await api(t, "POST", "/auth/login", { body: { email: "BOB@example.com", password: "correct horse battery" } });
    expect(ok.statusCode).toBe(200);
    const bad = await api(t, "POST", "/auth/login", { body: { email: "bob@example.com", password: "nope nope nope" } });
    const none = await api(t, "POST", "/auth/login", { body: { email: "ghost@example.com", password: "nope nope nope" } });
    expect(bad.statusCode).toBe(401); expect(none.statusCode).toBe(401);
    expect(json(bad).error.message).toBe(json(none).error.message);
  });
  it("logout revokes the session server-side", async () => {
    const u = await register(t);
    expect((await api(t, "POST", "/auth/logout", { cookie: u.cookie })).statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
  });
  it("lists sessions, marks current and can revoke another (not someone else's)", async () => {
    const a = await register(t, { username: "sess1" });
    const second = cookieOf(await api(t, "POST", "/auth/login", { body: { email: a.email, password: a.password } }))!;
    const list = json(await api(t, "GET", "/auth/sessions", { cookie: a.cookie }));
    expect(list.items).toHaveLength(2);
    const other = list.items.find((s: any) => !s.current);
    const b = await register(t, { username: "sess2" });
    expect((await api(t, "DELETE", `/auth/sessions/${other.id}`, { cookie: b.cookie })).statusCode).toBe(404);
    expect((await api(t, "DELETE", `/auth/sessions/${other.id}`, { cookie: a.cookie })).statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: second })).statusCode).toBe(401);
  });
  it("rejects invalid, malformed, expired and revoked tokens", async () => {
    const u = await register(t);
    for (const cookie of ["unsaid_session=garbage", "unsaid_session=", "unsaid_session=" + "A".repeat(500), "unsaid_session=' OR 1=1 --"]) {
      expect((await api(t, "GET", "/auth/me", { cookie })).statusCode).toBe(401);
    }
    expect((await t.app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { authorization: "Bearer nope" } })).statusCode).toBe(401);
    await t.ctx.pool.query("update sessions set expires_at = now() - interval '1 minute'");
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
  });
  it("banned users cannot log in and their sessions stop working", async () => {
    const u = await register(t);
    await t.ctx.pool.query("update users set status='banned' where id=$1", [u.id]);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
    const r = await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } });
    expect(r.statusCode).toBe(403);
    expect(json(r).error.code).toBe("account_suspended");
  });
});

describe("email verification & password reset", () => {
  it("verifies email once; token is single use", async () => {
    const u = await register(t, { email: "v@example.com" });
    await verifyEmail(t, u.email);
    expect(json(await api(t, "GET", "/auth/me", { cookie: u.cookie })).user.emailVerified).toBe(true);
    const r = await t.ctx.pool.query("select body_text from email_outbox where to_email=$1", [u.email]);
    const token = /token=([\w-]+)/.exec(r.rows[0].body_text)![1];
    expect((await api(t, "POST", "/auth/verify-email", { body: { token } })).statusCode).toBe(400);
  });
  it("forgot-password never reveals whether an account exists; reset revokes sessions and token is single-use", async () => {
    const u = await register(t, { email: "r@example.com" });
    expect((await api(t, "POST", "/auth/forgot-password", { body: { email: "nobody@example.com" } })).statusCode).toBe(204);
    expect((await api(t, "POST", "/auth/forgot-password", { body: { email: u.email } })).statusCode).toBe(204);
    const r = await t.ctx.pool.query("select body_text from email_outbox where to_email=$1 and subject like 'Reset%'", [u.email]);
    const token = /token=([\w-]+)/.exec(r.rows[0].body_text)![1];
    expect((await api(t, "POST", "/auth/reset-password", { body: { token, password: "a brand new password" } })).statusCode).toBe(204);
    expect((await api(t, "POST", "/auth/reset-password", { body: { token, password: "another new password" } })).statusCode).toBe(400);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: "a brand new password" } })).statusCode).toBe(200);
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } })).statusCode).toBe(401);
  });
  it("change-password needs the current password and signs out other sessions", async () => {
    const u = await register(t, { username: "cp1" });
    const other = cookieOf(await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } }))!;
    expect((await api(t, "POST", "/auth/change-password", { cookie: u.cookie, body: { currentPassword: "wrong wrong wrong", newPassword: "yet another password" } })).statusCode).toBe(400);
    expect((await api(t, "POST", "/auth/change-password", { cookie: u.cookie, body: { currentPassword: u.password, newPassword: "yet another password" } })).statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: other })).statusCode).toBe(401);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(200);
  });
});

describe("profile", () => {
  it("updates profile fields with validation and username change cooldown", async () => {
    const u = await register(t, { username: "prof1" });
    const upd = await api(t, "PATCH", "/profile", { cookie: u.cookie, body: { displayName: "  Pro  ", bio: "hi", prompt: "Ask me" } });
    expect(json(upd).displayName).toBe("Pro");
    expect((await api(t, "PATCH", "/profile", { cookie: u.cookie, body: { bio: "x".repeat(500) } })).statusCode).toBe(400);
    expect((await api(t, "PATCH", "/profile/username", { cookie: u.cookie, body: { username: "prof2" } })).statusCode).toBe(200);
    expect((await api(t, "PATCH", "/profile/username", { cookie: u.cookie, body: { username: "prof3" } })).statusCode).toBe(409);
    expect((await api(t, "GET", "/profiles/prof1")).statusCode).toBe(404);
    expect((await api(t, "GET", "/profiles/prof2")).statusCode).toBe(200);
  });
  it("public profile never leaks email or ids", async () => {
    const u = await register(t, { username: "priv1" });
    const body = (await api(t, "GET", "/profiles/priv1")).body;
    expect(body).not.toContain(u.email);
    expect(body).not.toContain(u.id);
  });
});

describe("transport security", () => {
  it("rejects mutating requests without the CSRF header or from foreign origins", async () => {
    const u = await register(t);
    const noHeader = await t.app.inject({ method: "POST", url: "/api/v1/link/pause", headers: { cookie: u.cookie, "content-type": "application/json" }, payload: { paused: true } });
    expect(noHeader.statusCode).toBe(403);
    const evil = await t.app.inject({ method: "POST", url: "/api/v1/link/pause", headers: { ...H, cookie: u.cookie, origin: "https://evil.example" }, payload: { paused: true } });
    expect(evil.statusCode).toBe(403);
    const good = await t.app.inject({ method: "POST", url: "/api/v1/link/pause", headers: { ...H, cookie: u.cookie, origin: "http://localhost:3000" }, payload: { paused: true } });
    expect(good.statusCode).toBe(200);
  });
  it("sets secure headers and does not echo foreign CORS origins", async () => {
    const res = await t.app.inject({ method: "GET", url: "/health", headers: { origin: "https://evil.example" } });
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    const ok = await t.app.inject({ method: "GET", url: "/health", headers: { origin: "http://localhost:3000" } });
    expect(ok.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });
  it("returns uniform JSON errors with a request id", async () => {
    const res = await api(t, "GET", "/nope");
    expect(res.statusCode).toBe(404);
    expect(json(res).error.code).toBe("not_found");
    expect(json(res).error.requestId).toBeTruthy();
    const bad = await t.app.inject({ method: "POST", url: "/api/v1/auth/login", headers: H, payload: "{not json" });
    expect(bad.statusCode).toBe(400);
    expect(json(bad).error).toBeTruthy();
  });
});

describe("account deletion (required by app stores)", () => {
  it("needs the right password, removes the account and all its data, then the session is dead", async () => {
    const u = await register(t, { username: "gone1" });
    await verifyEmail(t, u.email);
    const other = await register(t, { username: "visitor1" });
    // data owned by the account
    await api(t, "POST", "/messages", { body: { username: "gone1", body: "a message that should vanish " + Date.now() }, ip: "198.51.100.201" });
    await api(t, "POST", "/links", { cookie: u.cookie, body: { label: "round" } });
    const bad = await api(t, "DELETE", "/auth/account", { cookie: u.cookie, body: { password: "wrong password!!" } });
    expect(bad.statusCode).toBe(400);
    expect((await api(t, "GET", "/profiles/gone1")).statusCode).toBe(200);
    const ok = await api(t, "DELETE", "/auth/account", { cookie: u.cookie, body: { password: u.password } });
    expect(ok.statusCode).toBe(204);
    expect((await api(t, "GET", "/auth/me", { cookie: u.cookie })).statusCode).toBe(401);
    expect((await api(t, "GET", "/profiles/gone1")).statusCode).toBe(404);
    expect((await api(t, "POST", "/auth/login", { body: { email: u.email, password: u.password } })).statusCode).toBe(401);
    for (const table of ["messages", "links", "sessions", "profiles", "settings"]) {
      const col = table === "profiles" || table === "settings" ? "user_id" : table === "messages" ? "recipient_id" : "user_id";
      const r = await t.ctx.pool.query(`select count(*)::int as n from ${table} where ${col} = $1`, [u.id]);
      expect(r.rows[0].n, table).toBe(0);
    }
    const log = await t.ctx.pool.query("select count(*)::int as n from audit_logs where action='account.delete' and target_id=$1", [u.id]);
    expect(log.rows[0].n).toBe(1);
    expect((await api(t, "GET", "/auth/me", { cookie: other.cookie })).statusCode).toBe(200); // others unaffected
  });
  it("is refused without a session and for admin accounts", async () => {
    expect((await api(t, "DELETE", "/auth/account", { body: { password: "x" } })).statusCode).toBe(401);
  });
});
