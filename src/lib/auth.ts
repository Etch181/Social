import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { sessions, users, clients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { sha256 } from "@/lib/crypto";

export const SESSION_COOKIE = "fox_session";
export const DEFAULT_SESSION_HOURS = 12;
export const REMEMBER_SESSION_HOURS = 24 * 30;

export type Role = "ADMIN" | "STAFF" | "CLIENT";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  clientId: string | null;
  agencyId: string | null;
  locale: string;
  permissions: string[];
  avatarUrl: string | null;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || process.env.JWT_SECRET || "fox-ai-social-insecure-dev-secret";
  return new TextEncoder().encode(s);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export async function createSessionToken(userId: string, remember = false): Promise<string> {
  return new SignJWT({ sub: userId, remember })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(remember ? `${REMEMBER_SESSION_HOURS}h` : `${DEFAULT_SESSION_HOURS}h`)
    .sign(secret());
}

export async function setSessionCookie(userId: string, remember = false) {
  const token = await createSessionToken(userId, remember);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: (remember ? REMEMBER_SESSION_HOURS : DEFAULT_SESSION_HOURS) * 3600,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;
  try {
    return await jwtVerify(token, secret());
  } catch {
    return null;
  }
}

/** Resolve the current request's user (server components + route handlers). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload?.payload?.sub) return null;

  const rows = await db.select().from(users).where(eq(users.id, payload.payload.sub as string)).limit(1);
  const u = rows[0];
  if (!u || u.status !== "ACTIVE") return null;

  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as Role,
    clientId: u.clientId ?? null,
    agencyId: u.agencyId ?? null,
    locale: u.locale ?? "en",
    permissions: (u.permissions as string[]) ?? [],
    avatarUrl: u.avatarUrl ?? null,
  };
}

export async function getRequestMeta() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local",
    userAgent: h.get("user-agent") ?? "unknown",
    origin: h.get("origin") ?? process.env.APP_URL ?? "",
  };
}

export function hasRole(user: SessionUser, ...roles: Role[]) {
  return roles.includes(user.role);
}

export function can(user: SessionUser, permission: string) {
  if (user.role === "ADMIN") return true;
  return user.permissions.includes(permission) || user.permissions.includes("*");
}

/**
 * Tenant isolation guard. CLIENT users are hard-locked to their own workspace.
 * ADMIN / STAFF may operate on any client, but only within the agency scope.
 */
export async function assertClientAccess(user: SessionUser, clientId: string): Promise<boolean> {
  if (!clientId) return false;
  if (user.role === "CLIENT") return user.clientId === clientId;
  const rows = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);
  return rows.length > 0;
}

export async function visibleClientIds(user: SessionUser): Promise<string[] | null> {
  if (user.role === "CLIENT") return user.clientId ? [user.clientId] : [];
  return null; // null == all clients in the agency
}

export async function recordLogin(userId: string, meta: { ip: string; userAgent: string }, remember: boolean) {
  const token = await createSessionToken(userId, remember);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    ip: meta.ip,
    userAgent: meta.userAgent.slice(0, 250),
    remember,
    expiresAt: new Date(Date.now() + (remember ? REMEMBER_SESSION_HOURS : DEFAULT_SESSION_HOURS) * 3600_000),
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
}

export async function revokeAllSessions(userId: string) {
  await db.delete(sessions).where(and(eq(sessions.userId, userId)));
}

// ---------------------------------------------------------------------------
// Rate limiting (per-process). For multi-instance deployments replace the
// in-memory store with Redis — see docs/SECURITY.md.
// ---------------------------------------------------------------------------
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  bucket.count += 1;
  if (bucket.count > limit) return false;
  return true;
}
