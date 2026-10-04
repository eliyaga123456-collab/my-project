import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

const require = createRequire(import.meta.url);
// Hoisted deps (react-router) live in the repo root where react is not installed; pin one copy of React.
const pkgDir = (name: string) => path.dirname(require.resolve(`${name}/package.json`));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_URL || "http://localhost:4000";
  const proxy = { "/api/v1": { target, changeOrigin: false }, "/media": { target, changeOrigin: false } };
  return {
    // @vitejs/plugin-react@6 resolves the hoisted vite@7 in this workspace; use Vite 8's built-in JSX transform instead.
    oxc: { jsx: { runtime: "automatic" } },
    resolve: { alias: { react: pkgDir("react"), "react-dom": pkgDir("react-dom") } },
    server: { port: 3100, proxy },
    preview: { port: 3100, proxy },
    test: { environment: "node", include: ["src/**/*.test.ts"] }
  };
});
