import { expect, test } from "@playwright/test";
import { API, newUser, stamp } from "./helpers";

const H = { "x-requested-with": "unsaid" };

test("language switcher flips the landing page to Hebrew + RTL and persists", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("really think");

  await page.getByRole("group", { name: "Switch language" }).getByRole("button", { name: "עברית" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("באמת חושבים");
  // the wordmark stays Latin
  await expect(page.getByText("EAR", { exact: false }).first()).toBeVisible();

  // the cookie persists the choice across navigations
  await page.goto("/about");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("על");
});

test("visitor can send an anonymous message in Hebrew", async ({ browser, baseURL, request }) => {
  const u = newUser("heb");
  const reg = await request.post(`${API}/api/v1/auth/register`, { headers: H, data: { email: u.email, username: u.username, password: u.password } });
  expect(reg.ok()).toBeTruthy();
  const ctx = await browser.newContext({ baseURL, locale: "he-IL" });
  const page = await ctx.newPage();
  await page.goto(`/u/${u.username}`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); // Accept-Language alone is enough
  await page.getByPlaceholder("כתבו משהו...").fill(`שלום מהאתר ${stamp()} — הודעה אנונימית`);
  await page.getByRole("button", { name: "שליחה אנונימית" }).click();
  await expect(page.getByText("נשלח באופן אנונימי")).toBeVisible({ timeout: 30_000 });
  await ctx.close();
});
