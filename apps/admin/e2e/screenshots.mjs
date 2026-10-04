// Run: node e2e/screenshots.mjs  (admin dev on :3100, API on :4000). Writes .screenshots/<page>-<w>-<theme>.png
import { chromium } from "@playwright/test";
const base = process.env.ADMIN_URL ?? "http://localhost:3100";
const exe = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
const ctx0 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p0 = await ctx0.newPage();
await p0.goto(base);
await p0.getByLabel("Email").fill("admin@ear.local");
await p0.getByLabel("Password").fill("change-me-please-123");
await p0.getByRole("button", { name: "Sign in" }).click();
await p0.getByRole("heading", { name: "Overview" }).waitFor();
const state = await ctx0.storageState();
await ctx0.close();
const pages = ["/", "/users", "/reports", "/moderation", "/abuse", "/audit", "/health"];
for (const w of [1440, 390]) for (const theme of ["dark", "light"]) {
  const ctx = await browser.newContext({ storageState: state, viewport: { width: w, height: w === 390 ? 844 : 900 }, colorScheme: theme });
  await ctx.addInitScript((t) => localStorage.setItem("unsaid-admin-theme", t), theme);
  const page = await ctx.newPage();
  const overflow = [];
  for (const path of pages) {
    await page.goto(base + path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ov > 0) overflow.push(`${path}:${ov}`);
    await page.screenshot({ path: `.screenshots/${path === "/" ? "overview" : path.slice(1)}-${w}-${theme}.png`, fullPage: true });
  }
  console.log(w, theme, "horizontal overflow:", overflow.join(",") || "none");
  await ctx.close();
}
await browser.close();
