import { describe, expect, it } from "vitest";
import { ApiError } from "@unsaid/api-client";
import { isTransient } from "./errors";

describe("isTransient (session restore must not log the user out)", () => {
  it("keeps the session on network / cold-start / server errors", () => {
    expect(isTransient(new ApiError("network_error", "x", 0))).toBe(true);
    expect(isTransient(new ApiError("server_error", "x", 503))).toBe(true);
    expect(isTransient(new ApiError("rate_limited", "x", 429))).toBe(true);
    expect(isTransient(new TypeError("boom"))).toBe(true);
  });
  it("drops the session only on real auth failures", () => {
    expect(isTransient(new ApiError("unauthorized", "x", 401))).toBe(false);
  });
});
