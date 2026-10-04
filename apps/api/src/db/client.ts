import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>["db"];

/** Neon connection strings carry `channel_binding=require`, which node-postgres does not understand. */
export function cleanDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

export function createDb(url: string) {
  const pool = new pg.Pool({ connectionString: cleanDatabaseUrl(url), max: 10, idleTimeoutMillis: 30_000, statement_timeout: 15_000 });
  pool.on("error", () => { /* idle client errors are surfaced on next query */ });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
export { schema };
