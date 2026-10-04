import type {
  ErrorCode,
  MessageStatus,
  ModerationCategory,
  NotificationType,
  ReportReason,
  ReportStatus,
  UserRole,
  UserStatus
} from "./constants";
import type { NotificationPrefs } from "./schemas";

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, string[]> | Record<string, unknown>; requestId?: string; retryAfterSeconds?: number };
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UserDto {
  id: string;
  email: string;
  emailVerified: boolean;
  username: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface ProfileDto {
  username: string;
  displayName: string;
  bio: string;
  prompt: string;
  avatarUrl: string | null;
}

export interface MeDto {
  user: UserDto;
  profile: ProfileDto;
  settings: SettingsDto;
  unreadNotifications: number;
  unreadMessages: number;
}

export interface AuthResultDto extends MeDto {
  /** Only returned to clients sending `x-client: mobile`. Web uses the httpOnly cookie. */
  token?: string;
}

export interface PublicProfileDto extends ProfileDto {
  acceptingMessages: boolean;
  /** `paused` when the owner paused the link, otherwise `open`. */
  linkState: "open" | "paused";
  linkLabel?: string | null;
}

export interface SettingsDto {
  enhancedModeration: boolean;
  acceptingMessages: boolean;
  showAnswersPublicly: boolean;
  notifications: NotificationPrefs;
}

export interface LinkDto {
  id: string;
  slug: string;
  label: string;
  isPrimary: boolean;
  paused: boolean;
  pausedUntil: string | null;
  url: string;
  views: number;
  messages: number;
  createdAt: string;
}

export interface ReplyDto {
  text: string;
  public: boolean;
  createdAt: string;
  answerId: string | null;
}

export interface MessageDto {
  id: string;
  body: string;
  status: MessageStatus;
  read: boolean;
  linkLabel: string | null;
  /** Present when the automated filter held this message in the filtered folder. */
  filteredCategories: ModerationCategory[];
  reply: ReplyDto | null;
  createdAt: string;
}

export interface AnswerDto {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  author: Pick<ProfileDto, "username" | "displayName" | "avatarUrl">;
}

export interface SendMessageResultDto {
  status: "delivered";
}

export interface BlockDto {
  id: string;
  createdAt: string;
  /** Short anonymous label so owners can recognise the entry without learning identity. */
  label: string;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  data: Record<string, string> | null;
  createdAt: string;
}

export interface SessionDto {
  id: string;
  current: boolean;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface ChallengeDto {
  id: string;
  algorithm: "sha256-leading-zero-bits";
  difficulty: number;
  prefix: string;
  expiresAt: string;
}

export interface AnalyticsDto {
  totals: { views: number; messages: number; replies: number; blocked: number };
  daily: { date: string; views: number; messages: number }[];
}

// ----- Admin -----
export interface AdminOverviewDto {
  users: { total: number; active7d: number; suspended: number; banned: number; newToday: number };
  messages: { total: number; today: number; filtered: number; rejectedToday: number };
  reports: { open: number; total: number };
  rates: { blockRate: number; reportRate: number; moderationRate: number };
  daily: { date: string; messages: number; reports: number; signups: number }[];
}

export interface AdminUserDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  messagesReceived: number;
  reportsAgainst: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface AdminReportDto {
  id: string;
  status: ReportStatus;
  reason: ReportReason;
  details: string | null;
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  message: { id: string; body: string; filteredCategories: ModerationCategory[]; createdAt: string };
  recipient: { id: string; username: string; status: UserStatus };
  reporterId: string;
  /** Number of reports tied to the same anonymous source (never reveals identity). */
  sameSourceReports: number;
}

export interface AdminModerationEventDto {
  id: string;
  kind: string;
  outcome: string;
  categories: ModerationCategory[];
  createdAt: string;
  messageId: string | null;
  userId: string | null;
}

export interface AdminAuditLogDto {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminAbuseDto {
  topSources: { sourceRef: string; messages: number; rejected: number; reports: number; lastSeenAt: string }[];
  floodingLast24h: number;
  rejectedByCategory: { category: string; count: number }[];
}

export interface AdminHealthDto {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  db: { ok: boolean; latencyMs: number };
  memoryMb: number;
  version: string;
  counters: { requests: number; errors5xx: number; rateLimited: number };
  checkedAt: string;
}
