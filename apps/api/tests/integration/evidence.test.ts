import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runMaintenance } from "../../src/services/maintenance";
import { api, createTestApp, json, makeAdmin, send, verifiedUser, inbox, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await createTestApp(); });
afterAll(() => t.close());
beforeEach(() => t.reset());

const row = async (messageId: string) => (await t.ctx.pool.query("select * from message_evidence where message_id=$1", [messageId])).rows[0];

describe("safety evidence for anonymous messages", () => {
  it("stores the sender address ENCRYPTED, with the share channel, for the short window", async () => {
    const owner = await verifiedUser(t, "alice");
    expect((await send(t, "alice", "a perfectly kind message", "203.0.113.9", { src: "wa" })).statusCode).toBe(201);
    const msg = (await inbox(t, owner.cookie)).items[0];
    const e = await row(msg.id);
    expect(e.channel).toBe("wa");
    expect(e.ip_enc).not.toContain("203.0.113.9");
    expect(Buffer.from(e.ip_enc, "base64").toString("utf8")).not.toContain("203.0.113.9");
    const days = (new Date(e.keep_until).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13);
    expect(days).toBeLessThan(15);
  });

  it("an unknown channel is rejected and no channel defaults to 'direct'", async () => {
    await verifiedUser(t, "alice");
    expect((await send(t, "alice", "hello there friend", "203.0.113.9", { src: "javascript:alert(1)" })).statusCode).toBe(400);
    expect((await send(t, "alice", "hello again friend", "203.0.113.10")).statusCode).toBe(201);
    const r = await t.ctx.pool.query("select channel from message_evidence");
    expect(r.rows.map((x) => x.channel)).toEqual(["direct"]);
  });

  it("only an admin can read it (not moderators, recipients or anonymous), and every read is audit-logged", async () => {
    const owner = await verifiedUser(t, "alice");
    await send(t, "alice", "a perfectly kind message", "203.0.113.9", { src: "ig" });
    const id = (await inbox(t, owner.cookie)).items[0].id;
    const url = `/admin/messages/${id}/evidence`;
    expect((await api(t, "GET", url)).statusCode).toBe(401);
    expect((await api(t, "GET", url, { cookie: owner.cookie })).statusCode).toBe(403);
    const mod = await makeAdmin(t, "moderator");
    expect((await api(t, "GET", url, { cookie: mod.cookie })).statusCode).toBe(403);
    const admin = await makeAdmin(t);
    const r = await api(t, "GET", url, { cookie: admin.cookie });
    expect(r.statusCode).toBe(200);
    expect(json(r)).toMatchObject({ messageId: id, networkAddress: "203.0.113.9", channel: "ig" });
    const logs = (await t.ctx.pool.query("select * from audit_logs where action='evidence.view'")).rows;
    expect(logs).toHaveLength(1);
    expect(logs[0].target_id).toBe(id);
    expect(logs[0].actor_id).toBe(admin.id);
  });

  it("a report extends retention; maintenance deletes expired evidence; deleting the message deletes it too", async () => {
    const owner = await verifiedUser(t, "alice");
    await send(t, "alice", "first kind message", "203.0.113.9");
    await send(t, "alice", "second kind message here", "203.0.113.11");
    const [a, b] = (await inbox(t, owner.cookie)).items;
    expect((await api(t, "POST", `/messages/${a!.id}/report`, { cookie: owner.cookie, body: { reason: "harassment" } })).statusCode).toBeLessThan(300);
    const days = (new Date((await row(a!.id)).keep_until).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(89);
    await t.ctx.pool.query("update message_evidence set keep_until = now() - interval '1 hour' where message_id = $1", [b!.id]);
    await runMaintenance(t.ctx);
    expect(await row(b!.id)).toBeUndefined();
    expect(await row(a!.id)).toBeDefined();
    expect((await api(t, "DELETE", `/messages/${a!.id}`, { cookie: owner.cookie })).statusCode).toBe(204);
    expect(await row(a!.id)).toBeUndefined();
  });
});
