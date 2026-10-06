import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { LIMITS } from "@unsaid/shared";
import type { Config } from "../config";
import { AppError } from "../lib/errors";

export interface StoredObject { body: Buffer; contentType: string }
export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  /** URL clients use to display the object. */
  publicUrl(key: string): string;
}

const KEY_RE = /^avatars\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
export const isValidKey = (k: string) => KEY_RE.test(k);

class LocalStorage implements StorageProvider {
  private root: string;
  constructor(dir: string) { this.root = resolve(dir); }
  private path(key: string) {
    if (!isValidKey(key)) throw new Error("invalid storage key");
    return join(this.root, key);
  }
  async put(key: string, body: Buffer) { const p = this.path(key); await mkdir(dirname(p), { recursive: true }); await writeFile(p, body); }
  async get(key: string) {
    if (!isValidKey(key)) return null;
    try { return { body: await readFile(this.path(key)), contentType: "image/webp" }; } catch { return null; }
  }
  async delete(key: string) { try { await unlink(this.path(key)); } catch { /* already gone */ } }
  publicUrl(key: string) { return `/media/${key}`; }
}

class S3Storage implements StorageProvider {
  private client: Promise<{ s3: import("@aws-sdk/client-s3").S3Client; sdk: typeof import("@aws-sdk/client-s3") }>;
  constructor(private cfg: Config) {
    this.client = import("@aws-sdk/client-s3").then((sdk) => ({
      sdk, s3: new sdk.S3Client({ region: cfg.S3_REGION, endpoint: cfg.S3_ENDPOINT, forcePathStyle: Boolean(cfg.S3_ENDPOINT) })
    }));
  }
  async put(key: string, body: Buffer, contentType: string) {
    const { s3, sdk } = await this.client;
    await s3.send(new sdk.PutObjectCommand({ Bucket: this.cfg.S3_BUCKET!, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  }
  async get(key: string) {
    if (!isValidKey(key)) return null;
    const { s3, sdk } = await this.client;
    try {
      const r = await s3.send(new sdk.GetObjectCommand({ Bucket: this.cfg.S3_BUCKET!, Key: key }));
      return { body: Buffer.from(await r.Body!.transformToByteArray()), contentType: r.ContentType ?? "image/webp" };
    } catch { return null; }
  }
  async delete(key: string) {
    const { s3, sdk } = await this.client;
    await s3.send(new sdk.DeleteObjectCommand({ Bucket: this.cfg.S3_BUCKET!, Key: key })).catch(() => undefined);
  }
  publicUrl(key: string) { return this.cfg.S3_PUBLIC_BASE_URL ? `${this.cfg.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}` : `/media/${key}`; }
}

export function createStorage(config: Config): StorageProvider {
  if (config.STORAGE_DRIVER === "s3") {
    if (!config.S3_BUCKET) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
    return new S3Storage(config);
  }
  return new LocalStorage(config.MEDIA_DIR);
}

function sniff(buf: Buffer): "jpeg" | "png" | "webp" | "gif" | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 10 && (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a")) return "gif";
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

const MAX_AVATAR_FRAMES = 100;
const MAX_AVATAR_TOTAL_PIXELS = 120_000_000;

/** Validates (magic bytes + size + decodability), strips ALL metadata (EXIF/GPS) by re-encoding, returns a 512px WebP (animated when the upload is an animated GIF/WebP). */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.length > LIMITS.avatarMaxBytes) throw new AppError("payload_too_large", "Image is too large (max 10 MB).");
  const kind = sniff(input);
  if (!kind) throw new AppError("unsupported_media", "Use a JPEG, PNG, GIF or WebP image.");
  const animated = kind === "gif" || kind === "webp";
  const opts = { animated, limitInputPixels: 40_000_000, failOn: "error" as const };
  try {
    if (animated) {
      // Bound the decode cost of animations: frame count and total pixels across frames.
      const meta = await sharp(input, opts).metadata();
      const frames = meta.pages ?? 1;
      const w = meta.width ?? 0;
      const h = meta.pageHeight ?? meta.height ?? 0;
      if (frames > MAX_AVATAR_FRAMES || w * h * frames > MAX_AVATAR_TOTAL_PIXELS) throw new AppError("payload_too_large", "That animation is too long or too big. Try a shorter GIF.");
    }
    const img = sharp(input, opts);
    return await (animated ? img : img.rotate())
      .resize(512, 512, { fit: "cover", position: animated ? "centre" : "attention" })
      .webp({ quality: animated ? 78 : 82, effort: animated ? 3 : 4 })
      .toBuffer();
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("unsupported_media", "We couldn't read that image. Try another file.");
  }
}
export const newAvatarKey = () => `avatars/${randomUUID()}.webp`;
