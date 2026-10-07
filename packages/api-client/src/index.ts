import { API_PREFIX } from "@unsaid/shared";
import type {
  AdminAbuseDto, AdminRoundDetailDto, AdminActivityDto, AdminAuditLogDto, AdminHealthDto, AdminModerationEventDto, AdminOverviewDto, AdminReportDto,
  AdminUserDto, UserDto, AnalyticsDto, AnswerDto, ApiErrorBody, AuthResultDto, BlockDto, ChallengeDto, ErrorCode, LinkDto,
  MeDto, MessageDto, NotificationDto, Page, ProfileDto, PublicProfileDto, SendMessageResultDto, SessionDto, SettingsDto
} from "@unsaid/shared";
import type {
  ChangePasswordInput, LoginInput, RegisterInput, ReportAction, SendMessageInput, UpdateProfileInput, UpdateSettingsInput
} from "./inputs";

export * from "./inputs";

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: ApiErrorBody["error"]["details"],
    public readonly retryAfterSeconds?: number,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
  /** User-presentable message. */
  get friendly(): string {
    switch (this.code) {
      case "network_error": return "Can't reach the server. Check your connection and try again.";
      case "rate_limited": return this.retryAfterSeconds ? `Slow down a little — try again in ${this.retryAfterSeconds}s.` : "Too many attempts. Please wait a moment.";
      case "unauthorized": return "Please sign in to continue.";
      case "forbidden": return "You don't have access to that.";
      case "not_found": return "We couldn't find that.";
      case "server_error": return "Something went wrong on our side. Please try again.";
      default: return this.message;
    }
  }
}

export interface ClientOptions {
  /** e.g. https://api.example.com  (no trailing slash). Empty string = same origin / proxy. */
  baseUrl: string;
  /** Mobile: bearer token provider. Web: omit and rely on the httpOnly cookie. */
  getToken?: () => string | null | Promise<string | null>;
  /** Sent as `x-client`. Mobile must send "mobile" to receive session tokens in bodies. */
  clientKind?: "web" | "mobile" | "admin";
  /** Web: "include" for cross-origin cookies. */
  credentials?: RequestCredentials;
  /** Forward extra headers (SSR cookie forwarding, etc.). */
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Current UI language; sent as `x-lang` so the API answers errors in that language. */
  getLang?: () => string | null | undefined;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

type Query = Record<string, string | number | boolean | undefined | null>;

export function createApiClient(opts: ClientOptions) {
  const f = opts.fetchImpl ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  async function request<T>(method: string, path: string, body?: unknown, query?: Query, init?: { form?: FormData }): Promise<T> {
    const qs = query
      ? "?" + Object.entries(query).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")
      : "";
    const headers: Record<string, string> = { accept: "application/json", "x-requested-with": "unsaid", ...(opts.clientKind ? { "x-client": opts.clientKind } : {}) };
    if (body !== undefined) headers["content-type"] = "application/json";
    const token = await opts.getToken?.();
    if (token) headers.authorization = `Bearer ${token}`;
    const lang = opts.getLang?.();
    if (lang) headers["x-lang"] = lang;
    if (opts.getHeaders) Object.assign(headers, await opts.getHeaders());
    let res: Response;
    try {
      res = await f(`${opts.baseUrl}${API_PREFIX}${path}${qs}`, {
        method,
        headers,
        credentials: opts.credentials ?? "include",
        body: init?.form ?? (body !== undefined ? JSON.stringify(body) : undefined)
      });
    } catch {
      throw new ApiError("network_error", "Network error", 0);
    }
    if (res.status === 204) return undefined as T;
    let json: unknown = null;
    try { json = await res.json(); } catch { /* non-json */ }
    if (!res.ok) {
      const e = (json as ApiErrorBody | null)?.error;
      if (res.status === 401) opts.onUnauthorized?.();
      throw new ApiError(e?.code ?? (res.status >= 500 ? "server_error" : "validation_error"), e?.message ?? res.statusText, res.status, e?.details, e?.retryAfterSeconds ?? (Number(res.headers.get("retry-after")) || undefined), e?.requestId);
    }
    return json as T;
  }

  const get = <T>(p: string, q?: Query) => request<T>("GET", p, undefined, q);
  const post = <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {});
  const patch = <T>(p: string, b: unknown) => request<T>("PATCH", p, b);
  const del = <T>(p: string) => request<T>("DELETE", p);

  return {
    request,
    auth: {
      register: (i: RegisterInput) => post<AuthResultDto>("/auth/register", i),
      login: (i: LoginInput) => post<AuthResultDto>("/auth/login", i),
      logout: () => post<void>("/auth/logout"),
      me: () => get<MeDto>("/auth/me"),
      changeEmail: (i: { email: string }) => request<UserDto>("PATCH", "/auth/email", i),
      verifyEmail: (token: string) => post<void>("/auth/verify-email", { token }),
      resendVerification: () => post<void>("/auth/resend-verification"),
      forgotPassword: (email: string) => post<void>("/auth/forgot-password", { email }),
      resetPassword: (token: string, password: string) => post<void>("/auth/reset-password", { token, password }),
      changePassword: (i: ChangePasswordInput) => post<void>("/auth/change-password", i),
      /** Permanently deletes the account and all its data (required by Google Play / App Store). */
      deleteAccount: (password: string) => request<void>("DELETE", "/auth/account", { password }),
      sessions: () => get<{ items: SessionDto[] }>("/auth/sessions"),
      revokeSession: (id: string) => del<void>(`/auth/sessions/${id}`),
      usernameAvailable: (username: string) => get<{ available: boolean }>("/auth/username-available", { username })
    },
    profile: {
      get: (username: string) => get<PublicProfileDto>(`/profiles/${encodeURIComponent(username)}`),
      getByLink: (slug: string) => get<PublicProfileDto>(`/links/public/${encodeURIComponent(slug)}`),
      update: (i: UpdateProfileInput) => patch<ProfileDto>("/profile", i),
      changeUsername: (username: string) => patch<ProfileDto>("/profile/username", { username }),
      uploadAvatar: (form: FormData) => request<ProfileDto>("POST", "/profile/avatar", undefined, undefined, { form }),
      removeAvatar: () => del<ProfileDto>("/profile/avatar"),
      recordView: (target: { username: string } | { slug: string }) => post<void>("/public/view", target),
      answers: (username: string, cursor?: string) => get<Page<AnswerDto>>(`/profiles/${encodeURIComponent(username)}/answers`, { cursor })
    },
    answers: { get: (id: string) => get<AnswerDto>(`/answers/${id}`) },
    links: {
      list: () => get<{ items: LinkDto[] }>("/links"),
      create: (i: { label: string; prompt?: string; closesAt?: string | null }) => post<LinkDto>("/links", i),
      update: (id: string, i: { label?: string; paused?: boolean; prompt?: string | null; closesAt?: string | null }) => patch<LinkDto>(`/links/${id}`, i),
      remove: (id: string) => del<void>(`/links/${id}`),
      pause: (paused: boolean, until?: string | null) => post<LinkDto>("/link/pause", { paused, until })
    },
    messages: {
      challenge: () => get<ChallengeDto>("/public/challenge"),
      send: (i: SendMessageInput) => post<SendMessageResultDto>("/messages", i),
      list: (q: { status?: "inbox" | "filtered" | "archived"; cursor?: string; limit?: number; linkId?: string }) => get<Page<MessageDto>>("/messages", q),
      get: (id: string) => get<MessageDto>(`/messages/${id}`),
      update: (id: string, i: { read?: boolean; status?: "inbox" | "archived" }) => patch<MessageDto>(`/messages/${id}`, i),
      remove: (id: string) => del<void>(`/messages/${id}`),
      reply: (id: string, text: string, isPublic = true) => post<MessageDto>(`/messages/${id}/reply`, { text, public: isPublic }),
      removeReply: (id: string) => del<MessageDto>(`/messages/${id}/reply`),
      report: (id: string, reason: string, details?: string) => post<void>(`/messages/${id}/report`, { reason, details }),
      block: (id: string) => post<BlockDto>(`/messages/${id}/block`)
    },
    blocks: {
      list: () => get<{ items: BlockDto[] }>("/blocks"),
      remove: (id: string) => del<void>(`/blocks/${id}`)
    },
    settings: {
      get: () => get<SettingsDto>("/settings"),
      update: (i: UpdateSettingsInput) => patch<SettingsDto>("/settings", i),
      hiddenWords: () => get<{ items: { id: string; word: string }[] }>("/hidden-words"),
      addHiddenWord: (word: string) => post<{ id: string; word: string }>("/hidden-words", { word }),
      removeHiddenWord: (id: string) => del<void>(`/hidden-words/${id}`)
    },
    notifications: {
      list: (q: { cursor?: string; limit?: number } = {}) => get<Page<NotificationDto> & { unread: number }>("/notifications", q),
      markRead: (i: { ids: string[] } | { all: true }) => post<void>("/notifications/read", i),
      registerPush: (token: string, platform: "ios" | "android" | "web") => post<void>("/push-tokens", { token, platform }),
      unregisterPush: (token: string) => request<void>("DELETE", "/push-tokens", { token })
    },
    analytics: { me: (days = 14) => get<AnalyticsDto>("/analytics/me", { days }) },
    share: {
      video: (form: FormData) => request<{ url: string }>("POST", "/share/video", undefined, undefined, { form })
    },
    admin: {
      overview: () => get<AdminOverviewDto>("/admin/overview"),
      users: (q: { q?: string; status?: string; cursor?: string; limit?: number }) => get<Page<AdminUserDto>>("/admin/users", q),
      user: (id: string) => get<AdminUserDto>(`/admin/users/${id}`),
      suspend: (id: string, note?: string) => post<AdminUserDto>(`/admin/users/${id}/suspend`, { note }),
      unsuspend: (id: string, note?: string) => post<AdminUserDto>(`/admin/users/${id}/unsuspend`, { note }),
      unban: (id: string, note?: string) => post<AdminUserDto>(`/admin/users/${id}/unban`, { note }),
      ban: (id: string, note?: string) => post<AdminUserDto>(`/admin/users/${id}/ban`, { note }),
      reports: (q: { status?: "open" | "resolved" | "dismissed"; cursor?: string; limit?: number }) => get<Page<AdminReportDto>>("/admin/reports", q),
      resolveReport: (id: string, action: ReportAction, note?: string) => post<AdminReportDto>(`/admin/reports/${id}/resolve`, { action, note }),
      moderationEvents: (cursor?: string) => get<Page<AdminModerationEventDto>>("/admin/moderation-events", { cursor }),
      auditLogs: (cursor?: string) => get<Page<AdminAuditLogDto>>("/admin/audit-logs", { cursor }),
      abuse: () => get<AdminAbuseDto>("/admin/abuse"),
      round: (id: string) => get<AdminRoundDetailDto>(`/admin/rounds/${id}`),
      evidence: (messageId: string) => get<{ messageId: string; networkAddress: string; channel: string; userAgent: string | null; sentAt: string; keepUntil: string }>(`/admin/messages/${messageId}/evidence`),
      activity: () => get<AdminActivityDto>("/admin/activity"),
      health: () => get<AdminHealthDto>("/admin/health")
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Solves the sha256-leading-zero-bits proof of work (browser + RN safe via injected hasher). */
export async function solveChallenge(
  c: ChallengeDto,
  sha256: (input: string) => Promise<Uint8Array> | Uint8Array
): Promise<{ id: string; nonce: string }> {
  const leadingZeroBits = (h: Uint8Array) => {
    let bits = 0;
    for (const byte of h) {
      if (byte === 0) { bits += 8; continue; }
      bits += Math.clz32(byte) - 24;
      break;
    }
    return bits;
  };
  for (let n = 0; n < 50_000_000; n++) {
    const nonce = n.toString(36);
    const h = await sha256(c.prefix + nonce);
    if (leadingZeroBits(h) >= c.difficulty) return { id: c.id, nonce };
    if (n % 2000 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  throw new Error("challenge_unsolved");
}

/** Web helper using WebCrypto. */
export const webSha256 = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
