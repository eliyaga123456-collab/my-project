// Rasterises the EAR ear mark (packages/tokens/brand/ear-mark.svg) into every icon the apps need.
// Usage: node scripts/brand/generate.mjs   (needs Chromium: PLAYWRIGHT_BROWSERS_PATH or /opt/pw-browsers)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const markSvg = readFileSync(resolve(root, "packages/tokens/brand/ear-mark.svg"), "utf8");
const inner = markSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, ""); // defs + groups
const VIEWBOX = "-10 -3 76 76";
const BG = "#0b0a14";
const mono = inner.replace(/url\(#g\)/g, "#fff").replace(/<defs>[\s\S]*?<\/defs>/, "");

/** Mark centred in a square canvas, occupying `scale` of it. */
const page = ({ size, scale, bg, glow, markup = inner, radius = 0 }) => `<html><body style="margin:0;background:transparent">
<div style="width:${size}px;height:${size}px;position:relative;border-radius:${radius}px;overflow:hidden;background:${bg ?? "transparent"}">
${glow ? `<div style="position:absolute;inset:0;background:radial-gradient(circle at 38% 34%,rgba(178,76,255,.35),transparent 62%),radial-gradient(circle at 80% 90%,rgba(255,116,64,.22),transparent 55%)"></div>` : ""}
<svg viewBox="${VIEWBOX}" width="${size * scale}" height="${size * scale}" style="position:absolute;left:${(size * (1 - scale)) / 2}px;top:${(size * (1 - scale)) / 2}px" fill="none">${markup}</svg>
</div></body></html>`;

const jobs = [
  // [file, size, opts]
  ["apps/mobile/assets/icon.png", 1024, { scale: 0.7, bg: BG, glow: true }],
  ["apps/mobile/assets/adaptive-icon.png", 1024, { scale: 0.5 }], // Android masks to ~66% safe zone
  ["apps/mobile/assets/splash-icon.png", 1024, { scale: 0.62 }],
  ["apps/mobile/assets/notification-icon.png", 96, { scale: 0.86, markup: mono }],
  ["apps/mobile/assets/favicon.png", 48, { scale: 0.86, bg: BG, radius: 10 }],
  ...["apps/web/public/icons", "site/icons"].flatMap((d) => [
    [`${d}/icon-192.png`, 192, { scale: 0.7, bg: BG, glow: true, radius: 40 }],
    [`${d}/icon-512.png`, 512, { scale: 0.7, bg: BG, glow: true, radius: 108 }],
    [`${d}/maskable-512.png`, 512, { scale: 0.52, bg: BG, glow: true }],
    [`${d}/apple-touch-icon.png`, 180, { scale: 0.7, bg: BG, glow: true }]
  ])
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
for (const [file, size, o] of jobs) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page({ size, ...o }));
  const out = resolve(root, file);
  mkdirSync(dirname(out), { recursive: true });
  await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await p.close();
  console.log("wrote", file);
}
await browser.close();

// Vector favicon for the web app (Next serves src/app/icon.svg).
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="${BG}"/><svg x="6" y="6" width="52" height="52" viewBox="${VIEWBOX}">${inner}</svg></svg>\n`;
writeFileSync(resolve(root, "apps/web/src/app/icon.svg"), svgIcon);
console.log("wrote apps/web/src/app/icon.svg");
