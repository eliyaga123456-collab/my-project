import { z } from "zod";

const bool = z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1");
const list = (def: string) => z.string().default(def).transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().default("postgres://postgres@localhost:5432/unsaid"),
  /** Comma-separated browser origins allowed to call the API with credentials (CORS + CSRF origin check). */
  WEB_ORIGINS: list("http://localhost:3000"),
  ADMIN_ORIGINS: list("http://localhost:3100"),
  WEB_URL: z.string().default("http://localhost:3000"),
  API_URL: z.string().default("http://localhost:4000"),
  /** Honour X-Forwarded-For (set true behind a reverse proxy / Next.js rewrite). */
  TRUST_PROXY: bool.default(true),
  /** Secret for HMAC of IPs/devices/bodies/PoW. 32+ chars. MUST be set in production. */
  APP_SECRET: z.string().min(32).default("dev-only-secret-change-me-0123456789abcdef"),
  COOKIE_SECURE: bool.optional(),
  SESSION_TTL_DAYS: z.coerce.number().default(30),
  POW_DIFFICULTY: z.coerce.number().int().min(0).max(26).default(16),
  SOURCE_HASH_RETENTION_DAYS: z.coerce.number().default(30),
  EMAIL_TRANSPORT: z.enum(["outbox", "log", "smtp"]).default("outbox"),
  EMAIL_FROM: z.string().default("EAR <no-reply@ear.local>"),
  SMTP_URL: z.string().optional(),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  MEDIA_DIR: z.string().default(".data/media"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  EXPO_PUSH_ENABLED: bool.default(true),
  ADMIN_SEED_EMAIL: z.string().default("admin@ear.local"),
  ADMIN_SEED_PASSWORD: z.string().default("change-me-please-123"),
  RATE_LIMIT_DISABLED: bool.default(false),
  LOG_LEVEL: z.string().default("info")
});

export type Config = z.infer<typeof schema> & { cookieSecure: boolean; isProd: boolean };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error("Invalid environment: " + JSON.stringify(parsed.error.flatten().fieldErrors));
  }
  const c = parsed.data;
  const isProd = c.NODE_ENV === "production";
  if (isProd) {
    if (!env.APP_SECRET) throw new Error("APP_SECRET must be set in production");
    if (c.ADMIN_SEED_PASSWORD === "change-me-please-123") { /* seed script refuses; not fatal for the server */ }
    if (c.RATE_LIMIT_DISABLED) throw new Error("RATE_LIMIT_DISABLED is not allowed in production");
  }
  return { ...c, isProd, cookieSecure: c.COOKIE_SECURE ?? isProd };
}
