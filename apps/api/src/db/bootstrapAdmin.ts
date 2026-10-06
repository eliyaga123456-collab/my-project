import { eq } from "drizzle-orm";
import type { Config } from "../config";
import { hashPassword } from "../lib/crypto";
import { generateSlug } from "../services/slug";
import { createDb } from "./client";
import { links, profiles, settings, users } from "./schema";

/**
 * Creates the first admin from ADMIN_BOOTSTRAP_EMAIL / ADMIN_BOOTSTRAP_PASSWORD when the platform has no admin yet.
 * It never promotes an existing account (someone could have registered that email first) and never runs with a weak password.
 */
export async function bootstrapAdmin(config: Config, log: (m: string) => void = console.log) {
  const email = config.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  const password = config.ADMIN_BOOTSTRAP_PASSWORD;
  if (!email || !password) return;
  const { db, pool } = createDb(config.DATABASE_URL);
  try {
    const [anyAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
    if (anyAdmin) { log("[admin] an admin already exists; ADMIN_BOOTSTRAP_* ignored (remove them from the environment)"); return; }
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (taken) { log(`[admin] ${email} is already a regular account; refusing to promote it. Use a different ADMIN_BOOTSTRAP_EMAIL.`); return; }
    await db.transaction(async (tx) => {
      const [u] = await tx.insert(users).values({ email, username: "admin_ear", passwordHash: await hashPassword(password), role: "admin", emailVerifiedAt: new Date() }).returning();
      await tx.insert(profiles).values({ userId: u!.id, displayName: "EAR Admin" });
      await tx.insert(settings).values({ userId: u!.id, notifications: { inAppNewMessage: true, pushNewMessage: true, emailNewMessage: false, emailDigest: false, pushActivity: true, emailSafety: true } });
      await tx.insert(links).values({ userId: u!.id, slug: generateSlug(), label: "My link", isPrimary: true });
    });
    log(`[admin] first admin created: ${email} (now remove ADMIN_BOOTSTRAP_* from the environment)`);
  } finally {
    await pool.end();
  }
}
