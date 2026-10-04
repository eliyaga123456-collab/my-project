import { expect, test } from "@playwright/test";
import { newUser, signup, stamp, visitorSend } from "./helpers";

test("rounds: create -> visitor sends -> filter inbox -> pause -> closed -> reopen", async ({ page, browser, baseURL }) => {
  const u = await signup(page, newUser("rnd"));
  const s = stamp();
  const name = `Dinner ${s}`;
  const question = `What should I cook ${s}?`;
  await page.goto("/links");
  await page.getByLabel("Round name").fill(name);
  await page.getByLabel("Your question (optional)").fill(question);
  await page.getByRole("radio", { name: "24 hours" }).click();
  await page.getByRole("button", { name: /Create round/ }).click();
  await expect(page.getByText("Round started")).toBeVisible();
  const item = page.getByRole("listitem").filter({ hasText: name });
  const url = (await item.locator("p.font-mono").innerText()).trim();
  const path = new URL(url, "http://x").pathname;
  expect(path).toMatch(/^\/l\//);

  const body = `Round answer ${s}`;
  const { ctx, page: vp } = await visitorSend(browser, baseURL, path, body);
  await expect(vp.getByText("Sent anonymously")).toBeVisible({ timeout: 30_000 });
  await vp.goto(path);
  await expect(vp.getByRole("heading", { name: question })).toBeVisible();
  await expect(vp.getByText(/Anonymous round/)).toBeVisible();

  // Also send to the main link so the filter has something to exclude
  const other = `Main link ${s}`;
  const v2 = await visitorSend(browser, baseURL, `/u/${u.username}`, other);
  await expect(v2.page.getByText("Sent anonymously")).toBeVisible({ timeout: 30_000 });
  await v2.ctx.close();

  await page.goto("/inbox");
  await expect(page.getByTestId("message-card").filter({ hasText: other })).toBeVisible();
  const chip = page.getByRole("button", { name: name, exact: true });
  await chip.focus();
  await page.keyboard.press("Enter");
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("message-card").filter({ hasText: body })).toBeVisible();
  await expect(page.getByTestId("message-card").filter({ hasText: other })).toHaveCount(0);
  await page.getByRole("button", { name: "All messages" }).click();
  await expect(page.getByTestId("message-card").filter({ hasText: other })).toBeVisible();

  // Pause -> visitor sees closed/paused state
  await page.goto("/links");
  await item.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("Round paused")).toBeVisible();
  await vp.goto(path);
  await expect(vp.getByText(/has paused messages|This round has closed/)).toBeVisible();

  // Resume works
  await item.getByRole("button", { name: "Resume" }).click();
  await expect(item.getByText("Open", { exact: true })).toBeVisible();

  await ctx.close();
});

test("rounds: closed round shows 'This round has closed' and can be reopened", async ({ page, browser, baseURL }) => {
  await signup(page, newUser("cls"));
  const s = stamp();
  const name = `Closing ${s}`;
  await page.goto("/links");
  await page.getByLabel("Round name").fill(name);
  await page.getByRole("radio", { name: "1 hour" }).click();
  await page.getByRole("button", { name: /Create round/ }).click();
  const item = page.getByRole("listitem").filter({ hasText: name });
  const path = new URL((await item.locator("p.font-mono").innerText()).trim(), "http://x").pathname;

  // The API accepts any ISO timestamp, so back-date the closing time to simulate the timer elapsing.
  const headers = { "x-requested-with": "unsaid" };
  const list = await (await page.request.get("/api/v1/links", { headers })).json();
  const round = list.items.find((l: { label: string }) => l.label === name);
  const res = await page.request.patch(`/api/v1/links/${round.id}`, { headers, data: { closesAt: new Date(Date.now() - 60_000).toISOString() } });
  expect(res.ok()).toBeTruthy();

  const ctx = await browser.newContext({ baseURL });
  const vp = await ctx.newPage();
  await vp.goto(path);
  await expect(vp.getByRole("heading", { name: "This round has closed" })).toBeVisible();
  await expect(vp.getByText("Round closed")).toBeVisible();

  await page.goto("/links");
  await expect(item.getByText("Closed", { exact: true }).first()).toBeVisible();
  await item.getByRole("button", { name: /Reopen 24h/ }).click();
  await expect(page.getByText(/Round reopened/)).toBeVisible();
  await vp.goto(path);
  await expect(vp.getByPlaceholder("Write something...")).toBeVisible();
  await ctx.close();
});
