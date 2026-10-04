import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import type { AppContext } from "../context";
import { AppError } from "../lib/errors";
import type { users } from "../db/schema";
import type { AuthService } from "../services/auth";

export const SESSION_COOKIE = "unsaid_session";
export const DEVICE_COOKIE = "unsaid_dev";
type User = typeof users.$inferSelect;

declare module "fastify" {
  interface FastifyRequest { auth: { user: User; sessionId: string; viaCookie: boolean } | null }
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export async function registerCore(app: FastifyInstance, ctx: AppContext, authSvc: AuthService) {
  const origins = new Set([...ctx.config.WEB_ORIGINS, ...ctx.config.ADMIN_ORIGINS]);

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"] } },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // avatars are embedded by web/admin on other origins
    hsts: ctx.config.isProd ? { maxAge: 31_536_000, includeSubDomains: true } : false
  });
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || origins.has(origin)),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-requested-with", "x-client"],
    maxAge: 600
  });
  await app.register(cookie);

  app.decorateRequest("auth", null);

  // metrics
  app.addHook("onResponse", async (req, reply) => {
    ctx.metrics.requests++;
    if (reply.statusCode >= 500) ctx.metrics.errors5xx++;
  });

  // Authentication: bearer token (mobile) or httpOnly cookie (web/admin).
  app.addHook("onRequest", async (req) => {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
    const token = bearer ?? req.cookies[SESSION_COOKIE] ?? null;
    if (!token) return;
    const s = await authSvc.resolveSession(token);
    if (s) req.auth = { user: s.user, sessionId: s.sessionId, viaCookie: !bearer };
  });

  // CSRF defence for state-changing requests: custom header (not sendable cross-site without CORS preflight) + Origin allow-list.
  app.addHook("preHandler", async (req) => {
    if (SAFE.has(req.method) || req.url.startsWith("/health") || req.url.startsWith("/ready")) return;
    if (req.headers["x-requested-with"] !== "unsaid") throw new AppError("forbidden", "Missing request header.");
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) throw new AppError("forbidden", "Origin not allowed.");
  });

  // Global API rate limit (per source)
  app.addHook("onRequest", async (req, reply) => {
    if (ctx.config.RATE_LIMIT_DISABLED || req.url.startsWith("/health") || req.url.startsWith("/ready") || req.url.startsWith("/media/")) return;
    const r = await ctx.rl.hit(`api:${req.ip}`, 60_000);
    if (r.count > 600) { ctx.metrics.rateLimited++; const s = Math.ceil(r.retryAfterMs / 1000); reply.header("retry-after", s); throw new AppError("rate_limited", "Too many requests. Please slow down.", undefined, s); }
  });

  app.setErrorHandler((err: FastifyError | AppError | ZodError, req: FastifyRequest, reply: FastifyReply) => {
    const requestId = req.id;
    if (err instanceof AppError) {
      if (err.retryAfterSeconds) reply.header("retry-after", err.retryAfterSeconds);
      return reply.status(err.status).send({ error: { code: err.code, message: err.message, details: err.details, retryAfterSeconds: err.retryAfterSeconds, requestId } });
    }
    if (err instanceof ZodError) {
      const details: Record<string, string[]> = {};
      for (const i of err.issues) (details[i.path.join(".") || "_"] ??= []).push(i.message);
      return reply.status(400).send({ error: { code: "validation_error", message: Object.values(details)[0]?.[0] ?? "Check the highlighted fields.", details, requestId } });
    }
    const fe = err as FastifyError;
    if (fe.code === "FST_ERR_CTP_BODY_TOO_LARGE" || fe.code === "FST_REQ_FILE_TOO_LARGE") return reply.status(413).send({ error: { code: "payload_too_large", message: "That upload is too large.", requestId } });
    if (fe.statusCode && fe.statusCode >= 400 && fe.statusCode < 500) return reply.status(fe.statusCode).send({ error: { code: fe.statusCode === 415 ? "unsupported_media" : "validation_error", message: "That request couldn't be understood.", requestId } });
    req.log.error({ err }, "unhandled error");
    return reply.status(500).send({ error: { code: "server_error", message: "Something went wrong on our side. Please try again.", requestId } });
  });

  app.setNotFoundHandler((req, reply) => reply.status(404).send({ error: { code: "not_found", message: "We couldn't find that.", requestId: req.id } }));
}

export function requireAuth(req: FastifyRequest) {
  if (!req.auth) throw new AppError("unauthorized", "Please sign in to continue.");
  return req.auth;
}
export function requireStaff(req: FastifyRequest, adminOnly = false) {
  const a = requireAuth(req);
  const ok = adminOnly ? a.user.role === "admin" : a.user.role === "admin" || a.user.role === "moderator";
  if (!ok) throw new AppError("forbidden", "You don't have access to that.");
  if (!a.user.emailVerifiedAt) throw new AppError("email_not_verified", "Verify your email to use the admin tools.");
  return a;
}

export function setSessionCookie(ctx: AppContext, reply: FastifyReply, token: string) {
  reply.setCookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: ctx.config.cookieSecure, path: "/", maxAge: ctx.config.SESSION_TTL_DAYS * 86400 });
}
export function clearSessionCookie(ctx: AppContext, reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure: ctx.config.cookieSecure });
}
