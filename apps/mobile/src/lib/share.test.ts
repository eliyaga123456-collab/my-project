import { describe, expect, it } from "vitest";
import { setRuntimeLocale } from "../i18n/core";
import { answerUrl, installUrl, inviteMessage, linkShareMessage, linkUrl, safely } from "./share";

describe("share builders", () => {
  it("builds primary and round URLs from WEB_URL", () => {
    expect(linkUrl("https://x.app/", { isPrimary: true, slug: "s", url: "http://localhost:3000/u/a" }, "alice")).toBe("https://x.app/u/alice");
    expect(linkUrl("https://x.app", { isPrimary: false, slug: "ab12", url: "http://localhost/l/ab12" }, "alice")).toBe("https://x.app/l/ab12");
    expect(installUrl("https://x.app//")).toBe("https://x.app/install");
    expect(answerUrl("https://x.app", "id1")).toBe("https://x.app/a/id1");
  });
  it("falls back to the server URL when the username is unknown", () => {
    expect(linkUrl("https://x.app", { isPrimary: true, slug: "s", url: "https://srv/u/a" }, undefined)).toBe("https://srv/u/a");
  });
  it("localizes the message and strips bidi marks", () => {
    setRuntimeLocale("he");
    const m = linkShareMessage("מה דעתך?", "https://x.app/u/a");
    expect(m).toContain("https://x.app/u/a");
    expect(m).not.toMatch(/[⁦-⁩]/);
    expect(inviteMessage("me.inviteMessage", "https://x.app/install")).toContain("https://x.app/install");
    setRuntimeLocale("en");
  });
  it("safely swallows errors and reports them", async () => {
    let seen: unknown;
    expect(await safely(async () => { throw new Error("boom"); }, (e) => { seen = e; })).toBe(false);
    expect((seen as Error).message).toBe("boom");
    expect(await safely(async () => 1)).toBe(true);
  });
});
