import { db } from "@/db";
import { contentItems, approvals, agentRuns, clients, campaigns, socialAccounts } from "@/db/schema";
import { desc, eq, and, inArray, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { ok, fail, requireAuth } from "@/lib/api";
import { getRequestMeta, rateLimit, assertClientAccess } from "@/lib/auth";
import { audit, notify } from "@/lib/audit";
import { runAgent, getAgent } from "@/lib/ai/agents";
import { publishContentItem, checkConnectionHealth, listPlatformStatus } from "@/lib/publishing";
import { runSheetsSync, sheetsHealth } from "@/lib/sheets/sync";
import { providerHealth } from "@/lib/ai/gateway";
import { verifySheetsAccess } from "@/lib/sheets/google";

/* ============================================================= CONTENT === */

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { user } = auth;

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId");
  const status = url.searchParams.get("status");
  const approvalStatus = url.searchParams.get("approvalStatus");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 300);

  const filters = [];
  if (user.role === "CLIENT" && user.clientId) filters.push(eq(contentItems.clientId, user.clientId));
  if (clientId && (await assertClientAccess(user, clientId))) filters.push(eq(contentItems.clientId, clientId));
  if (status) filters.push(eq(contentItems.status, status));
  if (approvalStatus) filters.push(eq(contentItems.approvalStatus, approvalStatus));

  const rows = await db
    .select()
    .from(contentItems)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(contentItems.updatedAt))
    .limit(limit);

  return ok({ content: rows });
}

const contentSchema = z.object({
  title: z.string().min(2).max(220),
  body: z.string().max(8000).default(""),
  cta: z.string().max(220).optional(),
  hashtags: z.array(z.string()).max(30).optional(),
  platform: z.string().max(32).default("instagram"),
  contentType: z.string().max(32).default("post"),
  language: z.enum(["en", "ar"]).default("en"),
  clientId: z.string().uuid(),
  campaignId: z.string().uuid().optional().nullable(),
  mediaUrls: z.array(z.string()).max(12).optional(),
  scheduledAt: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { user } = auth;

  const meta = await getRequestMeta();
  if (!rateLimit(`content-create:${user.id}`, 60, 60_000)) return fail("Rate limit exceeded", 429);

  const parsed = contentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid content: " + parsed.error.issues[0].message, 422);

  if (!(await assertClientAccess(user, parsed.data.clientId)))
    return fail("You do not have access to this client workspace", 403);

  const [item] = await db
    .insert(contentItems)
    .values({
      title: parsed.data.title,
      body: parsed.data.body,
      cta: parsed.data.cta ?? null,
      hashtags: parsed.data.hashtags ?? [],
      platform: parsed.data.platform,
      contentType: parsed.data.contentType,
      language: parsed.data.language,
      clientId: parsed.data.clientId,
      campaignId: parsed.data.campaignId ?? null,
      mediaUrls: parsed.data.mediaUrls ?? [],
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      status: parsed.data.scheduledAt ? "SCHEDULED" : "DRAFT",
    })
    .returning();

  await audit({
    action: "content.created",
    entityType: "content",
    entityId: item.id,
    clientId: item.clientId,
    userId: user.id,
    details: { title: item.title, platform: item.platform },
    ip: meta.ip,
  });

  return ok({ content: item });
}

/* ============================================================== ACTIONS === */

const actionSchema = z.object({
  action: z.enum([
    "request-approval",
    "approve",
    "reject",
    "schedule",
    "publish",
    "regenerate",
    "generate",
  ]),
  contentId: z.string().uuid().optional(),
  note: z.string().max(1000).optional(),
  scheduledAt: z.string().optional(),
  prompt: z.string().max(4000).optional(),
  agentId: z.string().max(64).optional(),
  clientId: z.string().uuid().optional(),
  language: z.enum(["en", "ar"]).optional(),
  title: z.string().max(220).optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;
  const { user } = auth;

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid action payload", 422);
  const { action } = parsed.data;

  // ---------- AI generation (real gateway call) -------------------------
  if (action === "generate") {
    const { prompt, agentId, clientId, language, title } = parsed.data;
    if (!prompt || !agentId || !clientId)
      return fail("prompt, agentId and clientId are required for generation", 422);
    if (!(await assertClientAccess(user, clientId))) return fail("Access denied to this workspace", 403);

    const meta = await getRequestMeta();
    if (!rateLimit(`ai:${user.id}`, 20, 60_000)) return fail("AI rate limit exceeded", 429);

    const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    const started = Date.now();

    const result = await runAgent({
      agentId,
      request: prompt,
      language: language ?? "en",
      clientId,
      userId: user.id,
      context: {
        client: client
          ? {
              name: client.name,
              brand: client.brandName,
              industry: client.industry,
              language: client.language,
              description: client.description,
            }
          : null,
      },
    });

    await db.insert(agentRuns).values({
      agentId,
      clientId,
      userId: user.id,
      prompt: prompt.slice(0, 4000),
      result: result.content?.slice(0, 12000) ?? null,
      provider: result.provider,
      model: result.model,
      status: result.ok ? "SUCCESS" : "FAILED",
      durationMs: result.latencyMs || Date.now() - started,
      inputTokens: result.inputTokens ?? null,
      outputTokens: result.outputTokens ?? null,
      error: result.error ?? null,
    });

    if (!result.ok) {
      await audit({
        action: "ai.generation_failed",
        entityType: "agent",
        entityId: agentId,
        clientId,
        userId: user.id,
        details: { error: result.error, attempts: result.attempts.length },
        ip: meta.ip,
      });
      return fail(result.error ?? "AI generation failed", 502, {
        attempts: result.attempts,
        provider: result.provider,
      });
    }

    // Persist the generated draft so it is real, saved content.
    const [item] = await db
      .insert(contentItems)
      .values({
        title: title?.slice(0, 220) || `${getAgent(agentId)?.name ?? "AI"} draft`,
        body: result.content.slice(0, 8000),
        platform: "instagram",
        language: language ?? "en",
        clientId,
        aiAgentId: agentId,
        generatedBy: result.provider,
        status: "AI_REVIEW",
      })
      .returning();

    await audit({
      action: "ai.content_generated",
      entityType: "content",
      entityId: item.id,
      clientId,
      userId: user.id,
      details: { agent: agentId, provider: result.provider, model: result.model },
      ip: meta.ip,
    });

    return ok({
      content: item,
      generation: {
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        tokens: { input: result.inputTokens ?? null, output: result.outputTokens ?? null },
        attempts: result.attempts,
      },
    });
  }

  const contentId = parsed.data.contentId;
  if (!contentId) return fail("contentId is required", 400);

  const [item] = await db.select().from(contentItems).where(eq(contentItems.id, contentId)).limit(1);
  if (!item) return fail("Content not found", 404);
  if (!(await assertClientAccess(user, item.clientId))) return fail("Access denied", 403);

  switch (action) {
    case "request-approval": {
      await db
        .update(contentItems)
        .set({ approvalStatus: "PENDING", status: "PENDING_APPROVAL", updatedAt: new Date() })
        .where(eq(contentItems.id, contentId));
      await db.insert(approvals).values({
        contentId,
        clientId: item.clientId,
        requestedBy: user.id,
        status: "PENDING",
      });
      await notify({
        type: "approval.requested",
        title: "Approval requested",
        body: item.title,
        link: `/approvals`,
      });
      await audit({
        action: "approval.requested",
        entityType: "content",
        entityId: contentId,
        clientId: item.clientId,
        userId: user.id,
        details: { title: item.title },
      });
      return ok({ approvalStatus: "PENDING" });
    }

    case "approve": {
      await db
        .update(contentItems)
        .set({
          approvalStatus: "APPROVED",
          status: item.scheduledAt ? "SCHEDULED" : "APPROVED",
          updatedAt: new Date(),
        })
        .where(eq(contentItems.id, contentId));
      await db
        .update(approvals)
        .set({
          status: "APPROVED",
          decidedBy: user.id,
          decidedAt: new Date(),
          decisionNote: parsed.data.note ?? null,
        })
        .where(eq(approvals.contentId, contentId));
      await notify({
        type: "approval.completed",
        title: "Content approved",
        body: item.title,
        link: `/content/${contentId}`,
      });
      await audit({
        action: "approval.approved",
        entityType: "content",
        entityId: contentId,
        clientId: item.clientId,
        userId: user.id,
        details: { note: parsed.data.note ?? null },
      });
      return ok({ approvalStatus: "APPROVED" });
    }

    case "reject": {
      await db
        .update(contentItems)
        .set({ approvalStatus: "REJECTED", status: "CHANGES_REQUESTED", updatedAt: new Date() })
        .where(eq(contentItems.id, contentId));
      await db
        .update(approvals)
        .set({
          status: "REJECTED",
          decidedBy: user.id,
          decidedAt: new Date(),
          decisionNote: parsed.data.note ?? null,
        })
        .where(eq(approvals.contentId, contentId));
      await audit({
        action: "approval.rejected",
        entityType: "content",
        entityId: contentId,
        clientId: item.clientId,
        userId: user.id,
        details: { note: parsed.data.note ?? null },
      });
      return ok({ approvalStatus: "REJECTED" });
    }

    case "schedule": {
      const when = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
      await db
        .update(contentItems)
        .set({ scheduledAt: when, status: when ? "SCHEDULED" : item.status, updatedAt: new Date() })
        .where(eq(contentItems.id, contentId));
      await audit({
        action: "content.scheduled",
        entityType: "content",
        entityId: contentId,
        clientId: item.clientId,
        userId: user.id,
        details: { scheduledAt: when?.toISOString() ?? null },
      });
      return ok({ scheduledAt: when });
    }

    case "publish": {
      const result = await publishContentItem(contentId);
      return result.ok
        ? ok({ publish: result })
        : fail(result.error ?? "Publishing failed", 502, { publish: result });
    }

    case "regenerate": {
      const agentId = parsed.data.agentId ?? item.aiAgentId ?? "copywriter";
      const result = await runAgent({
        agentId,
        request:
          parsed.data.prompt ??
          `Rewrite and improve this ${item.platform} post. Return only the improved caption.\n\n${item.body}`,
        language: (item.language as "en" | "ar") ?? "en",
        clientId: item.clientId,
        userId: user.id,
      });
      if (!result.ok) return fail(result.error ?? "Regeneration failed", 502);

      const [updated] = await db
        .update(contentItems)
        .set({
          body: result.content.slice(0, 8000),
          version: item.version + 1,
          updatedAt: new Date(),
          status: "AI_REVIEW",
        })
        .where(eq(contentItems.id, contentId))
        .returning();

      await db.insert(agentRuns).values({
        agentId,
        clientId: item.clientId,
        userId: user.id,
        prompt: parsed.data.prompt?.slice(0, 2000) ?? "regenerate",
        result: result.content.slice(0, 12000),
        provider: result.provider,
        model: result.model,
        status: "SUCCESS",
        durationMs: result.latencyMs,
      });

      await audit({
        action: "content.regenerated",
        entityType: "content",
        entityId: contentId,
        clientId: item.clientId,
        userId: user.id,
        details: { agent: agentId, provider: result.provider },
      });

      return ok({ content: updated, generation: result });
    }
  }

  return fail("Unknown action", 400);
}

/* ========================================================= AGGREGATES === */

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
