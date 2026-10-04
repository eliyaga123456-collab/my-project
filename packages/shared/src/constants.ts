export const API_PREFIX = "/api/v1";

export const LIMITS = {
  usernameMin: 3,
  usernameMax: 24,
  displayNameMax: 40,
  bioMax: 160,
  promptMax: 80,
  passwordMin: 10,
  passwordMax: 128,
  messageMin: 2,
  messageMax: 500,
  replyMax: 500,
  reportDetailsMax: 500,
  hiddenWordMax: 40,
  hiddenWordsPerUser: 100,
  linksPerUser: 10,
  linkLabelMax: 40,
  avatarMaxBytes: 2 * 1024 * 1024,
  pageSizeDefault: 20,
  pageSizeMax: 50
} as const;

/** Usernames that can never be claimed (routes, brand, abuse). */
export const RESERVED_USERNAMES = [
  "admin", "administrator", "api", "app", "about", "contact", "help", "login", "logout", "signup",
  "register", "privacy", "terms", "safety", "support", "settings", "inbox", "u", "l", "a", "me",
  "unsaid", "official", "moderator", "mod", "root", "system", "null", "undefined", "static", "media",
  "health", "status", "www", "mail", "security"
] as const;

export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9_]*[a-z0-9])?$/;

export const MODERATION_CATEGORIES = [
  "harassment",
  "threat",
  "hate",
  "sexual",
  "self_harm",
  "personal_info",
  "dangerous",
  "spam",
  "hidden_word"
] as const;
export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];

export const REPORT_REASONS = [
  "harassment",
  "threat",
  "hate",
  "sexual",
  "self_harm",
  "personal_info",
  "spam",
  "other"
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const USER_ROLES = ["user", "moderator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["active", "suspended", "banned"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const MESSAGE_STATUSES = ["inbox", "filtered", "archived"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_ACTIONS = ["dismiss", "remove_message", "suspend_user", "ban_user"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export const NOTIFICATION_TYPES = ["new_message", "message_activity", "safety"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ERROR_CODES = [
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "challenge_required",
  "moderation_rejected",
  "link_paused",
  "account_suspended",
  "email_not_verified",
  "payload_too_large",
  "unsupported_media",
  "server_error",
  "network_error"
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
