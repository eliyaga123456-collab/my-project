import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:5432/unsaid_test",
      APP_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
      POW_DIFFICULTY: "8",
      EMAIL_TRANSPORT: "outbox",
      MEDIA_DIR: ".data/test-media",
      TRUST_PROXY: "false"
    },
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000
  }
});
