import { describe, expect, it } from "vitest";
import { ApiError } from "@unsaid/api-client";
import { classifySendError, fieldErrors, formatWait } from "./errors";

describe("classifySendError", () => {
  it("maps API codes to friendly states", () => {
    expect(classifySendError(new ApiError("link_paused", "x", 423)).kind).toBe("paused");
    expect(classifySendError(new ApiError("not_found", "x", 404)).kind).toBe("not_found");
    const rl = classifySendError(new ApiError("rate_limited", "x", 429, undefined, 90));
    expect(rl.kind).toBe("rate_limited");
    expect(rl.kind === "rate_limited" && rl.message).toContain("2 minutes");
    expect(classifySendError(new ApiError("moderation_rejected", "x", 422)).kind).toBe("rejected");
    expect(classifySendError(new Error("boom")).kind).toBe("error");
  });
});

describe("fieldErrors", () => {
  it("extracts first message per field", () => {
    const e = new ApiError("validation_error", "bad", 422, { email: ["Invalid", "x"], username: ["Taken"] });
    expect(fieldErrors(e)).toEqual({ email: "Invalid", username: "Taken" });
    expect(fieldErrors(new Error("x"))).toEqual({});
  });
});

describe("formatWait", () => {
  it("formats", () => {
    expect(formatWait(5)).toBe("5 seconds");
    expect(formatWait(60)).toBe("a minute");
    expect(formatWait(600)).toBe("10 minutes");
  });
});
