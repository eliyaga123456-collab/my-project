import { and, count, eq, sql } from "drizzle-orm";
import { LIMITS, type AnalyticsDto, type SettingsDto, type UpdateSettingsInput } from "@unsaid/shared";
import type { AppContext } from "../context";
import { blocks, hiddenWords, linkDailyStats, links, messages, pushTokens, settings } from "../db/schema";
import { E } from "../lib/errors";
import { settingsDto } from "../mappers";
import { foldForMatching } from "../moderation/normalize";

export class SettingsService {
  constructor(private ctx: AppContext) {}
  async get(userId: string): Promise<SettingsDto> {
    const [s] = await this.ctx.db.select().from(settings).where(eq(settings.userId, userId));
    return settingsDto(s!);
  }
  async update(userId: string, input: UpdateSettingsInput): Promise<SettingsDto> {
    const [cur] = await this.ctx.db.select().from(settings).where(eq(settings.userId, userId));
    const set: Partial<typeof settings.$inferInsert> = { updatedAt: new Date() };
    if (input.enhancedModeration !== undefined) set.enhancedModeration = input.enhancedModeration;
    if (input.acceptingMessages !== undefined) set.acceptingMessages = input.acceptingMessages;
    if (input.showAnswersPublicly !== undefined) set.showAnswersPublicly = input.showAnswersPublicly;
    if (input.notifications) set.notifications = { ...cur!.notifications, ...input.notifications };
    const [s] = await this.ctx.db.update(settings).set(set).where(eq(settings.userId, userId)).returning();
    return settingsDto(s!);
  }

  async hiddenWords(userId: string) {
    return this.ctx.db.select({ id: hiddenWords.id, word: hiddenWords.word }).from(hiddenWords).where(eq(hiddenWords.userId, userId)).orderBy(hiddenWords.createdAt);
  }
  async addHiddenWord(userId: string, word: string) {
    if (!foldForMatching(word)) throw E.validation("Use letters or numbers.", { word: ["Use letters or numbers."] });
    const [{ n } = { n: 0 }] = await this.ctx.db.select({ n: count() }).from(hiddenWords).where(eq(hiddenWords.userId, userId));
    if (n >= LIMITS.hiddenWordsPerUser) throw E.conflict(`You can hide up to ${LIMITS.hiddenWordsPerUser} words.`);
    const [row] = await this.ctx.db.insert(hiddenWords).values({ userId, word }).onConflictDoNothing().returning({ id: hiddenWords.id, word: hiddenWords.word });
    if (row) return row;
    const [existing] = await this.ctx.db.select({ id: hiddenWords.id, word: hiddenWords.word }).from(hiddenWords).where(and(eq(hiddenWords.userId, userId), eq(hiddenWords.word, word)));
    return existing!;
  }
  async removeHiddenWord(userId: string, id: string) {
    const r = await this.ctx.db.delete(hiddenWords).where(and(eq(hiddenWords.id, id), eq(hiddenWords.userId, userId))).returning({ id: hiddenWords.id });
    if (!r.length) throw E.notFound();
  }

  async registerPush(userId: string, token: string, platform: "ios" | "android" | "web") {
    await this.ctx.db.insert(pushTokens).values({ userId, token, platform }).onConflictDoUpdate({ target: pushTokens.token, set: { userId, platform } });
  }
  async unregisterPush(userId: string, token: string) {
    await this.ctx.db.delete(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
  }

  async analytics(userId: string, days: number): Promise<AnalyticsDto> {
    const d = Math.min(Math.max(Math.trunc(days) || 14, 1), 90);
    const { db } = this.ctx;
    const daily = await db.execute<{ date: string; views: number; messages: number }>(sql`
      select to_char(g.day, 'YYYY-MM-DD') as date, coalesce(sum(s.views),0)::int as views, coalesce(sum(s.messages),0)::int as messages
      from generate_series(current_date - (${d}::int - 1), current_date, interval '1 day') as g(day)
      left join link_daily_stats s on s.day = g.day::date and s.link_id in (select id from links where user_id = ${userId})
      group by g.day order by g.day`);
    const [[t], [{ replies } = { replies: 0 }], [{ blocked } = { blocked: 0 }]] = await Promise.all([
      db.select({ views: sql<number>`coalesce(sum(${linkDailyStats.views}),0)::int`, messages: sql<number>`coalesce(sum(${linkDailyStats.messages}),0)::int` }).from(linkDailyStats).innerJoin(links, eq(links.id, linkDailyStats.linkId)).where(eq(links.userId, userId)),
      db.select({ replies: count() }).from(messages).where(and(eq(messages.recipientId, userId), sql`${messages.replyText} is not null`)),
      db.select({ blocked: count() }).from(blocks).where(eq(blocks.ownerId, userId))
    ]);
    return { totals: { views: t?.views ?? 0, messages: t?.messages ?? 0, replies, blocked }, daily: daily.rows };
  }
}
