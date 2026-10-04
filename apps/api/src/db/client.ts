import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>["db"];

export function createDb(url: string) {
  const pool = new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000, statement_timeout: 15_000 });
  pool.on("error", () => { /* idle client errors are surfaced on next query */ });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
export { schema };
