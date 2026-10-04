import { test } from "@playwright/test";
import { newUser, signup } from "./helpers";
test("probe", async ({ page, browser, baseURL }) => {
  const u = await signup(page, newUser("prb"));
  await page.goto("/links");
  await page.getByLabel("Round name").fill("probe round");
  await page.getByRole("button", { name: /Create round/ }).click();
  await page.getByText("Round started").waitFor();
  const ctx = await browser.newContext({ baseURL });
  const vp = await ctx.newPage();
  await vp.goto(`/u/${u.username}`);
  console.log(await vp.locator("main").innerText());
});
