import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Expects web on :3000 and api on :4000 (nothing is started here).
const candidates = [process.env.CHROMIUM_PATH, "/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"];
const executablePath = candidates.find((p): p is string => !!p && existsSync(p));

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.WEB_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath, args: ["--no-sandbox"] } }
    }
  ]
});
