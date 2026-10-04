import type { ErrorCode } from "@unsaid/shared";

const STATUS: Record<ErrorCode, number> = {
  validation_error: 400, unauthorized: 401, forbidden: 403, not_found: 404, conflict: 409, rate_limited: 429,
  challenge_required: 428, moderation_rejected: 422, link_paused: 423, account_suspended: 403, email_not_verified: 403,
  payload_too_large: 413, unsupported_media: 415, server_error: 500, network_error: 500
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export const E = {
  validation: (message: string, details?: Record<string, string[]>) => new AppError("validation_error", message, details),
  unauthorized: (message = "Please sign in to continue.") => new AppError("unauthorized", message),
  forbidden: (message = "You don't have access to that.") => new AppError("forbidden", message),
  notFound: (message = "We couldn't find that.") => new AppError("not_found", message),
  conflict: (message: string, details?: Record<string, string[]>) => new AppError("conflict", message, details),
  rateLimited: (retryAfterSeconds: number) => new AppError("rate_limited", "Too many attempts. Please wait a moment and try again.", undefined, retryAfterSeconds)
};
