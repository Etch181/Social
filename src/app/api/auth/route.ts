import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, fail, json } from "@/lib/api";
import {
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  getRequestMeta,
  rateLimit,
  recordLogin,
  getCurrentUser,
  revokeAllSessions,
} from "@/lib/auth";
import { audit } from "@/lib/audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const meta = await getRequestMeta();
  const body = await req.json().catch(() => ({}));
  const mode = (body?.action as string) ?? "login";

  if (mode === "logout") {
    await clearSessionCookie();
    return ok({ loggedOut: true });
  }

  if (mode === "change-password") {
    const user = await getCurrentUser();
    if (!user) return fail("Authentication required", 401);
    const parsed = z
      .object({ currentPassword: z.string().min(1), newPassword: z.string().min(10) })
      .safeParse(body);
    if (!parsed.success) return fail("Invalid password payload", 422);

    const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash)))
      return fail("Current password is incorrect", 400);

    await db
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await revokeAllSessions(user.id);
    await setSessionCookie(user.id);
    await audit({ action: "auth.password_changed", entityType: "user", entityId: user.id, userId: user.id, ip: meta.ip });
    return ok();
  }

  // login
  if (!rateLimit(`login:${meta.ip}`, 20, 60_000)) return fail("Too many login attempts. Try again later.", 429);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail("auth.invalid", 422);

  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !valid) {
    await audit({
      action: "auth.login_failed",
      entityType: "user",
      details: { email },
      ip: meta.ip,
    });
    return fail("Invalid email or password", 401);
  }

  if (user.status !== "ACTIVE") return fail("This account is disabled", 403);

  await setSessionCookie(user.id, parsed.data.remember);
  await recordLogin(user.id, meta, parsed.data.remember);
  await audit({
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    userId: user.id,
    details: { email, remember: parsed.data.remember },
    ip: meta.ip,
  });

  return ok({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ authenticated: false }, 200);

  const recent = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, "auth.login"))
    .limit(1);

  return json({
    authenticated: true,
    user,
    lastLogin: recent[0]?.createdAt ?? null,
  });
}
