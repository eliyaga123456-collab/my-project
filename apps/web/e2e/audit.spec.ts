import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { newUser, outboxLink, signup, stamp, visitorSend } from "./helpers";

// Heavy responsive + a11y audit. Run with: AUDIT=1 npx playwright test audit
test.skip(!process.env.AUDIT, "set AUDIT=1 to run the responsive/a11y audit");

const WIDTHS = (process.env.AUDIT_WIDTHS ?? "320,375,390,430,768,1024,1280,1440,1920").split(",").map(Number);
const SHOTS = process.env.AUDIT_SHOTS !== "0";
const H = { "x-requested-with": "unsaid" };

type PageDef = { name: string; path: string; auth: boolean };

test("responsive + a11y audit", async ({ browser, baseURL, request }) => {
  test.setTimeout(3_600_000);
  mkdirSync(".screenshots", { recursive: true });

  // ---- seed
  const ownerCtx = await browser.newContext({ baseURL });
  const owner = await ownerCtx.newPage();
  const u = await signup(owner, newUser("aud"));
  await owner.goto(await outboxLink(request, u.email, /confirm your ear email/i));
  await expect(owner.getByText("Email verified")).toBeVisible();
  const s = stamp();
  const created = await (await owner.request.post("/api/v1/links", { headers: H, data: { label: `Friday dinner ideas ${s}`, prompt: "What should I cook on Friday? Be brutally honest and specific please", closesAt: new Date(Date.now() + 86_400_000).toISOString() } })).json();
  const roundPath = new URL(created.url, "http://x").pathname;
  for (const [i, path] of [`/u/${u.username}`, roundPath, `/u/${u.username}`].entries()) {
    const v = await visitorSend(browser, baseURL, path, `Audit message ${i} ${s} — a reasonably long anonymous note to check wrapping: ${"supercalifragilistic".repeat(2)} done.`);
    await expect(v.page.getByText("Sent anonymously")).toBeVisible({ timeout: 30_000 });
    await v.ctx.close();
  }
  const msgs = await (await owner.request.get("/api/v1/messages?status=inbox&limit=5", { headers: H })).json();
  const rep = await (await owner.request.post(`/api/v1/messages/${msgs.items[0].id}/reply`, { headers: H, data: { text: "Thanks, here is my public answer.", public: true } })).json();
  const answerPath = `/a/${rep.reply.answerId}`;

  const pages: PageDef[] = [
    { name: "landing", path: "/", auth: false },
    { name: "signup", path: "/signup", auth: false },
    { name: "login", path: "/login", auth: false },
    { name: "profile", path: `/u/${u.username}`, auth: false },
    { name: "round", path: roundPath, auth: false },
    { name: "answer", path: answerPath, auth: false },
    { name: "install", path: "/install", auth: false },
    { name: "inbox", path: "/inbox", auth: true },
    { name: "inbox-round", path: `/inbox?round=${created.id}`, auth: true },
    { name: "rounds", path: "/links", auth: true },
    { name: "settings", path: "/settings", auth: true },
    { name: "analytics", path: "/analytics", auth: true },
    { name: "notifications", path: "/notifications", auth: true }
  ];
  const only = process.env.AUDIT_PAGES?.split(",");
  const problems: string[] = [];
  const axeSeen = new Set<string>();

  for (const scheme of ["dark", "light"] as const) {
    for (const w of WIDTHS) {
      const ctx = await browser.newContext({ baseURL, colorScheme: scheme, viewport: { width: w, height: 900 }, storageState: await ownerCtx.storageState() });
      for (const pd of pages) {
        if (only && !only.includes(pd.name)) continue;
        const page = await ctx.newPage();
        // anonymous pages: no cookies matter
        await page.goto(pd.path, { waitUntil: "networkidle" }).catch(() => undefined);
        await page.waitForTimeout(500);
        const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        if (overflow.sw > overflow.iw) problems.push(`H-SCROLL ${pd.name} ${scheme} ${w}: ${overflow.sw} > ${overflow.iw}`);
        const small = await smallTargets(page);
        for (const t of small) problems.push(`TAP<44 ${pd.name} ${scheme} ${w}: ${t}`);
        if (SHOTS) await page.screenshot({ path: `.screenshots/${pd.name}-${scheme}-${w}.png`, fullPage: true });
        if (w === WIDTHS[0] || w === 1280 || w === 390) {
          const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          for (const v of r.violations) {
            const key = `${pd.name}|${scheme}|${v.id}`;
            if (axeSeen.has(key)) continue;
            axeSeen.add(key);
            problems.push(`AXE ${v.impact} ${pd.name} ${scheme} ${w}: ${v.id} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " " + (n.any[0]?.message ?? "")).join(" | ")}`);
          }
        }
        await page.close();
      }
      await ctx.close();
    }
  }
  console.log("AUDIT PROBLEMS (" + problems.length + ")\n" + problems.join("\n"));
  expect(problems.filter((p) => p.startsWith("H-SCROLL") || /AXE (serious|critical)/.test(p))).toEqual([]);
});

async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll<HTMLElement>("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=tab]");
    for (const el of els) {
      if (el.closest("nextjs-portal, [data-nextjs-toast]") || el.getAttribute("aria-hidden") === "true") continue;
      if (el.classList.contains("sr-only") || el.closest(".sr-only")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // inline text links inside paragraphs are exempt (WCAG 2.5.8 inline exception)
      const inline = el.tagName === "A" && getComputedStyle(el).display === "inline";
      if (inline) continue;
      if (r.width < 44 || r.height < 44) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return Array.from(new Set(out)).slice(0, 8);
  });
}
