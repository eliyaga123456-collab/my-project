import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Expects admin on :3100 (proxying /api/v1 to the API on :4000). Nothing is started here.
const candidates = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"];
const executablePath = candidates.find((p): p is string => !!p && existsSync(p));

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.ADMIN_URL ?? "http://localhost:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath, args: ["--no-sandbox"] } } }]
});
