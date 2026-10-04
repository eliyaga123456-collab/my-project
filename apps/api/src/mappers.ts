import type { MeDto, ProfileDto, SettingsDto, UserDto, MessageDto, ModerationCategory } from "@unsaid/shared";
import type { AppContext } from "./context";
import type { messages, profiles, settings, users } from "./db/schema";

type User = typeof users.$inferSelect;
type Profile = typeof profiles.$inferSelect;
type Settings = typeof settings.$inferSelect;
type Message = typeof messages.$inferSelect;

export const userDto = (u: User): UserDto => ({
  id: u.id, email: u.email, emailVerified: Boolean(u.emailVerifiedAt), username: u.username, role: u.role, status: u.status, createdAt: u.createdAt.toISOString()
});

export const avatarUrl = (ctx: AppContext, key: string | null) => {
  if (!key) return null;
  const u = ctx.storage.publicUrl(key);
  return u.startsWith("/") ? `${ctx.config.API_URL.replace(/\/$/, "")}${u}` : u;
};

export const profileDto = (ctx: AppContext, u: Pick<User, "username">, p: Profile): ProfileDto => ({
  username: u.username, displayName: p.displayName, bio: p.bio, prompt: p.prompt, avatarUrl: avatarUrl(ctx, p.avatarKey)
});

export const settingsDto = (s: Settings): SettingsDto => ({
  enhancedModeration: s.enhancedModeration, acceptingMessages: s.acceptingMessages, showAnswersPublicly: s.showAnswersPublicly, notifications: s.notifications
});

export const messageDto = (m: Message, linkLabel: string | null): MessageDto => ({
  id: m.id, body: m.body, status: m.status, read: Boolean(m.readAt), linkId: m.linkId, linkLabel,
  filteredCategories: m.filteredCategories as ModerationCategory[],
  reply: m.replyText ? { text: m.replyText, public: m.replyPublic, createdAt: (m.repliedAt ?? m.createdAt).toISOString(), answerId: m.replyPublic ? m.answerId : null } : null,
  createdAt: m.createdAt.toISOString()
});

export type { MeDto };
