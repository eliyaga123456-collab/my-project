import { expect, test } from "@playwright/test";
import { newUser, outboxLink, signup, stamp, visitorSend } from "./helpers";

test("register -> verify email -> link -> anonymous send -> inbox -> report -> delete", async ({ page, browser, baseURL, request }) => {
  const u = newUser();
  const text = `Anonymous hello ${stamp()}`;
  await signup(page, u);
  await expect(page.getByText("No messages yet")).toBeVisible();

  // Verify banner then verify via the outbox link
  await expect(page.getByRole("region", { name: "Email verification" })).toBeVisible();
  const verify = await outboxLink(request, u.email, /confirm your ear email/i);
  await page.goto(verify);
  await expect(page.getByText("Email verified")).toBeVisible();
  await page.goto("/inbox");
  await expect(page.getByRole("region", { name: "Email verification" })).toHaveCount(0);

  await page.goto("/links");
  const link = (await page.getByTestId("primary-link").innerText()).trim();
  expect(link).toContain(`/u/${u.username}`);

  const { ctx, page: vp } = await visitorSend(browser, baseURL, `/u/${u.username}`, text);
  await expect(vp.getByText("Sent anonymously")).toBeVisible({ timeout: 30_000 });
  await ctx.close();

  await page.goto("/inbox");
  const card = page.getByTestId("message-card").filter({ hasText: text });
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Report" }).click();
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByText(/Report sent/)).toBeVisible();

  await card.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(card).toHaveCount(0);
});
