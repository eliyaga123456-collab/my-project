import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import type { NotificationType } from "@unsaid/shared";
import type { Db } from "../db/client";
import { notifications, pushTokens, settings, users, type NotificationPrefsRow } from "../db/schema";
import type { EmailTransport } from "./email";
import { decodeCursor, encodeCursor } from "../lib/cursor";

const fmt = (t: string, n: number) => t.replace("{n}", String(n)).replace("{s}", n === 1 ? "" : "s");

export interface NotifyInput { userId: string; type: NotificationType; title: string; body: string; data?: Record<string, string>; /** collapse into a recent unread notification with the same key */ coalesceKey?: string }
interface Recipient { id: string; email: string; prefs: NotificationPrefsRow }

/** A delivery channel. New channels (web push, SMS...) only need to implement this. */
export interface Channel {
  name: "inApp" | "push" | "email";
  wants(input: NotifyInput, prefs: NotificationPrefsRow): boolean;
  deliver(input: NotifyInput, to: Recipient): Promise<void>;
}

class InAppChannel implements Channel {
  name = "inApp" as const;
  constructor(private db: Db) {}
  wants(i: NotifyInput, p: NotificationPrefsRow) { return i.type === "new_message" ? p.inAppNewMessage : true; }
  async deliver(i: NotifyInput, to: Recipient) {
    if (i.coalesceKey) {
      const since = new Date(Date.now() - 10 * 60_000);
      const [existing] = await this.db.select().from(notifications).where(and(eq(notifications.userId, to.id), eq(notifications.type, i.type), isNull(notifications.readAt), gt(notifications.createdAt, since), sql`${notifications.data}->>'coalesceKey' = ${i.coalesceKey}`)).limit(1);
      if (existing) {
        const n = Number(existing.data?.count ?? "1") + 1;
        await this.db.update(notifications).set({ title: fmt(i.title, n), body: fmt(i.body, n), data: { ...(i.data ?? {}), coalesceKey: i.coalesceKey, count: String(n) }, createdAt: new Date() }).where(eq(notifications.id, existing.id));
        return;
      }
    }
    await this.db.insert(notifications).values({
      userId: to.id, type: i.type, title: fmt(i.title, 1), body: fmt(i.body, 1),
      data: { ...(i.data ?? {}), ...(i.coalesceKey ? { coalesceKey: i.coalesceKey, count: "1" } : {}) }
    });
  }
}

class PushChannel implements Channel {
  name = "push" as const;
  constructor(private db: Db, private enabled: boolean) {}
  wants(i: NotifyInput, p: NotificationPrefsRow) { return i.type === "new_message" ? p.pushNewMessage : i.type === "message_activity" ? p.pushActivity : true; }
  async deliver(i: NotifyInput, to: Recipient) {
    if (!this.enabled) return;
    const tokens = await this.db.select().from(pushTokens).where(eq(pushTokens.userId, to.id));
    const expo = tokens.filter((t) => /^Expo(nent)?PushToken\[/.test(t.token));
    if (!expo.length) return;
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(expo.map((t) => ({ to: t.token, title: fmt(i.title, Number(i.data?.count ?? 1)), body: fmt(i.body, Number(i.data?.count ?? 1)), data: i.data ?? {}, sound: "default", channelId: "default" }))),
        signal: AbortSignal.timeout(8000)
      });
      const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      const dead = (json?.data ?? []).map((r, idx) => (r.details?.error === "DeviceNotRegistered" ? expo[idx]!.token : null)).filter(Boolean) as string[];
      if (dead.length) await this.db.delete(pushTokens).where(inArray(pushTokens.token, dead));
    } catch { /* push is best-effort; in-app copy already exists */ }
  }
}

class EmailChannel implements Channel {
  name = "email" as const;
  constructor(private transport: EmailTransport) {}
  wants(i: NotifyInput, p: NotificationPrefsRow) { return i.type === "new_message" ? p.emailNewMessage : i.type === "safety" ? p.emailSafety : false; }
  async deliver(i: NotifyInput, to: Recipient) {
    await this.transport.send({ to: to.email, subject: fmt(i.title, 1), text: `${fmt(i.body, 1)}\n\n— Unsaid\nManage notification settings in the app.` });
  }
}

export class NotificationService {
  private channels: Channel[];
  constructor(private db: Db, transport: EmailTransport, pushEnabled: boolean) {
    this.channels = [new InAppChannel(db), new PushChannel(db, pushEnabled), new EmailChannel(transport)];
  }

  async notify(input: NotifyInput): Promise<void> {
    const [row] = await this.db.select({ id: users.id, email: users.email, prefs: settings.notifications }).from(users).innerJoin(settings, eq(settings.userId, users.id)).where(eq(users.id, input.userId)).limit(1);
    if (!row) return;
    for (const ch of this.channels) {
      if (!ch.wants(input, row.prefs)) continue;
      try { await ch.deliver(input, row); } catch { /* one failing channel must not block the others */ }
    }
  }

  async list(userId: string, cursor: string | undefined, limit: number) {
    const c = decodeCursor(cursor);
    const rows = await this.db.select().from(notifications).where(and(eq(notifications.userId, userId), c ? or(lt(notifications.createdAt, new Date(c.t)), and(eq(notifications.createdAt, new Date(c.t)), lt(notifications.id, c.id))) : undefined)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(limit + 1);
    const page = rows.slice(0, limit);
    const [{ n } = { n: 0 }] = await this.db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return {
      items: page.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, readAt: r.readAt?.toISOString() ?? null, data: r.data ? Object.fromEntries(Object.entries(r.data).filter(([k]) => k !== "coalesceKey" && k !== "count")) : null, createdAt: r.createdAt.toISOString() })),
      nextCursor: rows.length > limit ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id) : null,
      unread: n
    };
  }
  async markRead(userId: string, input: { ids: string[] } | { all: true }) {
    const where = "all" in input ? and(eq(notifications.userId, userId), isNull(notifications.readAt)) : and(eq(notifications.userId, userId), inArray(notifications.id, input.ids), isNull(notifications.readAt));
    await this.db.update(notifications).set({ readAt: new Date() }).where(where);
  }
  async unreadCount(userId: string) {
    const [{ n } = { n: 0 }] = await this.db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return n;
  }
}
