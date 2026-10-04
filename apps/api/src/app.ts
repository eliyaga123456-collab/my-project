import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { loadConfig, type Config } from "./config";
import type { AppContext } from "./context";
import { createDb } from "./db/client";
import { MemoryRateLimitStore, type RateLimitStore } from "./lib/ratelimit";
import { registerCore } from "./plugins/core";
import { registerRoutes } from "./routes";
import { AdminService } from "./services/admin";
import { AuthService } from "./services/auth";
import { createEmailTransport, type EmailTransport } from "./services/email";
import { MessageService } from "./services/messages";
import { NotificationService } from "./services/notifications";
import { ProfileService } from "./services/profiles";
import { SettingsService } from "./services/settings";
import { createStorage, type StorageProvider } from "./services/storage";
import { startMaintenance } from "./services/maintenance";

export interface BuildOptions {
  config?: Config;
  rateLimitStore?: RateLimitStore;
  email?: EmailTransport;
  storage?: StorageProvider;
  logger?: boolean;
  maintenance?: boolean;
}

export async function buildApp(opts: BuildOptions = {}): Promise<{ app: FastifyInstance; ctx: AppContext }> {
  const config = opts.config ?? loadConfig();
  const { db, pool } = createDb(config.DATABASE_URL);
  const app = Fastify({
    logger: opts.logger === false ? false : { level: config.LOG_LEVEL, redact: ["req.headers.authorization", "req.headers.cookie"] },
    trustProxy: config.TRUST_PROXY,
    genReqId: () => randomUUID(),
    bodyLimit: 64 * 1024,
    disableRequestLogging: config.NODE_ENV === "test"
  });

  const email = opts.email ?? createEmailTransport(config, db);
  const ctx = {
    config, db, pool, email,
    rl: opts.rateLimitStore ?? new MemoryRateLimitStore(),
    storage: opts.storage ?? createStorage(config),
    notifier: undefined as unknown as AppContext["notifier"],
    metrics: { requests: 0, errors5xx: 0, rateLimited: 0, startedAt: Date.now() }
  } satisfies AppContext as AppContext;
  ctx.notifier = new NotificationService(db, email, config.EXPO_PUSH_ENABLED && config.NODE_ENV !== "test");

  const auth = new AuthService(ctx);
  const profiles = new ProfileService(ctx);
  const svc = { auth, profiles, messages: new MessageService(ctx, profiles), settings: new SettingsService(ctx), admin: new AdminService(ctx) };

  await registerCore(app, ctx, auth);
  registerRoutes(app, ctx, svc);

  const stop = opts.maintenance === false || config.NODE_ENV === "test" ? () => undefined : startMaintenance(ctx, app.log);
  app.addHook("onClose", async () => { stop(); (ctx.rl as { close?: () => void }).close?.(); await pool.end(); });
  return { app, ctx };
}
