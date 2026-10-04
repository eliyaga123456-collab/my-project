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

function sniff(buf: Buffer): "jpeg" | "png" | "webp" | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

/** Validates (magic bytes + size + decodability), strips ALL metadata (EXIF/GPS) by re-encoding, returns a 512px WebP. */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.length > LIMITS.avatarMaxBytes) throw new AppError("payload_too_large", "Image is too large (max 10 MB).");
  if (!sniff(input)) throw new AppError("unsupported_media", "Use a JPEG, PNG or WebP image.");
  try {
    return await sharp(input, { limitInputPixels: 40_000_000, failOn: "error" })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new AppError("unsupported_media", "We couldn't read that image. Try another file.");
  }
}
export const newAvatarKey = () => `avatars/${randomUUID()}.webp`;
