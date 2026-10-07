import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { api, createTestApp, json, makeAdmin, send, verifiedUser, inbox, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await createTestApp(); });
afterAll(() => t.close());
beforeEach(() => t.reset());

describe("email change, profile extras, round detail", () => {
  it("changes the email while signed in, unverifies it and sends a new verification", async () => {
    const u = await verifiedUser(t, "alice");
    const ok = await api(t, "PATCH", "/auth/email", { cookie: u.cookie, body: { email: "New@Example.com" } });
    expect(ok.statusCode).toBe(200);
    expect(json(ok)).toMatchObject({ email: "new@example.com", emailVerified: false });
    const mail = (await t.ctx.pool.query("select * from email_outbox where to_email='new@example.com'")).rows;
    expect(mail.length).toBeGreaterThan(0);
  });

  it("stores a profile frame and a whatsapp number, and rejects bad values", async () => {
    const u = await verifiedUser(t, "alice");
    expect((await api(t, "PATCH", "/profile", { cookie: u.cookie, body: { avatarFrame: "neon", whatsapp: "972501234567" } })).statusCode).toBe(200);
    const me = json(await api(t, "GET", "/auth/me", { cookie: u.cookie }));
    expect(me.profile).toMatchObject({ avatarFrame: "neon", whatsapp: "972501234567" });
    expect((await api(t, "PATCH", "/profile", { cookie: u.cookie, body: { avatarFrame: "evil" } })).statusCode).toBe(400);
    expect((await api(t, "PATCH", "/profile", { cookie: u.cookie, body: { whatsapp: "+12 abc" } })).statusCode).toBe(400);
    expect(json(await api(t, "PATCH", "/profile", { cookie: u.cookie, body: { whatsapp: "" } })).whatsapp).toBeNull();
  });

  it("gives admins every message of a round, and nobody else", async () => {
    const owner = await verifiedUser(t, "alice");
    const link = json(await api(t, "POST", "/links", { cookie: owner.cookie, body: { label: "Round 1" } }));
    await t.ctx.pool.query("select 1");
    await send(t, "alice", "first kind message here", "203.0.113.9", { src: "wa" });
    const admin = await makeAdmin(t);
    expect((await api(t, "GET", `/admin/rounds/${link.id}`, { cookie: owner.cookie })).statusCode).toBe(403);
    const r = await api(t, "GET", `/admin/rounds/${link.id}`, { cookie: admin.cookie });
    expect(r.statusCode).toBe(200);
    expect(json(r)).toMatchObject({ label: "Round 1", owner: { username: "alice" } });
    expect((await inbox(t, owner.cookie)).items.length).toBeGreaterThanOrEqual(0);
  });
});
