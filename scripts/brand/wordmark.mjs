// Turns the supplied glossy "EAR" wordmark (packages/tokens/brand/ear-wordmark-source.webp, on black) into app/web assets.
// Usage: node scripts/brand/wordmark.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const src = readFileSync(resolve(root, "packages/tokens/brand/ear-wordmark-source.webp")).toString("base64");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");

/** In the browser: draw the source, key out the black (alpha from brightness, colours un-premultiplied), crop to content, resize. */
const render = (opts) => page.evaluate(async ({ src, opts }) => {
  const img = new Image();
  img.src = `data:image/webp;base64,${src}`;
  await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, W, H);
  let minX = W, minY = H, maxX = 0, maxY = 0;
  if (opts.key) {
    for (let i = 0; i < d.data.length; i += 4) {
      const r = d.data[i], g = d.data[i + 1], b = d.data[i + 2];
      const m = Math.max(r, g, b);
      const a = Math.min(255, Math.max(0, (m - 10) * 4.2));           // soft key: near-black -> transparent
      if (a > 0) { const k = 255 / Math.max(m, 1); d.data[i] = Math.min(255, r * k * (a / 255) + r * (1 - a / 255)); d.data[i + 1] = Math.min(255, g * k * (a / 255) + g * (1 - a / 255)); d.data[i + 2] = Math.min(255, b * k * (a / 255) + b * (1 - a / 255)); }
      d.data[i + 3] = a;
      if (a > 40) { const p = i / 4, px = p % W, py = (p / W) | 0; if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
    }
    x.putImageData(d, 0, 0);
  } else { minX = 0; minY = 0; maxX = W - 1; maxY = H - 1; }
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const pad = opts.key ? Math.round(Math.max(cw, ch) * 0.04) : 0;
  const scale = opts.width ? opts.width / (cw + pad * 2) : 1;
  const out = document.createElement("canvas");
  out.width = opts.square ? opts.square : Math.round((cw + pad * 2) * scale);
  out.height = opts.square ? opts.square : Math.round((ch + pad * 2) * scale);
  const ox = opts.square ? opts.square : out.width;
  const o = out.getContext("2d");
  if (opts.bg) { o.fillStyle = opts.bg; o.fillRect(0, 0, out.width, out.height); }
  if (opts.square) {
    const inner = opts.square * (opts.fill ?? 0.8);
    const s = inner / Math.max(cw, ch);
    o.drawImage(c, minX, minY, cw, ch, (out.width - cw * s) / 2, (out.height - ch * s) / 2, cw * s, ch * s);
  } else {
    o.drawImage(c, minX - pad, minY - pad, cw + pad * 2, ch + pad * 2, 0, 0, out.width, out.height);
  }
  return out.toDataURL(opts.mime ?? "image/png", 0.92).split(",")[1];
}, { src, opts });

const write = async (file, opts) => { const out = resolve(root, file); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, Buffer.from(await render(opts), "base64")); console.log("wrote", file); };

await write("apps/mobile/assets/ear-wordmark.png", { key: true, width: 720 });                       // in-app logo (transparent)
await write("apps/web/public/brand/ear-wordmark.webp", { key: true, width: 640, mime: "image/webp" }); // website logo (transparent)
await write("apps/mobile/assets/icon.png", { key: false, square: 1024, bg: "#000000", fill: 1 });      // store/launcher icon: the original artwork on black
await write("apps/mobile/assets/adaptive-icon.png", { key: true, square: 1024, fill: 0.56 });          // Android adaptive foreground (safe zone)
await write("apps/mobile/assets/splash-icon.png", { key: true, square: 1024, fill: 0.78 });
for (const d of ["apps/web/public/icons", "site/icons"]) {
  await write(`${d}/icon-192.png`, { key: true, square: 192, bg: "#000000", fill: 0.84 });
  await write(`${d}/icon-512.png`, { key: true, square: 512, bg: "#000000", fill: 0.84 });
  await write(`${d}/maskable-512.png`, { key: true, square: 512, bg: "#000000", fill: 0.6 });
  await write(`${d}/apple-touch-icon.png`, { key: true, square: 180, bg: "#000000", fill: 0.84 });
}
await browser.close();
