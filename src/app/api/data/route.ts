import { db } from "@/db";
import {
  approvals,
  agentRuns,
  auditLogs,
  campaigns,
  clients,
  contentItems,
  conversations,
  leads,
  messages,
  notifications,
  socialAccounts,
  syncRuns,
  users,
  brandKits,
} from "@/db/schema";
import { desc, eq, and, ilike, or, count, sql, inArray } from "drizzle-orm";
import { ok, fail, requireAuth } from "@/lib/api";

/**
 * Generic, tenant-guarded read endpoint.
 * Every `type` below applies server-side ownership filtering — the frontend
 * never decides what a CLIENT user is allowed to see.
 */
export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { user } = auth;

  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const clientId = url.searchParams.get("clientId");
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

  const ownOnly = user.role === "CLIENT" && user.clientId;
  const scopedClientId = ownOnly ? user.clientId : clientId;



  switch (type) {
    case "clients": {
      const filters = [];
      if (ownOnly && user.clientId) filters.push(eq(clients.id, user.clientId));
      if (q)
        filters.push(
          or(
            ilike(clients.name, `%${q}%`),
            ilike(clients.industry, `%${q}%`),
            ilike(clients.brandName, `%${q}%`),
          )!,
        );
      const rows = await db
        .select()
        .from(clients)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(clients.createdAt))
        .limit(limit);
      return ok({ rows });
    }

    case "brandKits": {
      const rows = scopedClientId
        ? await db.select().from(brandKits).where(eq(brandKits.clientId, scopedClientId)).limit(limit)
        : await db.select().from(brandKits).limit(limit);
      return ok({ rows });
    }

    case "campaigns": {
      const filters = [];
      if (scopedClientId) filters.push(eq(campaigns.clientId, scopedClientId));
      if (q) filters.push(or(ilike(campaigns.name, `%${q}%`))!);
      const rows = await db
        .select()
        .from(campaigns)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(campaigns.createdAt))
        .limit(limit);
      return ok({ rows });
    }

    case "content": {
      const filters = [];
      if (scopedClientId) filters.push(eq(contentItems.clientId, scopedClientId));
      if (q) filters.push(or(ilike(contentItems.title, `%${q}%`), ilike(contentItems.body, `%${q}%`))!);
      const rows = await db
        .select()
        .from(contentItems)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(contentItems.updatedAt))
        .limit(limit);
      return ok({ rows });
    }

    case "approvals": {
      const filters = [];
      if (scopedClientId) filters.push(eq(approvals.clientId, scopedClientId));
      const rows = await db
        .select({
          approval: approvals,
          content: contentItems,
        })
        .from(approvals)
        .leftJoin(contentItems, eq(approvals.contentId, contentItems.id))
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(approvals.createdAt))
        .limit(limit);
      return ok({ rows });
    }

    case "socialAccounts": {
      const rows = scopedClientId
        ? await db.select().from(socialAccounts).where(eq(socialAccounts.clientId, scopedClientId)).limit(limit)
        : await db.select().from(socialAccounts).limit(limit);
      return ok({
        rows: rows.map((r) => ({
          // tokens are NEVER returned to the client
          id: r.id,
          clientId: r.clientId,
          platform: r.platform,
          accountName: r.accountName,
          accountId: r.accountId,
          accountType: r.accountType,
          status: r.status,
          metadata: r.metadata,
          lastCheckedAt: r.lastCheckedAt,
          lastError: r.lastError,
          hasToken: Boolean(r.encryptedAccessToken),
          createdAt: r.createdAt,
        })),
      });
    }

    case "conversations": {
      const filters = [];
      if (scopedClientId) filters.push(eq(conversations.clientId, scopedClientId));
      if (q) filters.push(or(ilike(conversations.customerName, `%${q}%`))!);
      const rows = await db
        .select()
        .from(conversations)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(conversations.lastMessageAt))
        .limit(limit);
      return ok({ rows });
    }

    case "messages": {
      const conversationId = url.searchParams.get("conversationId");
      if (!conversationId) return fail("conversationId is required", 400);
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);
      if (!conversation) return fail("Conversation not found", 404);
      if (ownOnly && conversation.clientId !== user.clientId) return fail("Access denied", 403);
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt)
        .limit(500);
      return ok({ rows });
    }

    case "leads": {
      const filters = [];
      if (scopedClientId) filters.push(eq(leads.clientId, scopedClientId));
      const rows = await db
        .select()
        .from(leads)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(leads.createdAt))
        .limit(limit);
      return ok({ rows });
    }

    case "notifications": {
      const rows = await db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return ok({ rows, unread: rows.filter((r) => !r.read).length });
    }

    case "audit": {
      if (user.role === "CLIENT") return fail("Insufficient permissions", 403);
      const filters = [];
      if (clientId) filters.push(eq(auditLogs.clientId, clientId));
      if (q) filters.push(or(ilike(auditLogs.action, `%${q}%`))!);
      const rows = await db
        .select()
        .from(auditLogs)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
      return ok({ rows });
    }

    case "users": {
      if (user.role !== "ADMIN") return fail("Insufficient permissions", 403);
      const rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
      return ok({
        rows: rows.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          clientId: u.clientId,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        })),
      });
    }

    case "agentRuns": {
      const filters = [];
      if (ownOnly && user.clientId) filters.push(eq(agentRuns.clientId, user.clientId));
      const rows = await db
        .select()
        .from(agentRuns)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(agentRuns.createdAt))
        .limit(limit);
      return ok({ rows });
    }

    case "syncRuns": {
      const rows = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(20);
      return ok({ rows });
    }

    case "analytics": {
      const rangeDays = Number(url.searchParams.get("days") ?? 30);
      const since = new Date(Date.now() - rangeDays * 86_400_000);

      const contentFilters = [sql`${contentItems.createdAt} >= ${since}`];
      if (scopedClientId) contentFilters.push(eq(contentItems.clientId, scopedClientId));

      const [totals] = await db
        .select({
          content: count(),
          published: sql<number>`count(*) filter (where ${contentItems.status} = 'PUBLISHED')`,
          scheduled: sql<number>`count(*) filter (where ${contentItems.status} = 'SCHEDULED')`,
          failed: sql<number>`count(*) filter (where ${contentItems.status} = 'FAILED')`,
        })
        .from(contentItems)
        .where(and(...contentFilters));

      const byPlatform = await db
        .select({ platform: contentItems.platform, total: count() })
        .from(contentItems)
        .where(and(...contentFilters))
        .groupBy(contentItems.platform);

      const byDay = await db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${contentItems.createdAt}), 'YYYY-MM-DD')`,
          total: count(),
          published: sql<number>`count(*) filter (where ${contentItems.status} = 'PUBLISHED')`,
        })
        .from(contentItems)
        .where(and(...contentFilters))
        .groupBy(sql`date_trunc('day', ${contentItems.createdAt})`)
        .orderBy(sql`date_trunc('day', ${contentItems.createdAt})`)
        .limit(60);

      return ok({ rangeDays, totals, byPlatform, byDay });
    }

    case "search": {
      const term = url.searchParams.get("q")?.trim() ?? "";
      if (term.length < 2) return fail("Search term must be at least 2 characters", 400);

      const like = `%${term}%`;
      const clientRows = ownOnly && user.clientId
        ? await db.select().from(clients).where(and(eq(clients.id, user.clientId), or(ilike(clients.name, like), ilike(clients.industry, like)))).limit(8)
        : await db.select().from(clients).where(or(ilike(clients.name, like), ilike(clients.industry, like))).limit(8);

      const contentFilters = [or(ilike(contentItems.title, like), ilike(contentItems.body, like))!];
      if (scopedClientId) contentFilters.push(eq(contentItems.clientId, scopedClientId));
      const contentRows = await db.select().from(contentItems).where(and(...contentFilters)).limit(8);

      const campaignFilters = [ilike(campaigns.name, like)];
      if (scopedClientId) campaignFilters.push(eq(campaigns.clientId, scopedClientId));
      const campaignRows = await db.select().from(campaigns).where(and(...campaignFilters)).limit(8);

      return ok({
        clients: clientRows,
        content: contentRows,
        campaigns: campaignRows,
        total: clientRows.length + contentRows.length + campaignRows.length,
      });
    }

    default:
      return fail(`Unknown data type: ${type ?? "(none)"}`, 400);
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));
  const type = body?.type as string;

  if (type === "campaign") {
    const { z } = await import("zod");
    const parsed = z
      .object({
        clientId: z.string().uuid(),
        name: z.string().min(2).max(180),
        objective: z.string().max(2000).optional(),
        targetAudience: z.string().max(2000).optional(),
        platforms: z.array(z.string()).max(12).optional(),
        budget: z.number().nonnegative().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        strategy: z.string().max(4000).optional(),
        status: z.string().max(24).optional(),
      })
      .safeParse(body);
    if (!parsed.success) return fail("Invalid campaign: " + parsed.error.issues[0].message, 422);

    const [row] = await db
      .insert(campaigns)
      .values({
        clientId: parsed.data.clientId,
        name: parsed.data.name,
        objective: parsed.data.objective ?? null,
        targetAudience: parsed.data.targetAudience ?? null,
        platforms: parsed.data.platforms ?? [],
        budget: parsed.data.budget != null ? String(parsed.data.budget) : null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        strategy: parsed.data.strategy ?? null,
        status: parsed.data.status ?? "STRATEGY",
      })
      .returning();

    return ok({ row });
  }

  if (type === "lead") {
    const { z } = await import("zod");
    const parsed = z
      .object({
        clientId: z.string().uuid().optional().nullable(),
        name: z.string().min(1).max(160),
        contact: z.string().max(190).optional(),
        source: z.string().max(64).optional(),
        notes: z.string().max(2000).optional(),
      })
      .safeParse(body);
    if (!parsed.success) return fail("Invalid lead", 422);

    const [row] = await db
      .insert(leads)
      .values({
        clientId: parsed.data.clientId ?? null,
        name: parsed.data.name,
        contact: parsed.data.contact ?? null,
        source: parsed.data.source ?? "manual",
        notes: parsed.data.notes ?? null,
      })
      .returning();
    return ok({ row });
  }

  if (type === "brandKit") {
    const clientId = body?.clientId as string;
    if (!clientId) return fail("clientId is required", 400);
    const existing = await db.select().from(brandKits).where(eq(brandKits.clientId, clientId)).limit(1);

    const values = {
      tone: body.tone ?? null,
      languageStyle: body.languageStyle ?? null,
      fonts: body.fonts ?? null,
      targetAudience: body.targetAudience ?? null,
      brandDescription: body.brandDescription ?? null,
      preferredCta: body.preferredCta ?? null,
      visualStyle: body.visualStyle ?? null,
      contentExamples: body.contentExamples ?? null,
      guidelines: body.guidelines ?? null,
      hashtags: Array.isArray(body.hashtags) ? body.hashtags : [],
      primaryColors: Array.isArray(body.primaryColors) ? body.primaryColors : [],
      secondaryColors: Array.isArray(body.secondaryColors) ? body.secondaryColors : [],
      prohibitedPhrases: Array.isArray(body.prohibitedPhrases) ? body.prohibitedPhrases : [],
      updatedAt: new Date(),
    };

    if (existing.length) {
      await db.update(brandKits).set(values).where(eq(brandKits.clientId, clientId));
    } else {
      await db.insert(brandKits).values({ clientId, ...values });
    }
    return ok();
  }

  if (type === "socialAccount") {
    const { z } = await import("zod");
    const parsed = z
      .object({
        clientId: z.string().uuid().optional().nullable(),
        platform: z.string().min(2).max(32),
        accountName: z.string().max(180).optional(),
        accountId: z.string().max(120).optional(),
        accessToken: z.string().max(2000).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .safeParse(body);
    if (!parsed.success) return fail("Invalid social account payload", 422);

    const { encryptSecret } = await import("@/lib/crypto");
    const [row] = await db
      .insert(socialAccounts)
      .values({
        clientId: parsed.data.clientId ?? null,
        platform: parsed.data.platform,
        accountName: parsed.data.accountName ?? null,
        accountId: parsed.data.accountId ?? null,
        metadata: parsed.data.metadata ?? {},
        encryptedAccessToken: parsed.data.accessToken ? encryptSecret(parsed.data.accessToken) : null,
        status: parsed.data.accessToken ? "CONNECTED" : "DISCONNECTED",
      })
      .returning();

    return ok({
      account: {
        id: row.id,
        platform: row.platform,
        accountName: row.accountName,
        accountId: row.accountId,
        status: row.status,
      },
    });
  }

  if (type === "conversationMessage") {
    const conversationId = body?.conversationId as string;
    const content = (body?.content as string) ?? "";
    if (!conversationId || !content.trim()) return fail("conversationId and content are required", 400);

    const [row] = await db
      .insert(messages)
      .values({
        conversationId,
        role: (body?.role as string) ?? "agent",
        content: content.slice(0, 8000),
        channel: (body?.channel as string) ?? "manual",
      })
      .returning();

    await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
    return ok({ row });
  }

  if (type === "conversation") {
    const [row] = await db
      .insert(conversations)
      .values({
        clientId: (body?.clientId as string) ?? null,
        channel: (body?.channel as string) ?? "telegram",
        customerName: (body?.customerName as string) ?? "New conversation",
        customerExternalId: (body?.customerExternalId as string) ?? null,
        status: "OPEN",
      })
      .returning();
    return ok({ row });
  }

  return fail(`Unknown payload type: ${type ?? "(none)"}`, 400);
}

export { inArray };
