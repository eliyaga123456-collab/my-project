import { z } from "zod";
import { AVATAR_FRAMES } from "./constants";
import {
  LIMITS,
  LOCALES,
  USERNAME_REGEX,
  RESERVED_USERNAMES,
  REPORT_REASONS,
  REPORT_ACTIONS,
  MESSAGE_STATUSES,
  USER_STATUSES
} from "./constants";

const trimmed = (max: number, min = 0) => z.string().trim().min(min).max(max);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(LIMITS.usernameMin, `Username must be at least ${LIMITS.usernameMin} characters`)
  .max(LIMITS.usernameMax, `Username must be at most ${LIMITS.usernameMax} characters`)
  .regex(USERNAME_REGEX, "Use only letters, numbers and underscores")
  .refine((v) => !(RESERVED_USERNAMES as readonly string[]).includes(v), "This username is not available");

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z
  .string()
  .min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters`)
  .max(LIMITS.passwordMax);

/** Collapses control characters and excessive whitespace but keeps emoji / newlines. */
export const messageBodySchema = z
  .string()
  .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "").replace(/\n{3,}/g, "\n\n").trim())
  .pipe(z.string().min(LIMITS.messageMin, "Write a little more").max(LIMITS.messageMax, `Max ${LIMITS.messageMax} characters`));

// ---------- Auth ----------
export const registerInput = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: trimmed(LIMITS.displayNameMax).optional(),
  locale: z.enum(LOCALES).optional()
});
export type RegisterInput = z.infer<typeof registerInput>;

export const loginInput = z.object({ email: emailSchema, password: z.string().min(1).max(LIMITS.passwordMax) });
export type LoginInput = z.infer<typeof loginInput>;

export const tokenInput = z.object({ token: z.string().min(16).max(256) });
export const forgotPasswordInput = z.object({ email: emailSchema });
export const resetPasswordInput = z.object({ token: z.string().min(16).max(256), password: passwordSchema });
export const deleteAccountInput = z.object({ password: z.string().min(1).max(LIMITS.passwordMax), confirm: z.literal("DELETE").optional() });
export const changeEmailInput = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const changePasswordInput = z.object({ currentPassword: z.string().min(1).max(LIMITS.passwordMax), newPassword: passwordSchema });

// ---------- Profile ----------
export const updateProfileInput = z
  .object({
    displayName: trimmed(LIMITS.displayNameMax, 1),
    bio: trimmed(LIMITS.bioMax),
    prompt: trimmed(LIMITS.promptMax),
    avatarFrame: z.enum(AVATAR_FRAMES).nullable(),
    /** Optional, owner-provided number (digits, international format without +) used for a wa.me chat link; "" or null removes it. */
    whatsapp: z.union([z.string().trim().regex(/^[0-9]{7,15}$/, "Enter the number with country code, digits only."), z.literal("").transform(() => null), z.null()])
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileInput>;

export const updateUsernameInput = z.object({ username: usernameSchema });

// ---------- Links ----------
const futureIso = z.string().datetime();
/** A "round" = an extra link with its own question and optional closing time. */
export const createLinkInput = z.object({
  label: trimmed(LIMITS.linkLabelMax, 1),
  prompt: trimmed(LIMITS.roundPromptMax, 1).optional(),
  closesAt: futureIso.nullable().optional()
});
export const updateLinkInput = z
  .object({ label: trimmed(LIMITS.linkLabelMax, 1), paused: z.boolean(), prompt: trimmed(LIMITS.roundPromptMax, 1).nullable(), closesAt: futureIso.nullable() })
  .partial();
export const pauseLinkInput = z.object({
  paused: z.boolean(),
  /** Optional ISO timestamp after which the link resumes automatically. */
  until: z.string().datetime().nullable().optional()
});

// ---------- Messages ----------
/** Which share button produced the link the sender opened (from the link itself; says nothing about the person). */
export const SHARE_CHANNELS = ["wa", "ig", "tt", "tg", "sms", "more", "copy", "direct"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export const sendMessageInput = z.object({
  src: z.enum(SHARE_CHANNELS).optional(),
  /** Either the profile username (primary link) or an additional link slug. */
  username: usernameSchema.optional(),
  slug: z.string().trim().min(4).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  body: messageBodySchema,
  /** Proof-of-work answer, required when the API replies `challenge_required`. */
  challenge: z
    .object({ id: z.string().min(8).max(128), nonce: z.string().min(1).max(64) })
    .optional()
}).refine((v) => Boolean(v.username) !== Boolean(v.slug), { message: "Provide exactly one of username or slug" });
export type SendMessageInput = z.infer<typeof sendMessageInput>;

export const listMessagesQuery = z.object({
  status: z.enum(MESSAGE_STATUSES).default("inbox"),
  cursor: z.string().max(200).optional(),
  /** Only messages received through this link / round. */
  linkId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault)
});

export const updateMessageInput = z
  .object({ read: z.boolean(), status: z.enum(["inbox", "archived"]) })
  .partial();

export const replyInput = z.object({
  text: z.string().trim().min(1).max(LIMITS.replyMax),
  public: z.boolean().default(true)
});

export const reportInput = z.object({
  reason: z.enum(REPORT_REASONS),
  details: trimmed(LIMITS.reportDetailsMax).optional()
});

// ---------- Settings ----------
export const notificationPrefsSchema = z.object({
  inAppNewMessage: z.boolean(),
  pushNewMessage: z.boolean(),
  emailNewMessage: z.boolean(),
  emailDigest: z.boolean(),
  pushActivity: z.boolean(),
  emailSafety: z.boolean()
});
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const updateSettingsInput = z
  .object({
    enhancedModeration: z.boolean(),
    acceptingMessages: z.boolean(),
    showAnswersPublicly: z.boolean(),
    locale: z.enum(LOCALES),
    notifications: notificationPrefsSchema.partial()
  })
  .partial();
export type UpdateSettingsInput = z.infer<typeof updateSettingsInput>;

export const hiddenWordInput = z.object({
  word: z.string().trim().toLowerCase().min(2).max(LIMITS.hiddenWordMax)
});

export const markNotificationsReadInput = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }),
  z.object({ all: z.literal(true) })
]);

export const pushTokenInput = z.object({
  token: z.string().min(10).max(300),
  platform: z.enum(["ios", "android", "web"])
});

// ---------- Admin ----------
export const adminUsersQuery = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(USER_STATUSES).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault)
});
export const adminReportsQuery = z.object({
  status: z.enum(["open", "resolved", "dismissed"]).default("open"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault)
});
export const adminUserActionInput = z.object({ note: trimmed(300).optional() });
export const adminResolveReportInput = z.object({
  action: z.enum(REPORT_ACTIONS),
  note: trimmed(300).optional()
});
