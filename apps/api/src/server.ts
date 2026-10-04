import { buildApp } from "./app";
import { loadConfig } from "./config";
import { migrate } from "./db/migrate";

const config = loadConfig();
if (config.NODE_ENV !== "production" || process.env.AUTO_MIGRATE === "true") {
  await migrate(config.DATABASE_URL, (m) => console.log(`[migrate] ${m}`));
}
const { app } = await buildApp({ config });
await app.listen({ port: config.PORT, host: config.HOST });

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => { app.log.info({ sig }, "shutting down"); app.close().then(() => process.exit(0)); });
}
