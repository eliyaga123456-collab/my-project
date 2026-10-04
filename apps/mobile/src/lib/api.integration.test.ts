import { describe, expect, it } from "vitest";
import { ApiError, createApiClient } from "@unsaid/api-client";
import { solvePow } from "./pow";

/**
 * Runs the mobile client flow against a live API: `API_URL=http://localhost:4000 npm test -w @unsaid/mobile`.
 * Skipped when API_URL is unset. The client mirrors src/lib/api.ts (clientKind "mobile", bearer token, no cookies);
 * api.ts itself imports expo-secure-store and cannot load under node.
 */
const API_URL = process.env.API_URL;
const run = Date.now().toString(36);
let ipN = 0;
// The dev API trusts X-Forwarded-For, so every call gets a unique source to stay clear of the per-IP rate limits.
const forwarded = () => ({ "x-forwarded-for": `10.88.${Math.floor(Math.random() * 250)}.${(++ipN % 250) + 1}` });

function makeClient(getToken?: () => string | null, onUnauthorized?: () => void) {
  return createApiClient({ baseUrl: API_URL!, clientKind: "mobile", credentials: "omit", getToken, getHeaders: async () => forwarded(), onUnauthorized });
}

describe.skipIf(!API_URL)("mobile client against the live API", () => {
  let token: string | null = null;
  let unauthorizedCalls = 0;
  const api = makeClient(() => token, () => { unauthorizedCalls++; });
  const anon = makeClient();
  const username = `mob_${run}`.slice(0, 24);
  const password = "mobile-it-password-123";

  it("registers and receives a session token in the body (mobile)", async () => {
    const res = await api.auth.register({ email: `${username}@example.com`, password, username, displayName: "Mobile IT" });
    expect(typeof (res as { token?: string }).token).toBe("string");
    token = (res as { token: string }).token;
    expect(res.profile.username).toBe(username);
  });

  it("authenticates /auth/me with the Authorization header only", async () => {
    const me = await api.auth.me();
    expect(me.user.email).toBe(`${username}@example.com`);
    await expect(anon.auth.me()).rejects.toMatchObject({ status: 401 });
  });

  let roundId = "";
  let roundSlug = "";
  it("creates a round (link) with a prompt and a closing time", async () => {
    const closesAt = new Date(Date.now() + 3_600_000).toISOString();
    const l = await api.links.create({ label: `Round ${run}`.slice(0, 40), prompt: "What should I cook?", closesAt });
    expect(l.isPrimary).toBe(false);
    expect(l.prompt).toBe("What should I cook?");
    expect(l.closed).toBe(false);
    roundId = l.id;
    roundSlug = l.url.split("/").pop()!;
    expect((await api.links.list()).items.some((x) => x.id === l.id)).toBe(true);
  });

  const sendWithPow = async (input: { username: string } | { slug: string }, body: string) => {
    try {
      await anon.messages.send({ ...input, body });
      return { solveMs: 0, difficulty: 0 };
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== "challenge_required") throw e;
      const ch = (e.details as { challenge?: Parameters<typeof solvePow>[0] } | undefined)?.challenge ?? (await anon.messages.challenge());
      const t0 = performance.now();
      const solution = await solvePow(ch);
      const solveMs = Math.round(performance.now() - t0);
      const res = await anon.messages.send({ ...input, body, challenge: solution });
      expect(res).toBeTruthy();
      return { solveMs, difficulty: ch.difficulty };
    }
  };

  it("sends a public message to the round with the JS proof-of-work solver and reports solve time", async () => {
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await sendWithPow({ slug: roundSlug }, `Integration message ${i} for the round ${run}-${Math.random().toString(36).slice(2)}`);
      if (r.solveMs) times.push(r.solveMs);
      if (i === 0) console.log(`[pow] difficulty=${r.difficulty} bits`);
    }
    console.log(`[pow] solve times ms: ${times.join(", ") || "n/a (no challenge was required)"}`);
    expect(Math.max(0, ...times)).toBeLessThan(30_000);
  }, 120_000);

  it("solves the live GET /public/challenge with the JS solver and the server accepts the solution", async () => {
    const times: number[] = [];
    let difficulty = 0;
    for (let i = 0; i < 3; i++) {
      const ch = await anon.messages.challenge();
      difficulty = ch.difficulty;
      const t0 = performance.now();
      const solution = await solvePow(ch);
      times.push(Math.round(performance.now() - t0));
      await anon.messages.send({ slug: roundSlug, body: `Pow-solved integration message ${i} ${run}-${Math.random().toString(36).slice(2)}`, challenge: solution });
    }
    console.log(`[pow] live difficulty=${difficulty} bits, JS solve times ms: ${times.join(", ")}`);
    expect(Math.max(...times)).toBeLessThan(30_000);
  }, 180_000);

  it("sends one message to the primary link so the round filter has something to exclude", async () => {
    await sendWithPow({ username }, `Primary link integration message ${run}-${Math.random().toString(36).slice(2)}`);
  }, 120_000);

  let messageId = "";
  it("lists messages filtered by linkId", async () => {
    const all = await api.messages.list({ status: "inbox" });
    const onlyRound = await api.messages.list({ status: "inbox", linkId: roundId });
    expect(all.items.length).toBeGreaterThan(onlyRound.items.length);
    expect(onlyRound.items.length).toBeGreaterThanOrEqual(1);
    expect(onlyRound.items.every((m) => m.linkId === roundId)).toBe(true);
    messageId = onlyRound.items[0]!.id;
  });

  it("replies privately, while publishing an answer needs a verified email", async () => {
    // Public answers are gated on email verification (the account here is brand new and unverified).
    await expect(api.messages.reply(messageId, "Thanks, great question!", true)).rejects.toMatchObject({ status: 403, code: "email_not_verified" });
    const m = await api.messages.reply(messageId, "Thanks, great question!", false);
    expect(JSON.stringify(m)).toContain("Thanks, great question!");
  });

  it("pauses and deletes the round", async () => {
    expect((await api.links.update(roundId, { paused: true })).paused).toBe(true);
    await api.links.remove(roundId);
    expect((await api.links.list()).items.some((x) => x.id === roundId)).toBe(false);
  });

  it("logs out, after which the token is rejected and the 401 handler fires", async () => {
    await api.auth.logout();
    await expect(api.auth.me()).rejects.toMatchObject({ status: 401 });
    expect(unauthorizedCalls).toBeGreaterThanOrEqual(1);
  });
});
