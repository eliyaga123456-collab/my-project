import { expect, test } from "@playwright/test";
import { API, newUser, stamp, visitorSend } from "./helpers";

const H = { "x-requested-with": "unsaid" };

test("visitor sends anonymously via profile and round links; account routes lead to the app install page", async ({ browser, baseURL, request }) => {
  const u = newUser("vis");
  const reg = await request.post(`${API}/api/v1/auth/register`, { headers: H, data: { email: u.email, username: u.username, password: u.password } });
  expect(reg.ok()).toBeTruthy();
  const s = stamp();
  const v = await visitorSend(browser, baseURL, `/u/${u.username}`, `Hello from the web ${s} — anonymous note`);
  await expect(v.page.getByText("Sent anonymously")).toBeVisible({ timeout: 30_000 });
  await expect(v.page.getByRole("link", { name: /app|link/i }).first()).toBeVisible();
  for (const p of ["/signup", "/login", "/inbox", "/settings"]) {
    await v.page.goto(p);
    await expect(v.page).toHaveURL(/\/install$/);
  }
  await expect(v.page.getByTestId("android-download")).toBeVisible();
  await v.ctx.close();
});
