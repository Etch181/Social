import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser, type SessionUser, type Role } from "@/lib/auth";

export const json = (data: unknown, init: number | ResponseInit = 200) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

export const ok = (data: Record<string, unknown> = {}) => json({ ok: true, ...data });

export const fail = (message: string, status = 400, extra: Record<string, unknown> = {}) =>
  json({ ok: false, error: message, ...extra }, status);

export function handleError(err: unknown) {
  if (err instanceof ZodError) {
    return fail(err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · "), 422);
  }
  console.error("[api] unhandled error", err);
  return fail("Internal server error", 500);
}

/**
 * Standard API guard: authentication + role authorization.
 * Returns either `{ user }` or `{ response }` — always check `response`.
 */
export async function requireAuth(roles?: Role[]): Promise<
  { user: SessionUser; response?: undefined } | { user?: undefined; response: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) return { response: fail("Authentication required", 401) };
  if (roles && roles.length && !roles.includes(user.role))
    return { response: fail("Insufficient permissions", 403) };
  return { user };
}

export function parseBody<T>(schema: { parse: (v: unknown) => T }, body: unknown): T {
  return schema.parse(body);
}
