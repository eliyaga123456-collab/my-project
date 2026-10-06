import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { makeShareVideo, readShareVideo } from "../../src/services/video";

describe("share video", () => {
  it("rejects non-PNG input", async () => {
    await expect(makeShareVideo(Buffer.from("not a png"))).rejects.toMatchObject({ code: "unsupported_media" });
  });
  it("turns a PNG card into a playable MP4", async () => {
    const png = await sharp({ create: { width: 540, height: 960, channels: 3, background: "#c83278" } }).png().toBuffer();
    const id = await makeShareVideo(png);
    const mp4 = await readShareVideo(id);
    expect(mp4).not.toBeNull();
    expect(mp4!.subarray(4, 8).toString()).toBe("ftyp");
    expect(await readShareVideo("../../etc/passwd")).toBeNull();
  }, 90_000);
});
