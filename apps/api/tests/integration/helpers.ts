import { createHash } from "node:crypto";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { buildApp } from "../../src/app";
import { loadConfig } from "../../src/config";
import type { AppContext } from "../../src/context";
import { hashPassword } from "../../src/lib/crypto";
import { users, profiles, settings, links } from "../../src/db/schema";
import { generateSlug } from "../../src/services/slug";

export interface TestApp { app: FastifyInstance; ctx: AppContext; close(): Promise<void>; reset(): Promise<void> }

export async function createTestApp(env: Record<string, string> = {}): Promise<TestApp> {
  const config = loadConfig({ ...process.env, RATE_LIMIT_DISABLED: "true", ...env } as NodeJS.ProcessEnv);
  const { app, ctx } = await buildApp({ config, logger: false, maintenance: false });
  await app.ready();
  const reset = async () => {
    await ctx.pool.query(`TRUNCATE users, email_outbox, moderation_events, audit_logs, banned_sources RESTART IDENTITY CASCADE`);
    (ctx.rl as { reset?: () => void }).reset?.();
  };
  await reset();
  return { app, ctx, reset, close: () => app.close() };
}

export const H = { "x-requested-with": "unsaid", "content-type": "application/json" } as const;

export function cookieOf(res: LightMyRequestResponse, name = "unsaid_session"): string | null {
  const c = res.cookies.find((x) => x.name === name);
  return c ? `${name}=${c.value}` : null;
}
export const json = <T = any>(res: LightMyRequestResponse): T => res.json() as T;

let n = 0;
export async function register(t: TestApp, over: Partial<{ username: string; email: string; password: string; displayName: string }> = {}) {
  n++;
  const body = { username: over.username ?? `user${n}x`, email: over.email ?? `user${n}x@example.com`, password: over.password ?? "correct horse battery", displayName: over.displayName };
  const res = await t.app.inject({ method: "POST", url: "/api/v1/auth/register", headers: H, payload: body });
  if (res.statusCode !== 201) throw new Error(`register failed ${res.statusCode} ${res.body}`);
  return { ...body, cookie: cookieOf(res)!, id: json(res).user.id as string, res };
}

export async function verifyEmail(t: TestApp, email: string) {
  const r = await t.ctx.pool.query("select body_text from email_outbox where to_email=$1 and subject like 'Confirm%' order by created_at desc limit 1", [email]);
  const token = /token=([\w-]+)/.exec(r.rows[0].body_text)![1]!;
  const res = await t.app.inject({ method: "POST", url: "/api/v1/auth/verify-email", headers: H, payload: { token } });
  if (res.statusCode !== 204) throw new Error("verify failed " + res.body);
}

export async function makeAdmin(t: TestApp, role: "admin" | "moderator" = "admin") {
  n++;
  const email = `${role}${n}@example.com`;
  const password = "admin password long";
  const [u] = await t.ctx.db.insert(users).values({ email, username: `${role}${n}x`, passwordHash: await hashPassword(password), role, emailVerifiedAt: new Date() }).returning();
  await t.ctx.db.insert(profiles).values({ userId: u!.id, displayName: role });
  await t.ctx.db.insert(settings).values({ userId: u!.id, notifications: { inAppNewMessage: true, pushNewMessage: true, emailNewMessage: false, emailDigest: false, pushActivity: true, emailSafety: true } });
  await t.ctx.db.insert(links).values({ userId: u!.id, slug: generateSlug(), label: "My link", isPrimary: true });
  const res = await t.app.inject({ method: "POST", url: "/api/v1/auth/login", headers: H, payload: { email, password } });
  return { id: u!.id, email, cookie: cookieOf(res)! };
}

export const api = (t: TestApp, method: string, url: string, opts: { cookie?: string | null; body?: unknown; ip?: string; headers?: Record<string, string>; query?: Record<string, string> } = {}) =>
  t.app.inject({
    method: method as "GET", url: `/api/v1${url}`, query: opts.query,
    headers: { ...(method === "GET" ? { "x-requested-with": "unsaid" } : H), ...(opts.cookie ? { cookie: opts.cookie } : {}), ...opts.headers },
    payload: opts.body === undefined ? undefined : (JSON.stringify(opts.body) as string),
    remoteAddress: opts.ip ?? "203.0.113.10"
  });

export async function send(t: TestApp, username: string, body: string, ip = "198.51.100.7", extra: Record<string, unknown> = {}, cookie?: string) {
  return api(t, "POST", "/messages", { body: { username, body, ...extra }, ip, cookie });
}

export function solvePow(c: { id: string; prefix: string; difficulty: number }) {
  for (let i = 0; ; i++) {
    const nonce = i.toString(36);
    const h = createHash("sha256").update(c.prefix + nonce).digest();
    let bits = 0;
    for (const b of h) { if (b === 0) { bits += 8; continue; } bits += Math.clz32(b) - 24; break; }
    if (bits >= c.difficulty) return { id: c.id, nonce };
  }
}

export function multipart(name: string, filename: string, contentType: string, data: Buffer) {
  const boundary = "----unsaidtest" + Math.random().toString(16).slice(2);
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { payload: Buffer.concat([head, data, tail]), headers: { "content-type": `multipart/form-data; boundary=${boundary}`, "x-requested-with": "unsaid" } };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export async function waitFor<T>(fn: () => Promise<T | null | undefined | false>, ms = 3000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("waitFor timed out");
    await sleep(25);
  }
}
/** Register a verified user (so public answers are allowed). */
export async function verifiedUser(t: TestApp, username: string) {
  const u = await register(t, { username, email: `${username}@example.com` });
  await verifyEmail(t, u.email);
  return u;
}
export async function inbox(t: TestApp, cookie: string, status = "inbox", query: Record<string, string> = {}) {
  return json<{ items: any[]; nextCursor: string | null }>(await api(t, "GET", "/messages", { cookie, query: { status, ...query } }));
}
