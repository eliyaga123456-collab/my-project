import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppError } from "../lib/errors";

const DIR = join(tmpdir(), "ear-share-video");
const TTL_MS = 15 * 60_000;
export const VIDEO_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isPng = (b: Buffer) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
let running = 0;

async function sweep() {
  try {
    for (const f of await readdir(DIR)) {
      const p = join(DIR, f);
      if (Date.now() - (await stat(p)).mtimeMs > TTL_MS) await rm(p, { force: true });
    }
  } catch { /* directory not created yet */ }
}

function ffmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err = (err + d).slice(-400); });
    const timer = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("ffmpeg timeout")); }, 120_000);
    p.on("error", (e) => { clearTimeout(timer); reject(e); });
    p.on("close", (code) => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err}`)); });
  });
}

/** Turns a still card (PNG) into a 6 s vertical 1080x1920 MP4: slow push-in, fade in/out, on the brand background. */
export async function makeShareVideo(png: Buffer): Promise<string> {
  if (!isPng(png)) throw new AppError("unsupported_media", "Send the card as a PNG image.");
  if (running >= 2) throw new AppError("rate_limited", "The video maker is busy. Try again in a minute.", undefined, 30);
  running++;
  const id = randomUUID();
  try {
    await mkdir(DIR, { recursive: true });
    await sweep();
    const src = join(DIR, `${id}.png`);
    await writeFile(src, png);
    const vf = [
      "scale=1080:1920:force_original_aspect_ratio=decrease",
      "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0b0a14",
      "scale=1404:2496",
      "zoompan=z='1+0.07*on/150':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=150:s=1080x1920:fps=25",
      "fade=t=in:st=0:d=0.6",
      "fade=t=out:st=5.4:d=0.6",
      "format=yuv420p"
    ].join(",");
    await ffmpeg(["-y", "-loglevel", "error", "-loop", "1", "-i", src, "-vf", vf, "-t", "6", "-r", "25", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "27", "-movflags", "+faststart", "-an", join(DIR, `${id}.mp4`)]);
    await rm(src, { force: true });
    return id;
  } catch (e) {
    if (e instanceof AppError) throw e;
    console.error("[video] failed:", e instanceof Error ? e.message : e);
    throw new AppError("server_error", "We couldn't make the video right now. Share the image instead.");
  } finally { running--; }
}

export async function readShareVideo(id: string): Promise<Buffer | null> {
  if (!VIDEO_ID_RE.test(id)) return null;
  try { return await readFile(join(DIR, `${id}.mp4`)); } catch { return null; }
}
