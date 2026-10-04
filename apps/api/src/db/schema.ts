import { sql } from "drizzle-orm";
import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, primaryKey } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  username: text("username").notNull(),
  role: text("role", { enum: ["user", "moderator", "admin"] }).notNull().default("user"),
  status: text("status", { enum: ["active", "suspended", "banned"] }).notNull().default("active"),
  emailVerifiedAt: ts("email_verified_at"),
  usernameChangedAt: ts("username_changed_at"),
  locale: text("locale", { enum: ["en", "he"] }).notNull().default("en"),
  lastSeenAt: ts("last_seen_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow()
}, (t) => [uniqueIndex("users_email_key").on(t.email), uniqueIndex("users_username_key").on(t.username)]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  prompt: text("prompt").notNull().default("Send me an anonymous message"),
  avatarKey: text("avatar_key"),
  updatedAt: ts("updated_at").notNull().defaultNow()
});

export interface NotificationPrefsRow {
  inAppNewMessage: boolean; pushNewMessage: boolean; emailNewMessage: boolean; emailDigest: boolean; pushActivity: boolean; emailSafety: boolean;
}
export const settings = pgTable("settings", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  enhancedModeration: boolean("enhanced_moderation").notNull().default(false),
  acceptingMessages: boolean("accepting_messages").notNull().default(true),
  showAnswersPublicly: boolean("show_answers_publicly").notNull().default(true),
  notifications: jsonb("notifications").$type<NotificationPrefsRow>().notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow()
});

export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  label: text("label").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  paused: boolean("paused").notNull().default(false),
  pausedUntil: ts("paused_until"),
  prompt: text("prompt"),
  closesAt: ts("closes_at"),
  createdAt: ts("created_at").notNull().defaultNow()
}, (t) => [uniqueIndex("links_slug_key").on(t.slug), index("links_user_idx").on(t.userId, t.createdAt)]);

export const linkDailyStats = pgTable("link_daily_stats", {
  linkId: uuid("link_id").notNull().references(() => links.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  views: integer("views").notNull().default(0),
  messages: integer("messages").notNull().default(0)
}, (t) => [primaryKey({ columns: [t.linkId, t.day] })]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  linkId: uuid("link_id").references(() => links.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  status: text("status", { enum: ["inbox", "filtered", "archived"] }).notNull().default("inbox"),
  readAt: ts("read_at"),
  sourceHash: text("source_hash"),
  deviceHash: text("device_hash"),
  bodyHash: text("body_hash").notNull(),
  filteredCategories: text("filtered_categories").array().notNull().default(sql`'{}'::text[]`),
  replyText: text("reply_text"),
  replyPublic: boolean("reply_public").notNull().default(false),
  repliedAt: ts("replied_at"),
  answerId: uuid("answer_id"),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const blocks = pgTable("blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceHash: text("source_hash"),
  deviceHash: text("device_hash"),
  label: text("label").notNull(),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status", { enum: ["open", "resolved", "dismissed"] }).notNull().default("open"),
  resolution: text("resolution"),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: ts("resolved_at"),
  messageBody: text("message_body").notNull(),
  messageCreatedAt: ts("message_created_at").notNull(),
  filteredCategories: text("filtered_categories").array().notNull().default(sql`'{}'::text[]`),
  sourceHash: text("source_hash"),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  userAgent: text("user_agent"),
  createdAt: ts("created_at").notNull().defaultNow(),
  lastUsedAt: ts("last_used_at").notNull().defaultNow(),
  expiresAt: ts("expires_at").notNull(),
  revokedAt: ts("revoked_at")
});

export const emailTokens = pgTable("email_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["verify", "reset"] }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["new_message", "message_activity", "safety"] }).notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").$type<Record<string, string> | null>(),
  readAt: ts("read_at"),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform", { enum: ["ios", "android", "web"] }).notNull(),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const hiddenWords = pgTable("hidden_words", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  word: text("word").notNull(),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const moderationEvents = pgTable("moderation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind", { enum: ["message", "report", "admin_action"] }).notNull(),
  outcome: text("outcome").notNull(),
  categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
  score: integer("score").notNull().default(0),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  sourceHash: text("source_hash"),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  meta: jsonb("meta").$type<Record<string, unknown> | null>(),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const emailOutbox = pgTable("email_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  bodyText: text("body_text").notNull(),
  createdAt: ts("created_at").notNull().defaultNow()
});

export const bannedSources = pgTable("banned_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceHash: text("source_hash").notNull(),
  until: ts("until"),
  reason: text("reason"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow()
});
