import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  adminReportsQuery, adminResolveReportInput, adminUserActionInput, adminUsersQuery, changePasswordInput, createLinkInput, emailSchema,
  forgotPasswordInput, hiddenWordInput, listMessagesQuery, loginInput, markNotificationsReadInput, pauseLinkInput, pushTokenInput,
  registerInput, replyInput, reportInput, resetPasswordInput, sendMessageInput, tokenInput, updateLinkInput, updateMessageInput,
  updateProfileInput, updateSettingsInput, updateUsernameInput, usernameSchema, LIMITS
} from "@unsaid/shared";
import { randomToken } from "../lib/crypto";
import { AppError, E } from "../lib/errors";
import { issueChallenge } from "../lib/pow";
import { HOUR, MIN } from "../lib/ratelimit";
import { DEVICE_COOKIE, clearSessionCookie, requireAuth, requireStaff, setSessionCookie } from "../plugins/core";
import type { AppContext } from "../context";
import { AdminService } from "../services/admin";
import { AuthService } from "../services/auth";
import { MessageService } from "../services/messages";
import { ProfileService } from "../services/profiles";
import { SettingsService } from "../services/settings";
import { deviceId, isMobile, limit, parse, uuidParam } from "./helpers";
import { isValidKey } from "../services/storage";

export const VERSION = "0.1.0";

export function registerRoutes(app: FastifyInstance, ctx: AppContext, svc: { auth: AuthService; profiles: ProfileService; messages: MessageService; settings: SettingsService; admin: AdminService }) {
  const { auth, profiles, messages, settings, admin } = svc;
  const ua = (req: { headers: Record<string, unknown> }) => (typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null);

  // ---------- ops ----------
  app.get("/health", async () => ({ status: "ok", version: VERSION }));
  app.get("/ready", async (_req, reply) => {
    try { await ctx.pool.query("select 1"); return { status: "ready" }; } catch { return reply.status(503).send({ status: "unavailable" }); }
  });
  app.get("/media/*", async (req, reply) => {
    const key = (req.params as { "*": string })["*"];
    if (!isValidKey(key)) throw E.notFound();
    const obj = await ctx.storage.get(key);
    if (!obj) throw E.notFound();
    return reply.header("content-type", obj.contentType).header("cache-control", "public, max-age=31536000, immutable").header("x-content-type-options", "nosniff").header("content-security-policy", "default-src 'none'; img-src 'self'; sandbox").send(obj.body);
  });

  app.register(async (api) => {
    await api.register(multipart, { limits: { fileSize: LIMITS.avatarMaxBytes, files: 1, fields: 0 } });

    // ---------- auth ----------
    api.post("/auth/register", async (req, reply) => {
      await limit(ctx, `register:${req.ip}`, 8, HOUR);
      const input = parse(registerInput, req.body);
      const { user, token } = await auth.register(input, ua(req));
      setSessionCookie(ctx, reply, token);
      return reply.status(201).send(await auth.authResult(user, isMobile(req) ? token : null));
    });
    api.post("/auth/login", async (req, reply) => {
      const input = parse(loginInput, req.body);
      await limit(ctx, `login:ip:${req.ip}`, 30, 15 * MIN);
      await limit(ctx, `login:email:${input.email}`, 10, 15 * MIN);
      const { user, token } = await auth.login(input.email, input.password, ua(req));
      setSessionCookie(ctx, reply, token);
      return auth.authResult(user, isMobile(req) ? token : null);
    });
    api.post("/auth/logout", async (req, reply) => {
      if (req.auth) await auth.revoke(req.auth.sessionId);
      clearSessionCookie(ctx, reply);
      return reply.status(204).send();
    });
    api.get("/auth/me", async (req) => auth.me(requireAuth(req).user));
    api.get("/auth/username-available", async (req) => {
      await limit(ctx, `uname:${req.ip}`, 60, MIN);
      const { username } = parse(z.object({ username: usernameSchema }), req.query);
      return { available: await profiles.usernameAvailable(username) };
    });
    api.post("/auth/verify-email", async (req, reply) => {
      await limit(ctx, `verify:${req.ip}`, 20, HOUR);
      await auth.verifyEmail(parse(tokenInput, req.body).token);
      return reply.status(204).send();
    });
    api.post("/auth/resend-verification", async (req, reply) => {
      const a = requireAuth(req);
      await limit(ctx, `resend:${a.user.id}`, 3, HOUR);
      await auth.sendVerification(a.user);
      return reply.status(204).send();
    });
    api.post("/auth/forgot-password", async (req, reply) => {
      await limit(ctx, `forgot:ip:${req.ip}`, 10, HOUR);
      const { email } = parse(forgotPasswordInput, req.body);
      await limit(ctx, `forgot:email:${email}`, 3, HOUR);
      await auth.forgotPassword(email);
      return reply.status(204).send();
    });
    api.post("/auth/reset-password", async (req, reply) => {
      await limit(ctx, `reset:${req.ip}`, 10, HOUR);
      const i = parse(resetPasswordInput, req.body);
      await auth.resetPassword(i.token, i.password);
      return reply.status(204).send();
    });
    api.post("/auth/change-password", async (req, reply) => {
      const a = requireAuth(req);
      await limit(ctx, `chpw:${a.user.id}`, 10, HOUR);
      const i = parse(changePasswordInput, req.body);
      await auth.changePassword(a.user, a.sessionId, i.currentPassword, i.newPassword);
      return reply.status(204).send();
    });
    api.get("/auth/sessions", async (req) => { const a = requireAuth(req); return { items: await auth.listSessions(a.user.id, a.sessionId) }; });
    api.delete("/auth/sessions/:id", async (req, reply) => {
      const a = requireAuth(req);
      await auth.revokeUserSession(a.user.id, uuidParam((req.params as { id: string }).id));
      return reply.status(204).send();
    });

    // ---------- profiles ----------
    api.get("/profiles/:username", async (req) => {
      const { username } = parse(z.object({ username: usernameSchema }), req.params);
      return profiles.getPublic({ username });
    });
    api.get("/profiles/:username/answers", async (req) => {
      const { username } = parse(z.object({ username: usernameSchema }), req.params);
      const { cursor } = parse(z.object({ cursor: z.string().max(200).optional() }), req.query);
      return profiles.answers(username, cursor);
    });
    api.get("/links/public/:slug", async (req) => {
      const { slug } = parse(z.object({ slug: z.string().regex(/^[A-Za-z0-9_-]{4,32}$/) }), req.params);
      return profiles.getPublic({ slug });
    });
    api.post("/public/view", async (req, reply) => {
      await limit(ctx, `view:${req.ip}`, 120, MIN);
      const i = parse(z.object({ username: usernameSchema.optional(), slug: z.string().regex(/^[A-Za-z0-9_-]{4,32}$/).optional() }).refine((v) => Boolean(v.username) !== Boolean(v.slug)), req.body);
      await profiles.recordView(i.username ? { username: i.username } : { slug: i.slug! }, messages.sourceHash(req.ip));
      return reply.status(204).send();
    });
    api.get("/answers/:id", async (req) => profiles.answer(uuidParam((req.params as { id: string }).id)));
    api.patch("/profile", async (req) => profiles.updateProfile(requireAuth(req).user.id, parse(updateProfileInput, req.body)));
    api.patch("/profile/username", async (req) => {
      const a = requireAuth(req);
      return profiles.changeUsername(a.user, parse(updateUsernameInput, req.body).username);
    });
    api.post("/profile/avatar", async (req) => {
      const a = requireAuth(req);
      await limit(ctx, `avatar:${a.user.id}`, 10, HOUR);
      if (!req.isMultipart()) throw new AppError("unsupported_media", "Upload a JPEG, PNG or WebP image.");
      const file = await req.file();
      if (!file) throw E.validation("Choose an image to upload.");
      const buf = await file.toBuffer();
      if (file.file.truncated) throw new AppError("payload_too_large", "Image is too large (max 2 MB).");
      return profiles.setAvatar(a.user, buf);
    });
    api.delete("/profile/avatar", async (req) => profiles.removeAvatar(requireAuth(req).user));

    // ---------- links ----------
    api.get("/links", async (req) => ({ items: await profiles.listLinks(requireAuth(req).user) }));
    api.post("/links", async (req, reply) => reply.status(201).send(await profiles.createLink(requireAuth(req).user, parse(createLinkInput, req.body).label)));
    api.patch("/links/:id", async (req) => profiles.updateLink(requireAuth(req).user, uuidParam((req.params as { id: string }).id), parse(updateLinkInput, req.body)));
    api.delete("/links/:id", async (req, reply) => { await profiles.deleteLink(requireAuth(req).user, uuidParam((req.params as { id: string }).id)); return reply.status(204).send(); });
    api.post("/link/pause", async (req) => { const i = parse(pauseLinkInput, req.body); return profiles.pausePrimary(requireAuth(req).user, i.paused, i.until); });

    // ---------- messages ----------
    api.get("/public/challenge", async (req, reply) => {
      await limit(ctx, `challenge:${req.ip}`, 60, HOUR);
      setDevice(req, reply);
      return issueChallenge(ctx.config.APP_SECRET, ctx.config.POW_DIFFICULTY);
    });
    api.post("/messages", async (req, reply) => {
      const input = parse(sendMessageInput, req.body);
      const dev = setDevice(req, reply);
      const out = await messages.send(input, { ip: req.ip, deviceId: dev });
      return reply.status(201).send(out);
    });
    api.get("/messages", async (req) => {
      const q = parse(listMessagesQuery, req.query);
      return messages.list(requireAuth(req).user.id, q.status, q.cursor, q.limit);
    });
    api.get("/messages/:id", async (req) => messages.get(requireAuth(req).user.id, uuidParam((req.params as { id: string }).id)));
    api.patch("/messages/:id", async (req) => messages.update(requireAuth(req).user.id, uuidParam((req.params as { id: string }).id), parse(updateMessageInput, req.body)));
    api.delete("/messages/:id", async (req, reply) => { await messages.remove(requireAuth(req).user.id, uuidParam((req.params as { id: string }).id)); return reply.status(204).send(); });
    api.post("/messages/:id/reply", async (req) => {
      const a = requireAuth(req);
      await limit(ctx, `reply:${a.user.id}`, 120, HOUR);
      const i = parse(replyInput, req.body);
      return messages.reply(a.user, uuidParam((req.params as { id: string }).id), i.text, i.public);
    });
    api.delete("/messages/:id/reply", async (req) => messages.removeReply(requireAuth(req).user.id, uuidParam((req.params as { id: string }).id)));
    api.post("/messages/:id/report", async (req, reply) => {
      const a = requireAuth(req);
      await limit(ctx, `report:${a.user.id}`, 60, HOUR);
      const i = parse(reportInput, req.body);
      await messages.report(a.user, uuidParam((req.params as { id: string }).id), i.reason, i.details);
      return reply.status(201).send();
    });
    api.post("/messages/:id/block", async (req, reply) => reply.status(201).send(await messages.block(requireAuth(req).user, uuidParam((req.params as { id: string }).id))));
    api.get("/blocks", async (req) => ({ items: await messages.listBlocks(requireAuth(req).user.id) }));
    api.delete("/blocks/:id", async (req, reply) => { await messages.unblock(requireAuth(req).user.id, uuidParam((req.params as { id: string }).id)); return reply.status(204).send(); });

    // ---------- settings / safety / notifications ----------
    api.get("/settings", async (req) => settings.get(requireAuth(req).user.id));
    api.patch("/settings", async (req) => settings.update(requireAuth(req).user.id, parse(updateSettingsInput, req.body)));
    api.get("/hidden-words", async (req) => ({ items: await settings.hiddenWords(requireAuth(req).user.id) }));
    api.post("/hidden-words", async (req, reply) => reply.status(201).send(await settings.addHiddenWord(requireAuth(req).user.id, parse(hiddenWordInput, req.body).word)));
    api.delete("/hidden-words/:id", async (req, reply) => { await settings.removeHiddenWord(requireAuth(req).user.id, uuidParam((req.params as { id: string }).id)); return reply.status(204).send(); });
    api.get("/notifications", async (req) => {
      const q = parse(z.object({ cursor: z.string().max(200).optional(), limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault) }), req.query);
      return ctx.notifier.list(requireAuth(req).user.id, q.cursor, q.limit);
    });
    api.post("/notifications/read", async (req, reply) => { await ctx.notifier.markRead(requireAuth(req).user.id, parse(markNotificationsReadInput, req.body)); return reply.status(204).send(); });
    api.post("/push-tokens", async (req, reply) => { const i = parse(pushTokenInput, req.body); await settings.registerPush(requireAuth(req).user.id, i.token, i.platform); return reply.status(204).send(); });
    api.delete("/push-tokens", async (req, reply) => { await settings.unregisterPush(requireAuth(req).user.id, parse(z.object({ token: z.string().min(10).max(300) }), req.body).token); return reply.status(204).send(); });
    api.get("/analytics/me", async (req) => settings.analytics(requireAuth(req).user.id, Number((req.query as { days?: string }).days ?? 14)));

    // ---------- admin ----------
    api.get("/admin/overview", async (req) => { requireStaff(req); return admin.overview(); });
    api.get("/admin/users", async (req) => { requireStaff(req); return admin.users(parse(adminUsersQuery, req.query)); });
    api.get("/admin/users/:id", async (req) => { requireStaff(req); return admin.user((req.params as { id: string }).id); });
    const statusRoute = (name: "suspend" | "unsuspend" | "ban", to: "suspended" | "active" | "banned") =>
      api.post(`/admin/users/:id/${name}`, async (req) => {
        const a = requireStaff(req);
        const { note } = parse(adminUserActionInput, req.body);
        return admin.setStatus(a.user, (req.params as { id: string }).id, to, `user.${name}`, note);
      });
    statusRoute("suspend", "suspended"); statusRoute("unsuspend", "active"); statusRoute("ban", "banned");
    api.post("/admin/users/:id/unban", async (req) => { const a = requireStaff(req, true); const { note } = parse(adminUserActionInput, req.body); return admin.setStatus(a.user, (req.params as { id: string }).id, "active", "user.unban", note); });
    api.get("/admin/reports", async (req) => { requireStaff(req); return admin.reports(parse(adminReportsQuery, req.query)); });
    api.post("/admin/reports/:id/resolve", async (req) => { const a = requireStaff(req); const i = parse(adminResolveReportInput, req.body); return admin.resolveReport(a.user, (req.params as { id: string }).id, i.action, i.note); });
    api.get("/admin/moderation-events", async (req) => { requireStaff(req); return admin.moderationEvents((req.query as { cursor?: string }).cursor); });
    api.get("/admin/audit-logs", async (req) => { requireStaff(req); return admin.auditLogs((req.query as { cursor?: string }).cursor); });
    api.get("/admin/abuse", async (req) => { requireStaff(req); return admin.abuse(); });
    api.get("/admin/health", async (req) => { requireStaff(req); return admin.health(VERSION); });

    // ---------- dev helpers (never in production) ----------
    if (!ctx.config.isProd && ctx.config.EMAIL_TRANSPORT === "outbox") {
      api.get("/dev/outbox", async (req) => {
        const { to } = parse(z.object({ to: emailSchema }), req.query);
        const rows = await ctx.pool.query("select to_email, subject, body_text, created_at from email_outbox where to_email = $1 order by created_at desc limit 10", [to]);
        return { items: rows.rows };
      });
    }
  }, { prefix: "/api/v1" });

  function setDevice(req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply): string {
    const existing = deviceId(req);
    if (existing) return existing;
    const id = randomToken(24);
    reply.setCookie(DEVICE_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: ctx.config.cookieSecure, path: "/", maxAge: 365 * 86400 });
    return id;
  }
}
