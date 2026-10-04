import { eq } from "drizzle-orm";
import { loadConfig } from "../config";
import { hashPassword } from "../lib/crypto";
import { createDb } from "./client";
import { links, profiles, settings, users } from "./schema";
import { generateSlug } from "../services/slug";

const config = loadConfig();
if (config.isProd && config.ADMIN_SEED_PASSWORD === "change-me-please-123") {
  console.error("Refusing to seed an admin with the default password in production. Set ADMIN_SEED_PASSWORD.");
  process.exit(1);
}
const { db, pool } = createDb(config.DATABASE_URL);
const email = config.ADMIN_SEED_EMAIL.toLowerCase();
const [existing] = await db.select().from(users).where(eq(users.email, email));
if (existing) {
  await db.update(users).set({ role: "admin", status: "active", emailVerifiedAt: existing.emailVerifiedAt ?? new Date() }).where(eq(users.id, existing.id));
  console.log(`admin already exists: ${email}`);
} else {
  await db.transaction(async (tx) => {
    const [u] = await tx.insert(users).values({ email, username: "admin_unsaid", passwordHash: await hashPassword(config.ADMIN_SEED_PASSWORD), role: "admin", emailVerifiedAt: new Date() }).returning();
    await tx.insert(profiles).values({ userId: u!.id, displayName: "EAR Admin" });
    await tx.insert(settings).values({ userId: u!.id, notifications: { inAppNewMessage: true, pushNewMessage: true, emailNewMessage: false, emailDigest: false, pushActivity: true, emailSafety: true } });
    await tx.insert(links).values({ userId: u!.id, slug: generateSlug(), label: "My link", isPrimary: true });
  });
  console.log(`admin created: ${email}`);
}
await pool.end();
