// Launcher / splash icons from the supplied logos. Usage: node scripts/brand/icons.mjs
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const at = (p) => resolve(root, p);
const S = 1024;

async function fit(logo, scale) {
  const w = Math.round(S * scale);
  const buf = await sharp(at(logo)).resize({ width: w, height: Math.round(S * scale), fit: "inside" }).toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, left: Math.round((S - m.width) / 2), top: Math.round((S - m.height) / 2) };
}
const bg = (a, b) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><radialGradient id="g" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><rect width="${S}" height="${S}" fill="url(#g)"/></svg>`);

async function set({ logo, dir, bgA, bgB }) {
  const f = await fit(logo, 0.8);
  await sharp(bg(bgA, bgB)).composite([{ input: f.buf, left: f.left, top: f.top }]).png().toFile(at(`${dir}/icon.png`));
  const g = await fit(logo, 0.62); // adaptive foreground: keep inside the 66% safe zone
  const fg = sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: g.buf, left: g.left, top: g.top }]).png();
  await fg.toFile(at(`${dir}/adaptive-icon.png`));
  // Android 13+ themed icon: a single-colour silhouette (the system tints it to the wallpaper colours).
  const { data, info } = await sharp(await fg.toBuffer()).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) { const a = data[i + 3] > 60 ? 255 : 0; data[i] = data[i + 1] = data[i + 2] = 255; data[i + 3] = a; }
  await sharp(data, { raw: info }).png().toFile(at(`${dir}/monochrome-icon.png`));
  const s = await fit(logo, 0.6);
  await sharp({ create: { width: S, height: S, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: s.buf, left: s.left, top: s.top }]).png().toFile(at(`${dir}/splash-icon.png`));
  console.log("icons written to", dir);
}
await set({ logo: "apps/mobile/assets/ear-wordmark.png", dir: "apps/mobile/assets", bgA: "#2a1450", bgB: "#0b0a14" });
await set({ logo: "admin-app/assets/ear-admin.png", dir: "admin-app/assets", bgA: "#3a0f2e", bgB: "#0b0a14" });
await sharp(at("apps/mobile/assets/icon.png")).resize(48, 48).png().toFile(at("apps/mobile/assets/favicon.png"));
