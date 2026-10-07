// Builds transparent logo assets from the supplied artwork in packages/tokens/brand/src (dark = on black, light = on white).
// Usage: node scripts/brand/logos.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const src = (n) => resolve(root, `packages/tokens/brand/src/${n}.webp`);

async function key(file, mode) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    let a;
    if (mode === "dark") { // artwork on black: alpha from brightness
      const m = Math.max(r, g, b);
      a = Math.min(255, Math.max(0, (m - 10) * 4.2));
      if (a > 0) { const k = 255 / Math.max(m, 1), t = a / 255; data[i] = Math.min(255, r * k * t + r * (1 - t)); data[i + 1] = Math.min(255, g * k * t + g * (1 - t)); data[i + 2] = Math.min(255, b * k * t + b * (1 - t)); }
    } else { // artwork on white: alpha from how far the darkest channel is from white
      const m = Math.min(r, g, b);
      const al = Math.min(1, Math.max(0, ((255 - m) / 255 - 0.03) * 3));
      a = al * 255;
      if (al > 0) { const inv = 1 - al * 0; data[i] = Math.max(0, Math.min(255, (r - 255 * (1 - Math.min(1, al))) / Math.max(al, 0.2))); data[i + 1] = Math.max(0, Math.min(255, (g - 255 * (1 - Math.min(1, al))) / Math.max(al, 0.2))); data[i + 2] = Math.max(0, Math.min(255, (b - 255 * (1 - Math.min(1, al))) / Math.max(al, 0.2))); void inv; }
    }
    data[i + 3] = a;
    if (a > 40) { const p = i / 4, x = p % W, y = (p / W) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left, top, width: Math.min(W - left, maxX - minX + 1 + pad * 2), height: Math.min(H - top, maxY - minY + 1 + pad * 2) });
}

const jobs = [
  ["ear-dark", "dark", ["apps/mobile/assets/ear-wordmark.png", "apps/web/public/brand/ear-wordmark.webp"]],
  ["ear-light", "light", ["apps/mobile/assets/ear-wordmark-light.png", "apps/web/public/brand/ear-wordmark-light.webp"]],
  ["ear-admin-dark", "dark", ["apps/admin/public/brand/ear-admin.webp", "admin-app/assets/ear-admin.png", "apps/web/public/brand/ear-admin.webp"]],
  ["ear-admin-light", "light", ["apps/admin/public/brand/ear-admin-light.webp", "admin-app/assets/ear-admin-light.png", "apps/web/public/brand/ear-admin-light.webp"]]
];
for (const [name, mode, outs] of jobs) {
  const img = await key(src(name), mode);
  for (const o of outs) {
    const p = resolve(root, o); mkdirSync(dirname(p), { recursive: true });
    const r = img.clone().resize({ width: 720 });
    writeFileSync(p, await (o.endsWith(".png") ? r.png({ compressionLevel: 9 }) : r.webp({ quality: 90, alphaQuality: 95 })).toBuffer());
    console.log("wrote", o);
  }
}
