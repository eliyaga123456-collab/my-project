import { expect, test } from "@playwright/test";
import { newUser, outboxLink, signup } from "./helpers";

test("login with wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("eliya@example.com");
  await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-pass");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("client-side validation messages", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
});

test("forgot -> reset password via outbox -> login with new password", async ({ page, request, context }) => {
  const u = newUser("pw");
  await signup(page, u);
  await context.clearCookies();
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(u.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  const link = await outboxLink(request, u.email, /reset/i);
  await page.goto(link);
  const next = "brand-new-password-42";
  await page.getByLabel("New password", { exact: true }).fill(next);
  await page.getByLabel("Confirm new password").fill(next);
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText("Password updated")).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Password", { exact: true }).fill(next);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/inbox/);
  // reused token fails
  await context.clearCookies();
  await page.goto(link);
  await page.getByLabel("New password", { exact: true }).fill("another-password-99");
  await page.getByLabel("Confirm new password").fill("another-password-99");
  await page.getByRole("button", { name: "Set new password" }).click();
  await expect(page.getByText(/invalid or has expired/)).toBeVisible();
});

test("verify banner shown until verified, resend works; invalid token page", async ({ page }) => {
  await signup(page, newUser("vb"));
  const banner = page.getByRole("region", { name: "Email verification" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Resend verification email" }).click();
  await expect(page.getByText("Verification email sent. Check your inbox.")).toBeVisible();
  await page.goto("/verify-email?token=bogus-token-value");
  await expect(page.getByText("This link is invalid or has expired")).toBeVisible();
});

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/login/);
});
