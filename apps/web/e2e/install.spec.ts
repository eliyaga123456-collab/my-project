import { expect, test } from "@playwright/test";

const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

test("install page: iOS steps, QR, share buttons", async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, userAgent: IPHONE_UA, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/install");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Install on iPhone/ })).toBeVisible();
  await expect(page.getByText(/iPhone app is coming soon/)).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  await expect(page.getByTestId("install-link")).toContainText("/install");
  const share = page.locator("section", { hasText: "Send the install link" });
  await expect(share.getByRole("button").or(share.getByRole("link")).first()).toBeVisible();
  expect(await share.getByRole("button").or(share.getByRole("link")).count()).toBeGreaterThanOrEqual(2);
  await ctx.close();
});

test("manifest, service worker and offline page", async ({ page, request }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.name).toBeTruthy();
  expect(m.start_url).toBeTruthy();
  expect(m.display).toBe("standalone");
  const sizes = m.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? "any"}`);
  expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
  const sw = await request.get("/sw.js");
  expect(sw.status()).toBe(200);
  expect(sw.headers()["content-type"]).toMatch(/javascript/);
  await page.goto("/offline");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
