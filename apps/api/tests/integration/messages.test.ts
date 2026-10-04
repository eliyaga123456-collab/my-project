import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hmacHex } from "../../src/lib/crypto";
import { api, createTestApp, inbox, json, send, sleep, solvePow, verifiedUser, waitFor, register, type TestApp } from "./helpers";

let t: TestApp;
beforeAll(async () => { t = await createTestApp(); });
afterAll(() => t.close());
beforeEach(() => t.reset());

const count = async (sql: string, params: unknown[] = []) => Number((await t.ctx.pool.query(sql, params)).rows[0].n);

describe("anonymous send flow", () => {
  it("delivers to a username and to a round slug; sender identity never appears in the inbox DTO", async () => {
    const a = await verifiedUser(t, "alice");
    expect((await send(t, "alice", "What is your favourite book?")).statusCode).toBe(201);
    const round = json(await api(t, "POST", "/links", { cookie: a.cookie, body: { label: "Q&A night", prompt: "Ask me about travel" } }));
    const r = await api(t, "POST", "/messages", { body: { slug: round.slug, body: "Where should I go in Spain?" }, ip: "198.51.100.8" });
    expect(r.statusCode).toBe(201);
    expect(json(r)).toEqual({ status: "delivered" });
    const inb = await inbox(t, a.cookie);
    expect(inb.items).toHaveLength(2);
    const viaRound = inb.items.find((m) => m.body.startsWith("Where"));
    expect(viaRound.linkLabel).toBe("Q&A night");
    expect(inb.items.find((m) => m.body.startsWith("What")).linkLabel).toBeNull();
    const raw = JSON.stringify(inb);
    expect(raw).not.toMatch(/source|device|hash|198\.51/i);
    // sender gets a device cookie, but it is httpOnly
    expect(r.cookies.find((c) => c.name === "unsaid_dev")?.httpOnly).toBe(true);
  });

  it("rejects bad input: both/neither of username+slug, too short/long, invalid slug", async () => {
    await verifiedUser(t, "alice");
    for (const body of [{ body: "hello there" }, { username: "alice", slug: "abcd1234", body: "hello there" }, { username: "alice", body: "a" }, { username: "alice", body: "x".repeat(501) }, { slug: "../x", body: "hello there" }]) {
      expect((await api(t, "POST", "/messages", { body })).statusCode, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
  });

  it("unknown link/slug -> 404, banned user -> 404", async () => {
    const a = await verifiedUser(t, "alice");
    expect((await send(t, "nobodyhere", "hello there")).statusCode).toBe(404);
    expect((await api(t, "POST", "/messages", { body: { slug: "doesnotexist", body: "hello there" } })).statusCode).toBe(404);
    await t.ctx.pool.query("update users set status='banned' where id=$1", [a.id]);
    expect((await send(t, "alice", "hello there")).statusCode).toBe(404);
  });

  it("paused link -> 423, resumes when unpaused; suspended recipient and acceptingMessages=false -> 423; nothing stored", async () => {
    const a = await verifiedUser(t, "alice");
    expect((await api(t, "POST", "/link/pause", { cookie: a.cookie, body: { paused: true } })).statusCode).toBe(200);
    const r = await send(t, "alice", "anyone home?");
    expect(r.statusCode).toBe(423);
    expect(json(r).error.code).toBe("link_paused");
    expect(await count("select count(*)::int n from messages")).toBe(0);
    await api(t, "POST", "/link/pause", { cookie: a.cookie, body: { paused: false } });
    expect((await send(t, "alice", "anyone home?")).statusCode).toBe(201);
    await api(t, "PATCH", "/settings", { cookie: a.cookie, body: { acceptingMessages: false } });
    expect((await send(t, "alice", "second one here", "198.51.100.9")).statusCode).toBe(423);
    await api(t, "PATCH", "/settings", { cookie: a.cookie, body: { acceptingMessages: true } });
    await t.ctx.pool.query("update users set status='suspended' where id=$1", [a.id]);
    expect((await send(t, "alice", "third one here", "198.51.100.10")).statusCode).toBe(423);
  });

  it("pause with an `until` in the past is rejected; expired pause no longer blocks", async () => {
    const a = await verifiedUser(t, "alice");
    expect((await api(t, "POST", "/link/pause", { cookie: a.cookie, body: { paused: true, until: new Date(Date.now() - 1000).toISOString() } })).statusCode).toBe(400);
    await api(t, "POST", "/link/pause", { cookie: a.cookie, body: { paused: true, until: new Date(Date.now() + 60_000).toISOString() } });
    expect((await send(t, "alice", "still paused")).statusCode).toBe(423);
    await t.ctx.pool.query("update links set paused_until = now() - interval '1 second' where user_id=$1", [a.id]);
    expect((await send(t, "alice", "pause expired")).statusCode).toBe(201);
  });

  it("closed round -> 423 'round has closed'", async () => {
    const a = await verifiedUser(t, "alice");
    const round = json(await api(t, "POST", "/links", { cookie: a.cookie, body: { label: "r", closesAt: new Date(Date.now() + 3600_000).toISOString() } }));
    expect((await api(t, "POST", "/messages", { body: { slug: round.slug, body: "still open" } })).statusCode).toBe(201);
    await t.ctx.pool.query("update links set closes_at = now() - interval '1 minute' where id=$1", [round.id]);
    const r = await api(t, "POST", "/messages", { body: { slug: round.slug, body: "too late now" }, ip: "198.51.100.20" });
    expect(r.statusCode).toBe(423);
    expect(json(r).error.message).toMatch(/round has closed/);
    const pub = json(await api(t, "GET", `/links/public/${round.slug}`));
    expect(pub.linkState).toBe("closed");
    expect(pub.acceptingMessages).toBe(false);
  });
});

describe("moderation in the send flow", () => {
  it("reject -> 422 with categories, nothing stored, event recorded", async () => {
    const a = await verifiedUser(t, "alice");
    const r = await send(t, "alice", "I will kill you");
    expect(r.statusCode).toBe(422);
    expect(json(r).error.code).toBe("moderation_rejected");
    expect(json(r).error.details.categories).toContain("threat");
    expect(await count("select count(*)::int n from messages")).toBe(0);
    expect(await count("select count(*)::int n from moderation_events where outcome='reject' and user_id=$1", [a.id])).toBe(1);
  });
  it("hold -> stored in filtered, sender sees the same 201 as a normal delivery", async () => {
    const a = await verifiedUser(t, "alice");
    const r = await send(t, "alice", "you are so ugly");
    expect(r.statusCode).toBe(201);
    expect(json(r)).toEqual({ status: "delivered" });
    expect((await inbox(t, a.cookie, "inbox")).items).toHaveLength(0);
    const f = await inbox(t, a.cookie, "filtered");
    expect(f.items).toHaveLength(1);
    expect(f.items[0].filteredCategories.length).toBeGreaterThan(0);
  });
  it("hidden words filter quietly; removal restores delivery; enhanced mode is stricter", async () => {
    const a = await verifiedUser(t, "alice");
    const hw = json(await api(t, "POST", "/hidden-words", { cookie: a.cookie, body: { word: "Pineapple" } }));
    expect(hw.word).toBe("pineapple");
    await send(t, "alice", "lets talk about pineapple pizza");
    const f = await inbox(t, a.cookie, "filtered");
    expect(f.items[0].filteredCategories).toEqual(["hidden_word"]);
    expect((await api(t, "DELETE", `/hidden-words/${hw.id}`, { cookie: a.cookie })).statusCode).toBe(204);
    await send(t, "alice", "lets talk about pineapple pizza again", "198.51.100.30");
    expect((await inbox(t, a.cookie)).items).toHaveLength(1);
    // enhanced
    await send(t, "alice", "you are so cringe", "198.51.100.31");
    expect((await inbox(t, a.cookie)).items).toHaveLength(2);
    await api(t, "PATCH", "/settings", { cookie: a.cookie, body: { enhancedModeration: true } });
    await send(t, "alice", "you are so cringe!!", "198.51.100.32");
    expect((await inbox(t, a.cookie, "filtered")).items.length).toBe(2);
  });
  it("hidden words: duplicates idempotent, empty-after-folding rejected, max 100", async () => {
    const a = await verifiedUser(t, "alice");
    const w1 = json(await api(t, "POST", "/hidden-words", { cookie: a.cookie, body: { word: "secret" } }));
    const w2 = json(await api(t, "POST", "/hidden-words", { cookie: a.cookie, body: { word: "secret" } }));
    expect(w2.id).toBe(w1.id);
    expect((await api(t, "POST", "/hidden-words", { cookie: a.cookie, body: { word: "!!" } })).statusCode).toBe(400);
    for (let i = 0; i < 99; i++) await t.ctx.pool.query("insert into hidden_words(user_id, word) values ($1,$2)", [a.id, `word${i}x`]);
    expect((await api(t, "POST", "/hidden-words", { cookie: a.cookie, body: { word: "onemore" } })).statusCode).toBe(409);
  });
});

describe("duplicate suppression", () => {
  it("same source + same (normalised) body is dropped silently", async () => {
    const a = await verifiedUser(t, "alice");
    expect((await send(t, "alice", "Do you like pizza?", "198.51.100.40")).statusCode).toBe(201);
    expect((await send(t, "alice", "do  you LIKE pizza", "198.51.100.40")).statusCode).toBe(201);
    expect((await inbox(t, a.cookie)).items).toHaveLength(1);
    expect(await count("select count(*)::int n from moderation_events where outcome='duplicate'")).toBe(1);
  });
  it(">=3 identical from different sources: the 4th is dropped", async () => {
    const a = await verifiedUser(t, "alice");
    for (let i = 0; i < 5; i++) expect((await send(t, "alice", "Everyone asks the same thing", `198.51.100.${50 + i}`)).statusCode).toBe(201);
    expect((await inbox(t, a.cookie)).items).toHaveLength(3);
  });
  it("same body to two different recipients is not a duplicate", async () => {
    const a = await verifiedUser(t, "alice"); const b = await verifiedUser(t, "bobby");
    await send(t, "alice", "Hello friend how are you");
    await send(t, "bobby", "Hello friend how are you");
    expect((await inbox(t, a.cookie)).items).toHaveLength(1);
    expect((await inbox(t, b.cookie)).items).toHaveLength(1);
  });
});

describe("blocks and platform bans", () => {
  it("block drops later messages from the same source silently; list/unblock restores", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "first message from me", "198.51.100.60");
    const m = (await inbox(t, a.cookie)).items[0];
    const blk = await api(t, "POST", `/messages/${m.id}/block`, { cookie: a.cookie });
    expect(blk.statusCode).toBe(201);
    const bdto = json(blk);
    expect(bdto.label).toMatch(/^Anonymous source [0-9A-F]{4}$/);
    expect(Object.keys(bdto).sort()).toEqual(["createdAt", "id", "label"]);
    expect((await inbox(t, a.cookie, "archived")).items).toHaveLength(1);
    const r = await send(t, "alice", "second message from me", "198.51.100.60");
    expect(r.statusCode).toBe(201); // cannot probe
    expect((await inbox(t, a.cookie)).items).toHaveLength(0);
    expect(json(await api(t, "GET", "/blocks", { cookie: a.cookie })).items).toHaveLength(1);
    // blocking again is idempotent
    const again = json(await api(t, "POST", `/messages/${m.id}/block`, { cookie: a.cookie }));
    expect(again.id).toBe(bdto.id);
    // other recipients unaffected
    const b = await verifiedUser(t, "bobby");
    await send(t, "bobby", "hi bobby from blocked ip", "198.51.100.60");
    expect((await inbox(t, b.cookie)).items).toHaveLength(1);
    expect((await api(t, "DELETE", `/blocks/${bdto.id}`, { cookie: a.cookie })).statusCode).toBe(204);
    await send(t, "alice", "third message from me", "198.51.100.60");
    expect((await inbox(t, a.cookie)).items).toHaveLength(1);
    expect((await api(t, "DELETE", `/blocks/${bdto.id}`, { cookie: a.cookie })).statusCode).toBe(404);
  });

  it("device-cookie block also catches the same device on a new IP", async () => {
    const a = await verifiedUser(t, "alice");
    const r1 = await send(t, "alice", "first from device", "198.51.100.61");
    const dev = r1.cookies.find((c) => c.name === "unsaid_dev")!.value;
    const m = (await inbox(t, a.cookie)).items[0];
    await api(t, "POST", `/messages/${m.id}/block`, { cookie: a.cookie });
    const r2 = await api(t, "POST", "/messages", { body: { username: "alice", body: "from new network" }, ip: "198.51.100.99", headers: { cookie: `unsaid_dev=${dev}` } });
    expect(r2.statusCode).toBe(201);
    expect((await inbox(t, a.cookie)).items).toHaveLength(0);
  });

  it("platform banned_sources: silent drop, event logged; expired ban no longer applies", async () => {
    const a = await verifiedUser(t, "alice");
    const src = hmacHex(t.ctx.config.APP_SECRET, "ip:198.51.100.70");
    await t.ctx.pool.query("insert into banned_sources(source_hash, until) values ($1, null)", [src]);
    expect((await send(t, "alice", "I am banned platform wide", "198.51.100.70")).statusCode).toBe(201);
    expect((await inbox(t, a.cookie)).items).toHaveLength(0);
    expect(await count("select count(*)::int n from moderation_events where outcome='banned_source'")).toBe(1);
    await t.ctx.pool.query("update banned_sources set until = now() - interval '1 minute'");
    await send(t, "alice", "ban has expired now", "198.51.100.70");
    expect((await inbox(t, a.cookie)).items).toHaveLength(1);
  });
});

describe("inbox management", () => {
  it("lists with cursor pagination (newest first, no dupes/gaps), filters by status", async () => {
    const a = await verifiedUser(t, "alice");
    for (let i = 0; i < 5; i++) { await send(t, "alice", `message number ${i} here`, `198.51.100.${100 + i}`); await sleep(5); }
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const p = await inbox(t, a.cookie, "inbox", { limit: "2", ...(cursor ? { cursor } : {}) });
      seen.push(...p.items.map((m) => m.body));
      cursor = p.nextCursor; pages++;
    } while (cursor && pages < 10);
    expect(pages).toBe(3);
    expect(seen).toEqual([4, 3, 2, 1, 0].map((i) => `message number ${i} here`));
    expect((await inbox(t, a.cookie, "archived")).items).toHaveLength(0);
    expect((await api(t, "GET", "/messages", { cookie: a.cookie, query: { status: "bogus" } })).statusCode).toBe(400);
    expect((await api(t, "GET", "/messages", { cookie: a.cookie, query: { limit: "51" } })).statusCode).toBe(400);
  });

  it("mark read/unread, archive, move filtered -> inbox, delete", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "a normal message");
    await send(t, "alice", "you are so ugly", "198.51.100.110");
    const m = (await inbox(t, a.cookie)).items[0];
    expect(m.read).toBe(false);
    expect(json(await api(t, "GET", "/auth/me", { cookie: a.cookie })).unreadMessages).toBe(1);
    expect(json(await api(t, "PATCH", `/messages/${m.id}`, { cookie: a.cookie, body: { read: true } })).read).toBe(true);
    expect(json(await api(t, "GET", "/auth/me", { cookie: a.cookie })).unreadMessages).toBe(0);
    expect(json(await api(t, "PATCH", `/messages/${m.id}`, { cookie: a.cookie, body: { read: false } })).read).toBe(false);
    expect(json(await api(t, "PATCH", `/messages/${m.id}`, { cookie: a.cookie, body: { status: "archived" } })).status).toBe("archived");
    expect((await inbox(t, a.cookie, "archived")).items).toHaveLength(1);
    const f = (await inbox(t, a.cookie, "filtered")).items[0];
    const moved = json(await api(t, "PATCH", `/messages/${f.id}`, { cookie: a.cookie, body: { status: "inbox" } }));
    expect(moved.status).toBe("inbox");
    expect(moved.filteredCategories).toEqual([]);
    expect((await api(t, "PATCH", `/messages/${m.id}`, { cookie: a.cookie, body: { status: "filtered" } })).statusCode).toBe(400);
    expect((await api(t, "DELETE", `/messages/${m.id}`, { cookie: a.cookie })).statusCode).toBe(204);
    expect((await api(t, "GET", `/messages/${m.id}`, { cookie: a.cookie })).statusCode).toBe(404);
    expect((await api(t, "DELETE", `/messages/${m.id}`, { cookie: a.cookie })).statusCode).toBe(404);
  });
});

describe("rate limits and proof of work (limits enabled)", () => {
  let rl: TestApp;
  beforeAll(async () => { rl = await createTestApp({ RATE_LIMIT_DISABLED: "false" }); });
  afterAll(() => rl.close());
  beforeEach(() => rl.reset());
  const S = (body: string, over: Record<string, unknown> = {}, ip = "198.51.100.200") => api(rl, "POST", "/messages", { body: { username: "alice", body, ...over }, ip });

  it("after 3 quick sends a challenge is required; a solved challenge works exactly once", async () => {
    const a = await register(rl, { username: "alice" });
    for (let i = 0; i < 3; i++) expect((await S(`quick message ${i} ok`)).statusCode).toBe(201);
    const r = await S("fourth message needs pow");
    expect(r.statusCode).toBe(428);
    const ch = json(r).error.details.challenge;
    expect(ch.algorithm).toBe("sha256-leading-zero-bits");
    const sol = solvePow(ch);
    expect((await S("fourth message needs pow", { challenge: sol })).statusCode).toBe(201);
    // reuse of a solved challenge fails (and issues a fresh one)
    const reuse = await S("fifth message needs pow", { challenge: sol });
    expect(reuse.statusCode).toBe(428);
    expect(json(reuse).error.details.challenge.id).not.toBe(ch.id);
    expect((await inbox(rl, a.cookie)).items).toHaveLength(4);
    expect(await Number((await rl.ctx.pool.query("select count(*)::int n from moderation_events where outcome='challenge'")).rows[0].n)).toBeGreaterThanOrEqual(2);
  });

  it("forged, tampered, expired and garbage challenges fail; challenge for a wrong nonce fails", async () => {
    await register(rl, { username: "alice" });
    for (let i = 0; i < 3; i++) await rl.ctx.rl.hit(`msg:risk:${hmacHex(rl.ctx.config.APP_SECRET, "ip:198.51.100.200")}`, 600_000); // 3 recent sends -> risky
    const ch = json(await api(rl, "GET", "/public/challenge")) as { id: string; prefix: string; difficulty: number };
    const good = solvePow(ch);
    const parts = ch.id.split(".");
    const forgedId = `${parts[0]}.${parts[1]}.${"0".repeat(32)}`;
    const forged = solvePow({ id: forgedId, prefix: `${forgedId}:`, difficulty: ch.difficulty });
    expect((await S("forged challenge try", { challenge: forged })).statusCode).toBe(428);
    const tamperedId = `${Number(parts[0]) + 600000}.${parts[1]}.${parts[2]}`; // extend expiry, keep MAC
    expect((await S("tampered expiry try", { challenge: solvePow({ id: tamperedId, prefix: `${tamperedId}:`, difficulty: ch.difficulty }) })).statusCode).toBe(428);
    // expired but with a *valid* MAC
    const exp = String(Date.now() - 1000), rnd = "abcdefghijkl";
    const expiredId = `${exp}.${rnd}.${hmacHex(rl.ctx.config.APP_SECRET, `pow:${exp}.${rnd}`).slice(0, 32)}`;
    expect((await S("expired challenge try", { challenge: solvePow({ id: expiredId, prefix: `${expiredId}:`, difficulty: ch.difficulty }) })).statusCode).toBe(428);
    expect((await S("garbage challenge try", { challenge: { id: "not-a-challenge", nonce: "1" } })).statusCode).toBe(428);
    expect((await S("bad nonce challenge try", { challenge: { id: good.id, nonce: "zzzzzzzzzzzz" } })).statusCode).toBe(428);
    // and the genuine one still works afterwards (failed attempts did not burn it)
    expect((await S("the genuine solution", { challenge: good })).statusCode).toBe(201);
  });

  it("per-ip-per-recipient limit (6/10min) -> 429 with Retry-After; other recipient and other IP unaffected", async () => {
    await register(rl, { username: "alice" }); await register(rl, { username: "bobby" });
    const sendPow = async (i: number) => {
      let r = await S(`burst message number ${i}`);
      if (r.statusCode === 428) r = await S(`burst message number ${i}`, { challenge: solvePow(json(r).error.details.challenge) });
      return r;
    };
    // attempts 1..6 are allowed (some via PoW), the 7th is throttled; PoW attempts consume a hit each so allow for that
    let throttled = null as null | Awaited<ReturnType<typeof S>>;
    for (let i = 0; i < 12 && !throttled; i++) { const r = await sendPow(i); if (r.statusCode === 429) throttled = r; else expect(r.statusCode).toBe(201); }
    expect(throttled).not.toBeNull();
    expect(json(throttled!).error.code).toBe("rate_limited");
    expect(Number(throttled!.headers["retry-after"])).toBeGreaterThan(0);
    expect(json(throttled!).error.retryAfterSeconds).toBeGreaterThan(0);
    // a different IP can still reach alice
    expect((await S("different ip fresh start", {}, "198.51.100.201")).statusCode).toBe(201);
  });

  it("global per-recipient/IP caps exist: api-wide limit headers on the challenge endpoint (60/hour)", async () => {
    let last = 0;
    for (let i = 0; i < 61; i++) last = (await api(rl, "GET", "/public/challenge", { ip: "198.51.100.210" })).statusCode;
    expect(last).toBe(429);
  });
});

describe("replies and public answers", () => {
  it("private reply works unverified; public reply needs verified email (403 email_not_verified)", async () => {
    const a = await register(t, { username: "alice" });
    await send(t, "alice", "What are you reading?");
    const m = (await inbox(t, a.cookie)).items[0];
    const priv = await api(t, "POST", `/messages/${m.id}/reply`, { cookie: a.cookie, body: { text: "A novel", public: false } });
    expect(priv.statusCode).toBe(200);
    expect(json(priv).reply).toMatchObject({ text: "A novel", public: false, answerId: null });
    const pub = await api(t, "POST", `/messages/${m.id}/reply`, { cookie: a.cookie, body: { text: "A novel", public: true } });
    expect(pub.statusCode).toBe(403);
    expect(json(pub).error.code).toBe("email_not_verified");
    expect(json(await api(t, "GET", "/profiles/alice/answers")).items).toHaveLength(0);
  });

  it("public reply creates an answer visible via list and /answers/:id; removal unpublishes; showAnswersPublicly=false hides", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "What are you reading?");
    const m = (await inbox(t, a.cookie)).items[0];
    const r = json(await api(t, "POST", `/messages/${m.id}/reply`, { cookie: a.cookie, body: { text: "A great novel", public: true } }));
    expect(r.reply.answerId).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.reply.answerId).not.toBe(m.id);
    const list = json(await api(t, "GET", "/profiles/alice/answers"));
    expect(list.items).toEqual([expect.objectContaining({ id: r.reply.answerId, question: "What are you reading?", answer: "A great novel" })]);
    expect(list.items[0].author).toEqual(expect.objectContaining({ username: "alice" }));
    expect(JSON.stringify(list)).not.toMatch(/email|source|hash|"userId"/i);
    const one = await api(t, "GET", `/answers/${r.reply.answerId}`);
    expect(one.statusCode).toBe(200);
    expect(json(one).answer).toBe("A great novel");
    // answering by message id (not answer id) never leaks
    expect((await api(t, "GET", `/answers/${m.id}`)).statusCode).toBe(404);
    await api(t, "PATCH", "/settings", { cookie: a.cookie, body: { showAnswersPublicly: false } });
    expect((await api(t, "GET", `/answers/${r.reply.answerId}`)).statusCode).toBe(404);
    expect(json(await api(t, "GET", "/profiles/alice/answers")).items).toHaveLength(0);
    await api(t, "PATCH", "/settings", { cookie: a.cookie, body: { showAnswersPublicly: true } });
    expect(json(await api(t, "DELETE", `/messages/${m.id}/reply`, { cookie: a.cookie })).reply).toBeNull();
    expect((await api(t, "GET", `/answers/${r.reply.answerId}`)).statusCode).toBe(404);
  });

  it("private reply is never exposed publicly; answers paginate", async () => {
    const a = await verifiedUser(t, "alice");
    for (let i = 0; i < 3; i++) await send(t, "alice", `question number ${i} here`, `198.51.100.${120 + i}`);
    const items = (await inbox(t, a.cookie)).items;
    await api(t, "POST", `/messages/${items[0].id}/reply`, { cookie: a.cookie, body: { text: "secret private", public: false } });
    await api(t, "POST", `/messages/${items[1].id}/reply`, { cookie: a.cookie, body: { text: "public one", public: true } });
    await sleep(5);
    await api(t, "POST", `/messages/${items[2].id}/reply`, { cookie: a.cookie, body: { text: "public two", public: true } });
    const priv = json<any>(await api(t, "GET", `/messages/${items[0].id}`, { cookie: a.cookie })).reply;
    expect(priv.answerId).toBeNull();
    const all = json(await api(t, "GET", "/profiles/alice/answers"));
    expect(all.items.map((x: any) => x.answer)).toEqual(["public two", "public one"]);
    expect(JSON.stringify(all)).not.toContain("secret private");
  });

  it("filtered (held) messages cannot be answered publicly until moved to inbox; unsafe public answers are refused", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "you are so ugly");
    const f = (await inbox(t, a.cookie, "filtered")).items[0];
    const r = await api(t, "POST", `/messages/${f.id}/reply`, { cookie: a.cookie, body: { text: "thanks", public: true } });
    expect(r.statusCode).toBe(409);
    expect((await api(t, "POST", `/messages/${f.id}/reply`, { cookie: a.cookie, body: { text: "thanks", public: false } })).statusCode).toBe(200);
    expect(json(await api(t, "GET", "/profiles/alice/answers")).items).toHaveLength(0);
    await api(t, "PATCH", `/messages/${f.id}`, { cookie: a.cookie, body: { status: "inbox" } });
    expect((await api(t, "POST", `/messages/${f.id}/reply`, { cookie: a.cookie, body: { text: "thanks", public: true } })).statusCode).toBe(200);
    const bad = await api(t, "POST", `/messages/${f.id}/reply`, { cookie: a.cookie, body: { text: "I will kill you all", public: true } });
    expect(bad.statusCode).toBe(422);
  });

  it("public reply blocked for suspended accounts; validation of reply text", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "a fine question");
    const m = (await inbox(t, a.cookie)).items[0];
    for (const text of ["", "   ", "x".repeat(501)]) expect((await api(t, "POST", `/messages/${m.id}/reply`, { cookie: a.cookie, body: { text, public: false } })).statusCode).toBe(400);
    await t.ctx.pool.query("update users set status='suspended' where id=$1", [a.id]);
    const r = await api(t, "POST", `/messages/${m.id}/reply`, { cookie: a.cookie, body: { text: "ok", public: true } });
    expect(r.statusCode).toBe(403);
    expect(json(r).error.code).toBe("account_suspended");
  });
});

describe("reports", () => {
  it("is idempotent per user+message and the snapshot survives message deletion", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "you are so ugly", "198.51.100.130");
    const m = (await inbox(t, a.cookie, "filtered")).items[0];
    expect((await api(t, "POST", `/messages/${m.id}/report`, { cookie: a.cookie, body: { reason: "harassment", details: "rude" } })).statusCode).toBe(201);
    expect((await api(t, "POST", `/messages/${m.id}/report`, { cookie: a.cookie, body: { reason: "spam" } })).statusCode).toBe(201);
    expect(await count("select count(*)::int n from reports")).toBe(1);
    expect(await count("select count(*)::int n from moderation_events where kind='report'")).toBeGreaterThanOrEqual(1);
    await api(t, "DELETE", `/messages/${m.id}`, { cookie: a.cookie });
    const r = (await t.ctx.pool.query("select message_id, message_body, source_hash, reason, filtered_categories from reports")).rows[0];
    expect(r.message_id).toBeNull();
    expect(r.message_body).toBe("you are so ugly");
    expect(r.source_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.reason).toBe("harassment");
    expect(r.filtered_categories.length).toBeGreaterThan(0);
  });
  it("rejects unknown reasons and over-long details", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "a message to report");
    const m = (await inbox(t, a.cookie)).items[0];
    expect((await api(t, "POST", `/messages/${m.id}/report`, { cookie: a.cookie, body: { reason: "nope" } })).statusCode).toBe(400);
    expect((await api(t, "POST", `/messages/${m.id}/report`, { cookie: a.cookie, body: { reason: "other", details: "x".repeat(501) } })).statusCode).toBe(400);
  });
});

describe("notifications", () => {
  const notifs = async (cookie: string) => json<{ items: any[]; unread: number }>(await api(t, "GET", "/notifications", { cookie }));

  it("creates and coalesces new_message notifications; held messages produce a safety notification", async () => {
    const a = await verifiedUser(t, "alice");
    await send(t, "alice", "first question for you", "198.51.100.140");
    await waitFor(async () => (await notifs(a.cookie)).items.length === 1);
    await send(t, "alice", "second question for you", "198.51.100.141");
    await send(t, "alice", "third question for you", "198.51.100.142");
    const n = await waitFor(async () => { const x = await notifs(a.cookie); return /3 unread/.test(x.items.find((i) => i.type === "new_message")?.body ?? "") ? x : null; });
    expect(n.items.filter((i) => i.type === "new_message")).toHaveLength(1);
    expect(n.items[0].data).not.toHaveProperty("coalesceKey");
    await send(t, "alice", "you are so ugly", "198.51.100.143");
    await waitFor(async () => (await notifs(a.cookie)).items.some((i) => i.type === "safety"));
  });

  it("respects preferences (in-app off -> no notification) and marks read by ids / all", async () => {
    const a = await verifiedUser(t, "alice");
    await api(t, "PATCH", "/settings", { cookie: a.cookie, body: { notifications: { inAppNewMessage: false } } });
    await send(t, "alice", "quiet question for you", "198.51.100.150");
    await waitFor(async () => (await inbox(t, a.cookie)).items.length === 1);
    await sleep(250);
    expect((await notifs(a.cookie)).items.filter((i) => i.type === "new_message")).toHaveLength(0);
    await api(t, "PATCH", "/settings", { cookie: a.cookie, body: { notifications: { inAppNewMessage: true } } });
    await send(t, "alice", "loud question for you", "198.51.100.151");
    const n = await waitFor(async () => { const x = await notifs(a.cookie); return x.items.length ? x : null; });
    expect(n.unread).toBe(1);
    expect((await api(t, "POST", "/notifications/read", { cookie: a.cookie, body: { ids: [n.items[0].id] } })).statusCode).toBe(204);
    expect((await notifs(a.cookie)).unread).toBe(0);
    await t.ctx.pool.query("insert into notifications(user_id,type,title,body) values ($1,'safety','x','y'),($1,'safety','x2','y2')", [a.id]);
    expect((await notifs(a.cookie)).unread).toBe(2);
    expect((await api(t, "POST", "/notifications/read", { cookie: a.cookie, body: { all: true } })).statusCode).toBe(204);
    expect((await notifs(a.cookie)).unread).toBe(0);
    expect((await api(t, "POST", "/notifications/read", { cookie: a.cookie, body: {} })).statusCode).toBe(400);
    expect((await api(t, "POST", "/notifications/read", { cookie: a.cookie, body: { ids: ["nope"] } })).statusCode).toBe(400);
  });
});

describe("rounds (extra links)", () => {
  it("create with prompt/closesAt, public profile reflects it, update, delete", async () => {
    const a = await verifiedUser(t, "alice");
    const closes = new Date(Date.now() + 7 * 86400_000).toISOString();
    const r = await api(t, "POST", "/links", { cookie: a.cookie, body: { label: "AMA", prompt: "Ask me anything about cooking", closesAt: closes } });
    expect(r.statusCode).toBe(201);
    const l = json(r);
    expect(l).toMatchObject({ label: "AMA", prompt: "Ask me anything about cooking", isPrimary: false, closed: false, messages: 0 });
    expect(l.url).toContain(`/l/${l.slug}`);
    const pub = json(await api(t, "GET", `/links/public/${l.slug}`));
    expect(pub).toMatchObject({ prompt: "Ask me anything about cooking", linkState: "open", linkLabel: "AMA", username: "alice" });
    const up = json(await api(t, "PATCH", `/links/${l.id}`, { cookie: a.cookie, body: { label: "AMA 2", prompt: null, closesAt: null, paused: true } }));
    expect(up).toMatchObject({ label: "AMA 2", prompt: null, closesAt: null, paused: true });
    expect((await api(t, "POST", "/messages", { body: { slug: l.slug, body: "paused round msg" } })).statusCode).toBe(423);
    expect((await api(t, "DELETE", `/links/${l.id}`, { cookie: a.cookie })).statusCode).toBe(204);
    expect((await api(t, "GET", `/links/public/${l.slug}`)).statusCode).toBe(404);
  });

  it("validates closesAt (past / >1y / not ISO), label and prompt limits", async () => {
    const a = await verifiedUser(t, "alice");
    const post = (body: unknown) => api(t, "POST", "/links", { cookie: a.cookie, body });
    expect((await post({ label: "x", closesAt: new Date(Date.now() - 1000).toISOString() })).statusCode).toBe(400);
    expect((await post({ label: "x", closesAt: new Date(Date.now() + 400 * 86400_000).toISOString() })).statusCode).toBe(400);
    expect((await post({ label: "x", closesAt: "tomorrow" })).statusCode).toBe(400);
    expect((await post({ label: "" })).statusCode).toBe(400);
    expect((await post({ label: "x".repeat(41) })).statusCode).toBe(400);
    expect((await post({ label: "ok", prompt: "p".repeat(121) })).statusCode).toBe(400);
    expect((await post({ label: "ok", prompt: "p".repeat(120) })).statusCode).toBe(201);
    const l = json(await post({ label: "second" }));
    expect((await api(t, "PATCH", `/links/${l.id}`, { cookie: a.cookie, body: { closesAt: new Date(Date.now() - 5000).toISOString() } })).statusCode).toBe(400);
    expect((await api(t, "PATCH", `/links/${l.id}`, { cookie: a.cookie, body: { prompt: "p".repeat(121) } })).statusCode).toBe(400);
  });

  it("primary link cannot be deleted; max 10 links", async () => {
    const a = await verifiedUser(t, "alice");
    const primary = json(await api(t, "GET", "/links", { cookie: a.cookie })).items[0];
    expect(primary.isPrimary).toBe(true);
    expect((await api(t, "DELETE", `/links/${primary.id}`, { cookie: a.cookie })).statusCode).toBe(409);
    for (let i = 0; i < 9; i++) expect((await api(t, "POST", "/links", { cookie: a.cookie, body: { label: `r${i}` } })).statusCode).toBe(201);
    expect((await api(t, "POST", "/links", { cookie: a.cookie, body: { label: "one too many" } })).statusCode).toBe(409);
  });

  it("filters inbox by linkId and reports per-round stats (messages, views deduped)", async () => {
    const a = await verifiedUser(t, "alice");
    const r1 = json(await api(t, "POST", "/links", { cookie: a.cookie, body: { label: "one" } }));
    const r2 = json(await api(t, "POST", "/links", { cookie: a.cookie, body: { label: "two" } }));
    await api(t, "POST", "/messages", { body: { slug: r1.slug, body: "to round one A" }, ip: "198.51.100.160" });
    await api(t, "POST", "/messages", { body: { slug: r1.slug, body: "to round one B" }, ip: "198.51.100.161" });
    await api(t, "POST", "/messages", { body: { slug: r2.slug, body: "to round two A" }, ip: "198.51.100.162" });
    await send(t, "alice", "to main link here", "198.51.100.163");
    expect((await inbox(t, a.cookie, "inbox", { linkId: r1.id })).items).toHaveLength(2);
    expect((await inbox(t, a.cookie, "inbox", { linkId: r2.id })).items).toHaveLength(1);
    expect((await inbox(t, a.cookie)).items).toHaveLength(4);
    expect((await api(t, "GET", "/messages", { cookie: a.cookie, query: { linkId: "not-a-uuid" } })).statusCode).toBe(400);
    for (let i = 0; i < 3; i++) await api(t, "POST", "/public/view", { body: { slug: r1.slug }, ip: "198.51.100.170" });
    await api(t, "POST", "/public/view", { body: { slug: r1.slug }, ip: "198.51.100.171" });
    const links = json(await api(t, "GET", "/links", { cookie: a.cookie })).items;
    const by = (id: string) => links.find((l: any) => l.id === id);
    expect(by(r1.id)).toMatchObject({ messages: 2, views: 2 });
    expect(by(r2.id)).toMatchObject({ messages: 1, views: 0 });
    const an = json(await api(t, "GET", "/analytics/me", { cookie: a.cookie }));
    expect(an.totals).toMatchObject({ views: 2, messages: 4 });
    expect((await api(t, "POST", "/public/view", { body: { slug: r1.slug, username: "alice" } })).statusCode).toBe(400);
  });

  it("deleting a round keeps its messages (link_id set null)", async () => {
    const a = await verifiedUser(t, "alice");
    const r1 = json(await api(t, "POST", "/links", { cookie: a.cookie, body: { label: "tmp" } }));
    await api(t, "POST", "/messages", { body: { slug: r1.slug, body: "kept after delete" } });
    await api(t, "DELETE", `/links/${r1.id}`, { cookie: a.cookie });
    const items = (await inbox(t, a.cookie)).items;
    expect(items).toHaveLength(1);
    expect(items[0].linkId).toBeNull();
  });
});
