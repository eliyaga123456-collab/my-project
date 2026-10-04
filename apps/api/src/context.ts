import type { Config } from "./config";
import type { Db } from "./db/client";
import type { RateLimitStore } from "./lib/ratelimit";
import type { EmailTransport } from "./services/email";
import type { NotificationService } from "./services/notifications";
import type { StorageProvider } from "./services/storage";
import type pg from "pg";

export interface Metrics { requests: number; errors5xx: number; rateLimited: number; startedAt: number }

export interface AppContext {
  config: Config;
  db: Db;
  pool: pg.Pool;
  rl: RateLimitStore;
  email: EmailTransport;
  notifier: NotificationService;
  storage: StorageProvider;
  metrics: Metrics;
}
