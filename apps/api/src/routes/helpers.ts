import type { FastifyRequest } from "fastify";
import type { ZodType, z } from "zod";
import type { AppContext } from "../context";
import { E } from "../lib/errors";
import { DEVICE_COOKIE } from "../plugins/core";

export function parse<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data ?? {});
  if (!r.success) {
    const details: Record<string, string[]> = {};
    for (const i of r.error.issues) (details[i.path.join(".") || "_"] ??= []).push(i.message);
    throw E.validation(Object.values(details)[0]?.[0] ?? "Check the highlighted fields.", details);
  }
  return r.data;
}

export async function limit(ctx: AppContext, key: string, max: number, windowMs: number) {
  if (ctx.config.RATE_LIMIT_DISABLED) return;
  const r = await ctx.rl.hit(key, windowMs);
  if (r.count > max) { ctx.metrics.rateLimited++; throw E.rateLimited(Math.ceil(r.retryAfterMs / 1000)); }
}

export const deviceId = (req: FastifyRequest): string | null => {
  const v = req.cookies[DEVICE_COOKIE];
  return v && /^[A-Za-z0-9_-]{16,64}$/.test(v) ? v : null;
};
export const isMobile = (req: FastifyRequest) => req.headers["x-client"] === "mobile";
export const uuidParam = (v: unknown) => { if (typeof v !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) throw E.notFound(); return v; };
