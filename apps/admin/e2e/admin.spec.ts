import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

const API = process.env.API_URL ?? "http://localhost:4000/api/v1";
const ADMIN = { email: "admin@ear.local", password: "change-me-please-123" };
const run = Date.now().toString(36);
let ipN = 0;
const ip = () => `10.77.${(Date.now() >> 4) % 250}.${++ipN % 250}`;

async function api(method: string, path: string, body?: unknown, token?: string) {
  const r = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", "x-requested-with": "unsaid", "x-client": "mobile", "x-forwarded-for": ip(), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: r.status, json: (await r.json().catch(() => null)) as any };
}
let regN = 0;
async function register(tag: string) {
  const username = `${tag}${regN++}_${run}`.slice(0, 24);
  const email = `${username}@example.com`;
  const password = "e2e-password-123";
  const r = await api("POST", "/auth/register", { email, password, username });
  expect(r.status).toBe(201);
  return { username, email, password, id: r.json.user?.id as string, token: r.json.token as string };
}
async function login(page: Page, email: string, password: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
async function loginOk(page: Page, email: string, password: string) {
  await login(page, email, password);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}
function psql(sql: string) {
  execFileSync("psql", ["-U", "postgres", "-h", "localhost", "unsaid", "-c", sql], { stdio: "pipe" });
}

test.describe.configure({ mode: "serial" });
let target: Awaited<ReturnType<typeof register>>;
let mod: Awaited<ReturnType<typeof register>>;
let plain: Awaited<ReturnType<typeof register>>;

test.beforeAll(async () => {
  // the dev API restarts on file changes; wait until it answers
  for (let i = 0; i < 30; i++) { try { if ((await fetch(API + "/public/challenge")).ok) break; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 1000)); }
  target = await register("e2etarget");
  mod = await register("e2emod");
  plain = await register("e2eplain");
  psql(`update users set role='moderator', email_verified_at=now() where email='${mod.email}'`);
});

test("non-admin sign-in shows 'Not authorised' and stays signed out", async ({ page }) => {
  await login(page, plain.email, plain.password);
  await expect(page.getByText("Not authorised")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("wrong password shows an error", async ({ page }) => {
  await login(page, ADMIN.email, "definitely-wrong-password");
  await expect(page.getByRole("alert")).toBeVisible();
});

test("admin: overview shows percentages and every page loads", async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Report rate").locator("..")).toContainText("%");
  for (const [link, heading] of [["Users", "Users"], ["Reports", "Reports"], ["Moderation", "Moderation"], ["Abuse", "Abuse detection"], ["Audit log", "Audit log"], ["System health", "System health"]] as const) {
    await page.getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
});

async function openUser(page: Page, username: string) {
  await page.goto("/users");
  await page.getByPlaceholder("Username, email or id").fill(username);
  await page.getByRole("row", { name: new RegExp(`@${username}`) }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function act(page: Page, button: string) {
  await page.getByRole("dialog").getByRole("button", { name: button, exact: true }).click();
  await page.getByRole("dialog").last().getByRole("button", { name: button, exact: true }).click();
}

test("admin: suspend, unsuspend, ban, unban a user", async ({ page }) => {
  await loginOk(page, ADMIN.email, ADMIN.password);
  await openUser(page, target.username);
  await act(page, "Suspend");
  await expect(page.getByText("User suspended")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Unsuspend" })).toBeVisible();
  await act(page, "Unsuspend");
  await expect(page.getByText("User unsuspended")).toBeVisible();
  await act(page, "Ban");
  await expect(page.getByText("User banned")).toBeVisible();
  await act(page, "Unban");
  await expect(page.getByText("User unbanned")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Suspend" })).toBeVisible();
});

test("admin: status filter and search", async ({ page }) => {
  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/users");
  await page.getByLabel("Status").selectOption("active");
  await expect(page.getByRole("row", { name: new RegExp(`@${target.username}`) })).toBeVisible();
  await page.getByLabel("Status").selectOption("banned");
  await expect(page.getByRole("row", { name: new RegExp(`@${target.username}`) })).toHaveCount(0);
});

test("moderator: can suspend but not ban/unban; no Ban source on reports", async ({ page }) => {
  await loginOk(page, mod.email, mod.password);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await openUser(page, target.username);
  await expect(page.getByRole("dialog").getByRole("button", { name: "Suspend" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Ban" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ban source" })).toHaveCount(0);
});

async function createReport(): Promise<string> {
  // an anonymous sender writes to target, the owner reports it
  const owner = await register("e2eowner");
  const body = `e2e report body ${run} ${Math.random().toString(36).slice(2)}`;
  let r = await api("POST", "/messages", { username: owner.username, body });
  if (r.status === 428) {
    const { createHash } = await import("node:crypto");
    const c = r.json.error.details?.challenge ?? (await api("GET", "/public/challenge")).json;
    const lz = (h: Buffer) => { let b = 0; for (const x of h) { if (x === 0) { b += 8; continue; } b += Math.clz32(x) - 24; break; } return b; };
    let n = 0;
    while (lz(createHash("sha256").update(c.prefix + n.toString(36)).digest()) < c.difficulty) n++;
    r = await api("POST", "/messages", { username: owner.username, body, challenge: { id: c.id, nonce: n.toString(36) } });
  }
  expect(r.status).toBe(201);
  const list = await api("GET", "/messages?status=inbox", undefined, owner.token);
  const msg = list.json.items.find((m: any) => m.body === body);
  expect(msg).toBeTruthy();
  expect((await api("POST", `/messages/${msg.id}/report`, { reason: "harassment" }, owner.token)).status).toBe(201);

  return body;
}

test("admin: report actions explain they act on the anonymous source", async ({ page }) => {
  const body = await createReport();
  await loginOk(page, ADMIN.email, ADMIN.password);
  await page.goto("/reports");
  const card = page.locator("article", { hasText: body });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Ban source" }).click();
  await expect(page.getByRole("dialog")).toContainText("anonymous source");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  await card.getByRole("button", { name: "Ban source" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ban source" }).click();
  await expect(page.getByText("Source banned")).toBeVisible();
  await expect(card).toHaveCount(0);
  await page.getByRole("tab", { name: "Resolved" }).click();
  await expect(page.locator("article", { hasText: body })).toBeVisible();
});

// ---------------------------------------------------------------- Hebrew / RTL
import { mkdirSync } from "node:fs";
const shotDir = process.env.SHOTS_DIR ?? new URL("../.screenshots", import.meta.url).pathname;
async function noHorizontalOverflow(page: Page) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(o.sw, `scrollWidth ${o.sw} vs clientWidth ${o.cw}`).toBeLessThanOrEqual(o.cw + 1);
}

test("hebrew: login switcher, RTL, headings, overflow, dialogs, screenshots", async ({ page }) => {
  await createReport();
  mkdirSync(shotDir, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.getByRole("button", { name: "עברית" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.getByRole("heading", { name: "התחברות" })).toBeVisible();
  await page.screenshot({ path: `${shotDir}/he-login-1440.png` });
  await page.getByLabel("אימייל").fill(ADMIN.email);
  await page.getByLabel("סיסמה").fill(ADMIN.password);
  await page.getByRole("button", { name: "התחברות" }).click();
  await expect(page.getByRole("heading", { name: "סקירה כללית" })).toBeVisible();
  await expect(page.getByText("שיעור דיווחים").locator("..")).toContainText("%");

  // sidebar is on the right in RTL (desktop)
  const box = await page.locator("#sidebar").boundingBox();
  expect(box!.x + box!.width).toBeGreaterThan(1440 - 2);
  // the chart time axis stays LTR
  await expect(page.locator(".chart-box")).toHaveAttribute("dir", "ltr");
  await page.screenshot({ path: `${shotDir}/he-overview-1440.png`, fullPage: true });
  await noHorizontalOverflow(page);

  for (const [link, heading] of [["משתמשים", "משתמשים"], ["דיווחים", "דיווחים"], ["מודרציה", "אירועי מודרציה"], ["ניצול לרעה", "זיהוי ניצול לרעה"], ["יומן ביקורת", "יומן ביקורת"], ["תקינות המערכת", "תקינות המערכת"]] as const) {
    await page.getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await noHorizontalOverflow(page);
  }
  await page.screenshot({ path: `${shotDir}/he-health-1440.png`, fullPage: true });

  // users table + drawer + confirm dialog
  await page.getByRole("link", { name: "משתמשים" }).click();
  await page.getByPlaceholder("שם משתמש, אימייל או מזהה").fill(target.username);
  await page.getByRole("row", { name: new RegExp(`@${target.username}`) }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("פעיל");
  await page.screenshot({ path: `${shotDir}/he-user-drawer-1440.png` });
  const drawer = await page.locator(".modal-drawer").boundingBox();
  expect(drawer!.x).toBeLessThan(5); // drawer opens on the physical left in RTL (inline-end)
  await page.getByRole("dialog").getByRole("button", { name: "השעיה", exact: true }).click();
  await expect(page.getByRole("dialog").last()).toContainText("@" + target.username);
  await page.screenshot({ path: `${shotDir}/he-confirm-1440.png` });
  await page.getByRole("dialog").last().getByRole("button", { name: "ביטול" }).click();
  await page.keyboard.press("Escape");

  // report dialog copy
  await page.getByRole("link", { name: "דיווחים" }).click();
  await page.screenshot({ path: `${shotDir}/he-reports-1440.png`, fullPage: true });
  const ban = page.getByRole("button", { name: "חסימת מקור" }).first();
  {
    await expect(ban).toBeVisible();
    await expect(page.getByRole("button", { name: "השעיית מקור (7 ימים)" }).first()).toBeVisible();
    await ban.click();
    await expect(page.getByRole("dialog")).toContainText("המקור האנונימי");
    await expect(page.getByRole("dialog")).toContainText("בכל הפלטפורמה");
    await page.screenshot({ path: `${shotDir}/he-report-dialog-1440.png` });
    await page.getByRole("dialog").getByRole("button", { name: "ביטול" }).click();
  }

  // mobile
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/users", "/reports", "/moderation", "/abuse", "/audit", "/health"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await noHorizontalOverflow(page);
  }
  await page.goto("/users");
  await page.getByRole("button", { name: "פתיחת התפריט" }).click();
  const sb = await page.locator("#sidebar").boundingBox();
  expect(sb!.x + sb!.width).toBeGreaterThan(390 - 2); // slides in from the right
  await page.screenshot({ path: `${shotDir}/he-sidebar-390.png` });
  await page.getByRole("button", { name: "סגירת התפריט" }).last().click();
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${shotDir}/he-overview-390.png`, fullPage: true });
  await page.goto("/users");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${shotDir}/he-users-390.png`, fullPage: true });
});

test("hebrew: choice persists, API errors come back in Hebrew, switch back to English", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("ear-admin-locale", "he"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByLabel("אימייל").fill(ADMIN.email);
  await page.getByLabel("סיסמה").fill("definitely-wrong-password");
  await page.getByRole("button", { name: "התחברות" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/[֐-׿]/);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.screenshot({ path: `${shotDir}/en-login-after-switch.png` });
});
