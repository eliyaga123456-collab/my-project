import { expect, type APIRequestContext, type Browser, type Page } from "@playwright/test";

export const API = process.env.API_URL ?? "http://localhost:4000";
export const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
export const PASSWORD = "correct-horse-battery";

export function newUser(prefix = "e2e") {
  const s = stamp();
  const username = `${prefix}_${s}`.slice(0, 24);
  return { username, email: `${username}@example.com`, password: PASSWORD, stamp: s };
}

/** Accounts exist only in the mobile app; e2e seeds one through the API (cookie lands on the page's context). */
export async function signup(page: Page, u = newUser()) {
  const r = await page.request.post("/api/v1/auth/register", { headers: { "x-requested-with": "unsaid" }, data: { email: u.email, username: u.username, password: u.password } });
  expect(r.ok()).toBeTruthy();
  return u;
}

/** Poll the dev outbox for the newest mail to `email` whose subject matches, and return the first http link in it. */
export async function outboxLink(request: APIRequestContext, email: string, subject: RegExp): Promise<string> {
  let link = "";
  await expect.poll(async () => {
    const r = await request.get(`${API}/api/v1/dev/outbox`, { params: { to: email } });
    const items = ((await r.json()).items ?? []) as { subject: string; body_text: string; created_at: string }[];
    const m = items.filter((i) => subject.test(i.subject)).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    link = m?.body_text.match(/https?:\/\/\S+/)?.[0] ?? "";
    return link;
  }, { timeout: 15_000 }).not.toBe("");
  // The mail points at the configured site URL; rewrite onto the tested origin.
  const u = new URL(link);
  return u.pathname + u.search;
}

export async function visitorSend(browser: Browser, baseURL: string | undefined, path: string, body: string) {
  const ctx = await browser.newContext({ baseURL });
  const p = await ctx.newPage();
  await p.goto(path);
  await p.getByPlaceholder("Write something...").fill(body);
  await p.getByRole("button", { name: "Send anonymously" }).click();
  return { ctx, page: p };
}
