import { db } from "@/db";
import { aiProviders, agentRuns, campaigns, approvals, conversations, leads, notifications, auditLogs, contentItems, clients, socialAccounts, users } from "@/db/schema";
import { desc, eq, and, count, sql, ilike, or, gte } from "drizzle-orm";
import { z } from "zod";
import { ok, fail, requireAuth } from "@/lib/api";
import { getRequestMeta, rateLimit, assertClientAccess, hashPassword } from "@/lib/auth";
import { audit, notify } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto";
import { providerHealth, gatewayChat } from "@/lib/ai/gateway";
import { runSheetsSync, sheetsHealth, lastSyncRun } from "@/lib/sheets/sync";
import { verifySheetsAccess } from "@/lib/sheets/google";
import { checkConnectionHealth, listPlatformStatus, publishContentItem } from "@/lib/publishing";
import { setTelegramWebhook } from "@/lib/publishing/telegram";

/* ================================================ DASHBOARD AGGREGATE == */

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { user } = auth;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "overview";

  const clientIdFilter = user.role === "CLIENT" && user.clientId ? eq(contentItems.clientId, user.clientId) : undefined;

  if (scope === "overview") {
    const [totalClients] = await db.select({ value: count() }).from(clients);
    const [totalContent] = await db
      .select({ value: count() })
      .from(contentItems)
      .where(clientIdFilter);
    const [scheduled] = await db
      .select({ value: count() })
      .from(contentItems)
      .where(clientIdFilter ? and(clientIdFilter, eq(contentItems.status, "SCHEDULED")) : eq(contentItems.status, "SCHEDULED"));
    const [published] = await db
      .select({ value: count() })
      .from(contentItems)
      .where(clientIdFilter ? and(clientIdFilter, eq(contentItems.status, "PUBLISHED")) : eq(contentItems.status, "PUBLISHED"));
    const [failed] = await db
      .select({ value: count() })
      .from(contentItems)
      .where(clientIdFilter ? and(clientIdFilter, eq(contentItems.status, "FAILED")) : eq(contentItems.status, "FAILED"));
    const [pendingApprovals] = await db.select({ value: count() }).from(approvals).where(eq(approvals.status, "PENDING"));
    const [totalCampaigns] = await db.select({ value: count() }).from(campaigns);
    const [activeCampaigns] = await db.select({ value: count() }).from(campaigns).where(eq(campaigns.status, "ACTIVE"));
    const [aiRuns] = await db.select({ value: count() }).from(agentRuns);
    const [conversationsCount] = await db.select({ value: count() }).from(conversations);
    const [leadsCount] = await db.select({ value: count() }).from(leads);
    const [socialCount] = await db.select({ value: count() }).from(socialAccounts);

    const recentContent = await db
      .select()
      .from(contentItems)
      .where(clientIdFilter)
      .orderBy(desc(contentItems.updatedAt))
      .limit(6);

    const recentRuns = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(6);
    const recentAudit = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(12);
    const providers = await providerHealth();
    const sheets = await sheetsHealth();
    const platforms = await listPlatformStatus();

    return ok({
      stats: {
        totalClients: totalClients.value,
        totalContent: totalContent.value,
        scheduled: scheduled.value,
        published: published.value,
        failed: failed.value,
        pendingApprovals: pendingApprovals.value,
        totalCampaigns: totalCampaigns.value,
        activeCampaigns: activeCampaigns.value,
        aiRuns: aiRuns.value,
        conversations: conversationsCount.value,
        leads: leadsCount.value,
        socialAccounts: socialCount.value,
      },
      recentContent,
      recentRuns,
      activity: recentAudit,
      providers,
      sheets,
      platforms,
    });
  }

  if (scope === "health") {
    const started = Date.now();
    let dbOk = false;
    try {
      await db.select({ value: count() }).from(users);
      dbOk = true;
    } catch {
      dbOk = false;
    }

    const sheets = await verifySheetsAccess().catch((e) => ({
      ok: false,
      message: e instanceof Error ? e.message : "Sheets check failed",
    }));
    const providers = await providerHealth().catch(() => []);
    const telegramConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
    const sync = await lastSyncRun();
    const platforms = await listPlatformStatus().catch(() => []);

    return ok({
      checks: [
        {
          key: "api",
          label: "Application API",
          status: "OPERATIONAL",
          message: `Responding in ${Date.now() - started}ms`,
          checkedAt: new Date().toISOString(),
        },
        {
          key: "database",
          label: "PostgreSQL Database",
          status: dbOk ? "OPERATIONAL" : "ERROR",
          message: dbOk ? "Connection pool healthy." : "Cannot reach the database.",
          checkedAt: new Date().toISOString(),
        },
        {
          key: "sheets",
          label: "Google Sheets",
          status: sheets.ok ? "OPERATIONAL" : sheets.message?.includes("not configured") ? "NOT_CONFIGURED" : "ERROR",
          message: sheets.message,
          checkedAt: new Date().toISOString(),
        },
        {
          key: "ai-gateway",
          label: "AI Gateway",
          status: providers.some((p) => p.status === "OPERATIONAL")
            ? "OPERATIONAL"
            : providers.some((p) => p.configured)
              ? "DEGRADED"
              : "NOT_CONFIGURED",
          message: providers.length
            ? `${providers.filter((p) => p.enabled).length} provider(s) enabled.`
            : "No AI provider configured yet.",
          checkedAt: new Date().toISOString(),
        },
        {
          key: "telegram",
          label: "Telegram Bot",
          status: telegramConfigured ? "OPERATIONAL" : "NOT_CONFIGURED",
          message: telegramConfigured
            ? "TELEGRAM_BOT_TOKEN is set."
            : "Set TELEGRAM_BOT_TOKEN in .env to enable the bot.",
          checkedAt: new Date().toISOString(),
        },
        {
          key: "meta",
          label: "Meta (Facebook / Instagram)",
          status:
            platforms.find((p) => p.id === "facebook")?.connected ||
            platforms.find((p) => p.id === "instagram")?.connected
              ? "OPERATIONAL"
              : "NOT_CONFIGURED",
          message:
            platforms.find((p) => p.id === "facebook")?.connected ||
            platforms.find((p) => p.id === "instagram")?.connected
              ? "At least one Meta account is connected."
              : "Connect a Facebook Page / Instagram Business account in Integrations.",
          checkedAt: new Date().toISOString(),
        },
        {
          key: "sync",
          label: "Background Synchronisation",
          status: sync ? (sync.status === "FAILED" ? "ERROR" : "OPERATIONAL") : "OPERATIONAL",
          message: sync ? `Last run ${sync.status.toLowerCase()} at ${sync.startedAt.toISOString()}` : "No sync runs recorded yet.",
          checkedAt: new Date().toISOString(),
        },
      ],
      providers,
      sheets: { ...sheets, lastSync: sync?.startedAt ?? null },
      platforms,
    });
  }

  return fail(`Unknown scope: ${scope}`, 400);
}

/* ==================================================== PROVIDERS CRUD == */

const providerSchema = z.object({
  key: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  baseUrl: z.string().url(),
  model: z.string().min(1).max(120),
  apiKey: z.string().min(1).max(400).optional(),
  timeoutMs: z.number().int().min(1000).max(300000).optional(),
  maxRetries: z.number().int().min(0).max(5).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(100).optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await req.json().catch(() => ({}));
  const action = (body?.action as string) ?? "";

  /* -------- AI provider upsert -------- */
  if (action === "provider.save") {
    if (user.role !== "ADMIN") return fail("Only administrators can manage AI providers", 403);
    const parsed = providerSchema.safeParse(body.provider);
    if (!parsed.success) return fail("Invalid provider configuration: " + parsed.error.issues[0].message, 422);

    const existing = await db.select().from(aiProviders).where(eq(aiProviders.key, parsed.data.key)).limit(1);

    const values = {
      key: parsed.data.key,
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl.replace(/\/+$/, ""),
      model: parsed.data.model,
      timeoutMs: parsed.data.timeoutMs ?? 60000,
      maxRetries: parsed.data.maxRetries ?? 1,
      enabled: parsed.data.enabled ?? true,
      priority: parsed.data.priority ?? 10,
      status: "NOT_CONFIGURED",
    };

    if (existing.length) {
      await db
        .update(aiProviders)
        .set({
          ...values,
          ...(parsed.data.apiKey
            ? { apiKeyEncrypted: encryptSecret(parsed.data.apiKey), status: "CONFIGURED" }
            : {}),
        })
        .where(eq(aiProviders.id, existing[0].id));
    } else {
      await db.insert(aiProviders).values({
        ...values,
        apiKeyEncrypted: parsed.data.apiKey ? encryptSecret(parsed.data.apiKey) : null,
        status: parsed.data.apiKey ? "CONFIGURED" : "NOT_CONFIGURED",
      });
    }

    await audit({
      action: "ai.provider_saved",
      entityType: "provider",
      entityId: parsed.data.key,
      userId: user.id,
      details: { key: parsed.data.key, model: parsed.data.model },
    });

    return ok({ providers: await providerHealth() });
  }

  /* -------- AI provider connectivity test (real network call) -------- */
  if (action === "provider.test") {
    const key = body?.key as string;
    const result = await gatewayChat({
      messages: [
        { role: "system", content: "Reply with the single word: OK" },
        { role: "user", content: "Connectivity check." },
      ],
      maxTokens: 8,
      ...(key ? { onlyProviders: [key] } : {}),
    });
    return result.ok
      ? ok({ latencyMs: result.latencyMs, provider: result.provider, model: result.model, attempts: result.attempts })
      : fail(result.error ?? "Connectivity test failed", 502, { attempts: result.attempts });
  }

  /* -------- Google Sheets sync -------- */
  if (action === "sheets.sync") {
    const result = await runSheetsSync({ triggeredBy: user.id });
    return result.status === "FAILED" ? fail(result.error ?? "Sync failed", 502, { sync: result }) : ok({ sync: result });
  }

  /* -------- Telegram webhook registration -------- */
  if (action === "telegram.webhook") {
    const base = process.env.APP_URL || new URL(req.url).origin;
    const result = await setTelegramWebhook(`${base}/api/telegram/webhook`);
    return result.ok ? ok(result) : fail(result.message, 400);
  }

  /* -------- Social connection health check -------- */
  if (action === "social.health") {
    return ok({ results: await checkConnectionHealth() });
  }

  /* -------- Manual publish -------- */
  if (action === "content.publish") {
    const result = await publishContentItem(body?.contentId as string);
    return result.ok ? ok({ publish: result }) : fail(result.error ?? "Publish failed", 502, { publish: result });
  }

  /* -------- Notification read -------- */
  if (action === "notifications.readAll") {
    await db.update(notifications).set({ read: true });
    return ok();
  }

  return fail("Unknown action", 400);
}

/* =============================================== SUPPORTING ENDPOINTS == */

export async function PATCH(req: Request) {
  const auth = await requireAuth(["ADMIN", "STAFF"]);
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => ({}));

  if (body?.action === "user.create") {
    const parsed = z
      .object({
        name: z.string().min(2).max(120),
        email: z.string().email(),
        password: z.string().min(10).max(200),
        role: z.enum(["ADMIN", "STAFF", "CLIENT"]),
        clientId: z.string().uuid().optional().nullable(),
      })
      .safeParse(body);
    if (!parsed.success) return fail("Invalid user payload: " + parsed.error.issues[0].message, 422);

    const email = parsed.data.email.toLowerCase();
    const exists = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (exists.length) return fail("A user with this email already exists", 409);

    const [created] = await db
      .insert(users)
      .values({
        agencyId: auth.user.agencyId,
        name: parsed.data.name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        clientId: parsed.data.clientId ?? null,
      })
      .returning();

    await audit({
      action: "user.created",
      entityType: "user",
      entityId: created.id,
      userId: auth.user.id,
      details: { email, role: parsed.data.role },
    });

    return ok({ user: { id: created.id, name: created.name, email: created.email, role: created.role } });
  }

  if (body?.action === "conversation.update") {
    const { id, ...changes } = body;
    if (!id) return fail("Conversation id required", 400);
    await db
      .update(conversations)
      .set({
        ...(changes.status ? { status: changes.status } : {}),
        ...(typeof changes.aiPaused === "boolean" ? { aiPaused: changes.aiPaused } : {}),
        ...(typeof changes.escalated === "boolean" ? { escalated: changes.escalated } : {}),
        ...(changes.assignedTo ? { assignedTo: changes.assignedTo } : {}),
      })
      .where(eq(conversations.id, id));
    await audit({
      action: "conversation.updated",
      entityType: "conversation",
      entityId: id,
      userId: auth.user.id,
      details: { changes: JSON.stringify(changes).slice(0, 300) },
    });
    return ok();
  }

  if (body?.action === "settings.agency") {
    if (auth.user.role !== "ADMIN") return fail("Administrator rights required", 403);
    const { agencies } = await import("@/db/schema");
    const [agency] = await db.select().from(agencies).limit(1);
    if (!agency) return fail("Agency record missing", 500);
    await db
      .update(agencies)
      .set({
        name: body.name ?? agency.name,
        website: body.website ?? agency.website,
        contactEmail: body.contactEmail ?? agency.contactEmail,
        timezone: body.timezone ?? agency.timezone,
        defaultLanguage: body.defaultLanguage ?? agency.defaultLanguage,
        accentColor: body.accentColor ?? agency.accentColor,
        logoUrl: body.logoUrl ?? agency.logoUrl,
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, agency.id));
    await audit({ action: "settings.updated", entityType: "agency", entityId: agency.id, userId: auth.user.id });
    return ok();
  }

  return fail("Unknown action", 400);
}


