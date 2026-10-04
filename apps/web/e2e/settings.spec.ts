import { expect, test } from "@playwright/test";
import { newUser, signup, stamp, visitorSend } from "./helpers";

test("settings: hidden words, enhanced moderation, pause link, blocked sources", async ({ page, browser, baseURL }) => {
  const u = await signup(page, newUser("set"));
  const s = stamp();
  await page.goto("/settings");

  const word = `zorp${s}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  await page.getByLabel("Add a hidden word").fill(word);
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("list", { name: "Hidden words" }).getByText(word)).toBeVisible();

  const moderation = page.getByRole("switch", { name: "Enhanced moderation" });
  await expect(moderation).toHaveAttribute("aria-checked", "false");
  await moderation.click();
  await expect(moderation).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Enhanced moderation" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("list", { name: "Hidden words" }).getByText(word)).toBeVisible();

  // hidden word => message never reaches inbox
  const hidden = await visitorSend(browser, baseURL, `/u/${u.username}`, `contains ${word} somewhere ${s}`);
  await expect(hidden.page.getByText("Sent anonymously").or(hidden.page.getByRole("alert"))).toBeVisible({ timeout: 30_000 });
  await hidden.ctx.close();

  // Pause link -> visitor sees paused
  await page.getByRole("switch", { name: "Accepting messages" }).first().click();
  await expect(page.getByRole("switch", { name: "Accepting messages" }).first()).toHaveAttribute("aria-checked", "false");
  const ctx = await browser.newContext({ baseURL });
  const vp = await ctx.newPage();
  await vp.goto(`/u/${u.username}`);
  await expect(vp.getByText(/has paused messages/)).toBeVisible();
  await page.getByRole("switch", { name: "Accepting messages" }).first().click();
  await vp.reload();
  await expect(vp.getByPlaceholder("Write something...")).toBeVisible();

  // Real message -> block sender -> appears under Blocked sources -> unblock
  const body = `blockme ${s}`;
  const v = await visitorSend(browser, baseURL, `/u/${u.username}`, body);
  await expect(v.page.getByText("Sent anonymously")).toBeVisible({ timeout: 30_000 });
  await v.ctx.close();
  await page.goto("/inbox");
  await expect(page.getByTestId("message-card").filter({ hasText: word })).toHaveCount(0);
  const card = page.getByTestId("message-card").filter({ hasText: body });
  await card.getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Block sender" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Block" }).click();
  await expect(card).toHaveCount(0);
  await page.goto("/settings");
  const blocked = page;
  await expect(blocked.getByRole("button", { name: /Unblock/ })).toHaveCount(1);
  await blocked.getByRole("button", { name: /Unblock/ }).click();
  await expect(page.getByText("No one is blocked")).toBeVisible();
  await ctx.close();
});
