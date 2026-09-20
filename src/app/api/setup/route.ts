import { db } from "@/db";
import { users, agencies } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { ok, fail, json } from "@/lib/api";
import { hashPassword, setSessionCookie, getRequestMeta, rateLimit, recordLogin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";

/** GET /api/setup — whether first-run setup is required. */
export async function GET() {
  const [result] = await db.select({ value: count() }).from(users);
  return json({ needsSetup: result.value === 0 });
}

const setupSchema = z.object({
  agencyName: z.string().min(2).max(120),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(10).max(200),
});

/** POST /api/setup — create the first administrator (only when no users exist). */
export async function POST(req: Request) {
  const meta = await getRequestMeta();
  if (!rateLimit(`setup:${meta.ip}`, 10, 60_000)) return fail("Too many attempts", 429);

  const [existing] = await db.select({ value: count() }).from(users);
  if (existing.value > 0)
    return fail("Setup already completed. Use the login screen instead.", 409);

  const parsed = setupSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid setup payload: " + parsed.error.issues[0].message, 422);

  const { agencyName, name, email, password } = parsed.data;

  const [agency] = await db
    .insert(agencies)
    .values({
      name: agencyName,
      slug: agencyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agency",
      defaultLanguage: "en",
    })
    .returning();

  const [admin] = await db
    .insert(users)
    .values({
      agencyId: agency.id,
      name,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      status: "ACTIVE",
    })
    .returning();

  await setSessionCookie(admin.id);
  await recordLogin(admin.id, meta, true);
  await audit({
    action: "system.setup_completed",
    entityType: "user",
    entityId: admin.id,
    userId: admin.id,
    details: { agencyName, email: admin.email },
    ip: meta.ip,
  });

  return ok({ userId: admin.id, agencyId: agency.id });
}
