import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processAvatar } from "../../src/services/storage";

const frame = (c: string) => sharp({ create: { width: 40, height: 40, channels: 3, background: c } }).png().toBuffer();
const gif = async (n: number) => sharp(await Promise.all(Array.from({ length: n }, (_, i) => frame(i % 2 ? "#ff0000" : "#0000ff"))), { join: { animated: true, across: 1 } }).gif({ delay: Array(n).fill(80), loop: 0 }).toBuffer();

describe("processAvatar", () => {
  it("re-encodes a static image to a 512px WebP", async () => {
    const out = await processAvatar(await sharp({ create: { width: 900, height: 600, channels: 3, background: "#ff7440" } }).jpeg().toBuffer());
    const m = await sharp(out).metadata();
    expect([m.format, m.width, m.height, m.pages ?? 1]).toEqual(["webp", 512, 512, 1]);
  });
  it("keeps an animated GIF animated (animated WebP, square 512)", async () => {
    const out = await processAvatar(await gif(4));
    const m = await sharp(out, { animated: true }).metadata();
    expect(m.format).toBe("webp");
    expect(m.pages).toBe(4);
    expect(m.width).toBe(512);
    expect(m.pageHeight).toBe(512);
  });
  it("rejects animations with too many frames", async () => {
    await expect(processAvatar(await gif(101))).rejects.toMatchObject({ code: "payload_too_large" });
  });
  it("rejects files that are not images, even with an image-looking name", async () => {
    await expect(processAvatar(Buffer.from("GIF89a-but-not-really-a-gif-at-all"))).rejects.toBeTruthy();
    await expect(processAvatar(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).rejects.toMatchObject({ code: "unsupported_media" });
  });
});
