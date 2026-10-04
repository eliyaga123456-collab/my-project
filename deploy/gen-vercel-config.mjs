#!/usr/bin/env node
// Vercel rewrites cannot read env vars, so we generate vercel.json from API_URL.
// Usage:  API_URL=https://ear-api.onrender.com node deploy/gen-vercel-config.mjs [admin|web|all]
// Run it locally and COMMIT the result (Vercel reads vercel.json from the repo, before the build runs).
// web: the Next.js app already rewrites via next.config.ts (reads API_URL at build) so its vercel.json only pins monorepo install/build.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] ?? "all";
const raw = process.env.API_URL;
if (!raw) { console.error("API_URL is required, e.g. https://ear-api.onrender.com"); process.exit(1); }
const api = new URL(raw).origin;
const write = (p, o) => { writeFileSync(join(root, p), JSON.stringify(o, null, 2) + "\n"); console.log("wrote", p, "->", api); };

if (target === "admin" || target === "all") {
  write("apps/admin/vercel.json", {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: "vite",
    installCommand: "cd ../.. && npm ci",
    buildCommand: "npm run build",
    outputDirectory: "dist",
    rewrites: [
      { source: "/api/v1/:path*", destination: `${api}/api/v1/:path*` },
      { source: "/media/:path*", destination: `${api}/media/:path*` },
      { source: "/((?!api/v1|media|assets/).*)", destination: "/index.html" }
    ],
    headers: [{ source: "/(.*)", headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }
    ] }]
  });
}
if (target === "web" || target === "all") {
  write("apps/web/vercel.json", {
    $schema: "https://openapi.vercel.sh/vercel.json",
    framework: "nextjs",
    installCommand: "cd ../.. && npm ci",
    buildCommand: "next build"
  });
}
