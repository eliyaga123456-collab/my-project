import type { NextConfig } from "next";

const API_URL = (process.env.API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const isDev = process.env.NODE_ENV !== "production";

// Next.js emits small inline bootstrap scripts, so script-src needs 'unsafe-inline' unless nonces are used.
// We never use dangerouslySetInnerHTML; dev additionally needs 'unsafe-eval' for React refresh.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${new URL(API_URL).origin}`,
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@unsaid/shared", "@unsaid/api-client", "@unsaid/tokens"],
  async rewrites() {
    return [
      { source: "/admin-ui", destination: "/admin-ui/index.html" },
      { source: "/admin-ui/", destination: "/admin-ui/index.html" },
      { source: "/api/v1/:path*", destination: `${API_URL}/api/v1/:path*` },
      { source: "/media/:path*", destination: `${API_URL}/media/:path*` }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }
        ]
      }
    ];
  }
};

export default config;
