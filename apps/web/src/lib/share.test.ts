import { describe, expect, it } from "vitest";
import { shareLinks } from "@/components/public/ShareActions";

describe("shareLinks", () => {
  it("encodes url and text", () => {
    const links = shareLinks("https://x.test/a/1?x=1&y=2", "hi there & bye");
    const x = links.find((l) => l.id === "x")!;
    expect(x.href).toContain(encodeURIComponent("https://x.test/a/1?x=1&y=2"));
    expect(x.href).toContain("hi%20there%20%26%20bye");
    expect(links.map((l) => l.id)).toEqual(["x", "whatsapp", "telegram", "facebook", "email"]);
  });
});
