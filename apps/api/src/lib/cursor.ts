import { E } from "./errors";

export interface Cursor { t: string; id: string }
export const encodeCursor = (t: Date | string, id: string) =>
  Buffer.from(JSON.stringify({ t: typeof t === "string" ? t : t.toISOString(), id })).toString("base64url");

export function decodeCursor(c?: string): Cursor | null {
  if (!c) return null;
  try {
    const v = JSON.parse(Buffer.from(c, "base64url").toString("utf8")) as Cursor;
    if (typeof v.t !== "string" || typeof v.id !== "string" || Number.isNaN(Date.parse(v.t)) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)) throw new Error();
    return v;
  } catch {
    throw E.validation("Invalid cursor");
  }
}
