import { expect, test } from "@playwright/test";

const stamp = Date.now().toString(36);
const username = `e2e_${stamp}`.slice(0, 24);
const email = `${username}@example.com`;
const password = "correct-horse-battery";
const text = `Anonymous hello ${stamp}`;

test("register -> link -> anonymous send -> inbox -> report -> delete", async ({ page, browser, baseURL }) => {
  // Register
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await expect(page.getByText(`@${username} is available`)).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create my profile" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
  await expect(page.getByText("No messages yet")).toBeVisible();

  // Copy link
  await page.goto("/links");
  const link = (await page.getByTestId("primary-link").innerText()).trim();
  expect(link).toContain(`/u/${username}`);

  // Anonymous visitor in a fresh context
  const visitor = await browser.newContext({ baseURL });
  const vp = await visitor.newPage();
  await vp.goto(`/u/${username}`);
  await expect(vp.getByRole("heading", { level: 1 })).toBeVisible();
  await vp.getByPlaceholder("Write something...").fill(text);
  await vp.getByRole("button", { name: "Send anonymously" }).click();
  await expect(vp.getByText("Sent anonymously")).toBeVisible({ timeout: 30_000 });
  await visitor.close();

  // Owner sees it
  await page.goto("/inbox");
  const card = page.getByTestId("message-card").filter({ hasText: text });
  await expect(card).toBeVisible();

  // Report
  await card.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Report" }).click();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText(/Report sent/)).toBeVisible();

  // Delete
  await card.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(card).toHaveCount(0);
});
