import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { generateSlug } from "./slug";
import type { AuthResultDto, MeDto, RegisterInput, SessionDto } from "@unsaid/shared";
import type { AppContext } from "../context";
import { emailTokens, links, messages, profiles, sessions, settings, users } from "../db/schema";
import { DUMMY_HASH, hashPassword, randomToken, sha256Hex, verifyPassword } from "../lib/crypto";
import { E, AppError, pgError } from "../lib/errors";
import { profileDto, settingsDto, userDto } from "../mappers";
import { emails } from "./email";

type User = typeof users.$inferSelect;
const DAY = 86_400_000;

export class AuthService {
  constructor(private ctx: AppContext) {}

  async register(input: RegisterInput, userAgent: string | null): Promise<{ user: User; token: string }> {
    const { db } = this.ctx;
    const passwordHash = await hashPassword(input.password);
    let user: User;
    try {
      user = await db.transaction(async (tx) => {
        const [u] = await tx.insert(users).values({ email: input.email, username: input.username, passwordHash }).returning();
        await tx.insert(profiles).values({ userId: u!.id, displayName: input.displayName?.trim() || input.username });
        await tx.insert(settings).values({
          userId: u!.id,
          notifications: { inAppNewMessage: true, pushNewMessage: true, emailNewMessage: false, emailDigest: false, pushActivity: true, emailSafety: true }
        });
        await tx.insert(links).values({ userId: u!.id, slug: generateSlug(), label: "My link", isPrimary: true });
        return u!;
      });
    } catch (e) {
      const err = pgError(e);
      if (err.code === "23505") {
        if (err.constraint === "users_username_key") throw E.conflict("That username is taken.", { username: ["That username is taken."] });
        throw E.conflict("An account with this email may already exist. Try signing in.", { email: ["An account with this email may already exist."] });
      }
      throw e;
    }
    await this.sendVerification(user);
    const token = await this.createSession(user.id, userAgent);
    return { user, token };
  }

  async login(email: string, password: string, userAgent: string | null): Promise<{ user: User; token: string }> {
    const [user] = await this.ctx.db.select().from(users).where(eq(users.email, email)).limit(1);
    const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new AppError("unauthorized", "Email or password is incorrect.");
    if (user.status === "banned") throw new AppError("account_suspended", "This account has been banned.");
    const token = await this.createSession(user.id, userAgent);
    return { user, token };
  }

  async createSession(userId: string, userAgent: string | null): Promise<string> {
    const token = randomToken(32);
    await this.ctx.db.insert(sessions).values({
      userId, tokenHash: sha256Hex(token), userAgent: userAgent?.slice(0, 300) ?? null,
      expiresAt: new Date(Date.now() + this.ctx.config.SESSION_TTL_DAYS * DAY)
    });
    return token;
  }

  async resolveSession(token: string): Promise<{ user: User; sessionId: string } | null> {
    const { db } = this.ctx;
    const [row] = await db.select({ s: sessions, u: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, sha256Hex(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))).limit(1);
    if (!row) return null;
    if (row.u.status === "banned") return null;
    if (Date.now() - row.s.lastUsedAt.getTime() > 5 * 60_000) {
      const half = this.ctx.config.SESSION_TTL_DAYS * DAY / 2;
      await db.update(sessions).set({ lastUsedAt: new Date(), ...(row.s.expiresAt.getTime() - Date.now() < half ? { expiresAt: new Date(Date.now() + this.ctx.config.SESSION_TTL_DAYS * DAY) } : {}) }).where(eq(sessions.id, row.s.id));
      await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, row.u.id));
    }
    return { user: row.u, sessionId: row.s.id };
  }

  async revoke(sessionId: string) {
    await this.ctx.db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
  }
  async revokeUserSession(userId: string, sessionId: string) {
    const res = await this.ctx.db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt))).returning({ id: sessions.id });
    if (!res.length) throw E.notFound();
  }
  async revokeAll(userId: string, exceptSessionId?: string) {
    await this.ctx.db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined));
  }
  async listSessions(userId: string, currentId: string): Promise<SessionDto[]> {
    const rows = await this.ctx.db.select().from(sessions).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))).orderBy(sql`${sessions.lastUsedAt} desc`);
    return rows.map((s) => ({ id: s.id, current: s.id === currentId, userAgent: s.userAgent, createdAt: s.createdAt.toISOString(), lastUsedAt: s.lastUsedAt.toISOString(), expiresAt: s.expiresAt.toISOString() }));
  }

  private async issueEmailToken(userId: string, kind: "verify" | "reset", ttlMs: number) {
    const token = randomToken(32);
    await this.ctx.db.update(emailTokens).set({ usedAt: new Date() }).where(and(eq(emailTokens.userId, userId), eq(emailTokens.kind, kind), isNull(emailTokens.usedAt)));
    await this.ctx.db.insert(emailTokens).values({ userId, kind, tokenHash: sha256Hex(token), expiresAt: new Date(Date.now() + ttlMs) });
    return token;
  }
  async sendVerification(user: User) {
    if (user.emailVerifiedAt) return;
    const token = await this.issueEmailToken(user.id, "verify", DAY);
    const mail = emails.verify(`${this.ctx.config.WEB_URL}/verify-email?token=${token}`);
    await this.ctx.email.send({ to: user.email, ...mail }).catch(() => undefined);
  }
  private async consumeToken(token: string, kind: "verify" | "reset") {
    const rows = await this.ctx.db.update(emailTokens).set({ usedAt: new Date() })
      .where(and(eq(emailTokens.tokenHash, sha256Hex(token)), eq(emailTokens.kind, kind), isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date()))).returning();
    if (!rows[0]) throw E.validation("This link is invalid or has expired.");
    return rows[0].userId;
  }
  async verifyEmail(token: string) {
    const userId = await this.consumeToken(token, "verify");
    await this.ctx.db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
  }
  async forgotPassword(email: string) {
    const [user] = await this.ctx.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.status === "banned") return;
    const token = await this.issueEmailToken(user.id, "reset", 3_600_000);
    await this.ctx.email.send({ to: user.email, ...emails.reset(`${this.ctx.config.WEB_URL}/reset-password?token=${token}`) }).catch(() => undefined);
  }
  async resetPassword(token: string, password: string) {
    const userId = await this.consumeToken(token, "reset");
    await this.ctx.db.update(users).set({ passwordHash: await hashPassword(password), updatedAt: new Date() }).where(eq(users.id, userId));
    await this.revokeAll(userId);
    await this.ctx.notifier.notify({ userId, type: "safety", title: "Your password was reset", body: "All devices were signed out. If this wasn't you, contact support." });
  }
  async changePassword(user: User, sessionId: string, current: string, next: string) {
    if (!(await verifyPassword(current, user.passwordHash))) throw new AppError("validation_error", "Your current password is incorrect.", { currentPassword: ["Incorrect password"] });
    await this.ctx.db.update(users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(users.id, user.id));
    await this.revokeAll(user.id, sessionId);
    await this.ctx.email.send({ to: user.email, ...emails.passwordChanged() }).catch(() => undefined);
    await this.ctx.notifier.notify({ userId: user.id, type: "safety", title: "Password changed", body: "Your password was changed and other devices were signed out." });
  }

  async me(user: User): Promise<MeDto> {
    const { db } = this.ctx;
    const [[p], [s], [{ n } = { n: 0 }], unread] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1),
      db.select().from(settings).where(eq(settings.userId, user.id)).limit(1),
      db.select({ n: sql<number>`count(*)::int` }).from(messages).where(and(eq(messages.recipientId, user.id), eq(messages.status, "inbox"), isNull(messages.readAt))),
      this.ctx.notifier.unreadCount(user.id)
    ]);
    return { user: userDto(user), profile: profileDto(this.ctx, user, p!), settings: settingsDto(s!), unreadMessages: n, unreadNotifications: unread };
  }

  async authResult(user: User, token: string | null): Promise<AuthResultDto> {
    return { ...(await this.me(user)), ...(token ? { token } : {}) };
  }
}
