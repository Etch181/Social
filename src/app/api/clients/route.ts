import { db } from "@/db";
import { clients, brandKits, contentItems, campaigns, socialAccounts } from "@/db/schema";
import { eq, desc, or, ilike, and } from "drizzle-orm";
import { z } from "zod";
import { ok, fail, requireAuth } from "@/lib/api";
import { getRequestMeta, rateLimit } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sanitizeSheetName, getServiceAccount, ensureSheet } from "@/lib/sheets/google";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { user } = auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");

  const filters = [];
  if (user.role === "CLIENT" && user.clientId) filters.push(eq(clients.id, user.clientId));
  if (search) filters.push(or(ilike(clients.name, `%${search}%`), ilike(clients.industry, `%${search}%`)));
  if (status) filters.push(eq(clients.status, status));

  const rows = await db
    .select()
    .from(clients)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(clients.createdAt))
    .limit(200);

  return ok({ clients: rows });
}

const createSchema = z.object({
  name: z.string().min(2).max(180),
  brandName: z.string().max(180).optional(),
  industry: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().max(300).optional(),
  contactName: z.string().max(160).optional(),
  contactEmail: z.string().max(190).optional(),
  contactPhone: z.string().max(60).optional(),
  country: z.string().max(90).optional(),
  timezone: z.string().max(80).optional(),
  language: z.enum(["en", "ar"]).optional(),
  tone: z.string().max(120).optional(),
  targetAudience: z.string().max(1200).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth(["ADMIN", "STAFF"]);
  if (auth.response) return auth.response;
  const { user } = auth;

  const meta = await getRequestMeta();
  if (!rateLimit(`client-create:${user.id}`, 30, 60_000)) return fail("Rate limit exceeded", 429);

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid client data: " + parsed.error.issues[0].message, 422);

  const data = parsed.data;
  const [client] = await db
    .insert(clients)
    .values({
      agencyId: user.agencyId,
      name: data.name,
      brandName: data.brandName ?? data.name,
      industry: data.industry ?? null,
      description: data.description ?? null,
      website: data.website ?? null,
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      country: data.country ?? null,
      timezone: data.timezone ?? "UTC",
      language: data.language ?? "en",
    })
    .returning();

  await db.insert(brandKits).values({
    clientId: client.id,
    tone: data.tone ?? null,
    targetAudience: data.targetAudience ?? null,
    brandDescription: data.description ?? null,
  });

  // Google Sheets: automatically create the dedicated client worksheet.
  if (getServiceAccount()) {
    try {
      const tab = sanitizeSheetName(`Client_${data.brandName || data.name}_${client.id.slice(0, 6)}`);
      await ensureSheet(getServiceAccount()!, tab);
      await db.update(clients).set({ sheetTabName: tab }).where(eq(clients.id, client.id));
    } catch (err) {
      console.error("[clients] sheet tab creation failed", err);
    }
  }

  await audit({
    action: "client.created",
    entityType: "client",
    entityId: client.id,
    clientId: client.id,
    userId: user.id,
    details: { name: client.name },
    ip: meta.ip,
  });

  return ok({ client });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth(["ADMIN", "STAFF"]);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const id = body?.id as string | undefined;
  if (!id) return fail("Client id is required", 400);

  const parsed = createSchema.partial().safeParse(body);
  if (!parsed.success) return fail("Invalid client data", 422);

  const [updated] = await db
    .update(clients)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(clients.id, id))
    .returning();

  if (!updated) return fail("Client not found", 404);

  await audit({
    action: "client.updated",
    entityType: "client",
    entityId: id,
    clientId: id,
    userId: auth.user.id,
    details: { fields: Object.keys(parsed.data).join(",") },
  });

  return ok({ client: updated });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(["ADMIN"]);
  if (auth.response) return auth.response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("Client id is required", 400);

  await db.delete(clients).where(eq(clients.id, id));
  await audit({
    action: "client.deleted",
    entityType: "client",
    entityId: id,
    clientId: id,
    userId: auth.user.id,
    details: {},
  });

  return ok({ deleted: id });
}
