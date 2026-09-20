import { db } from "@/db";
import { contentItems, socialAccounts } from "@/db/schema";
import { eq, lte, and, isNotNull } from "drizzle-orm";
import { telegramAdapter } from "@/lib/publishing/telegram";
import { facebookAdapter, instagramAdapter } from "@/lib/publishing/facebook";
import type { PlatformId, PublishResult, SocialAdapter } from "@/lib/publishing/types";
import { audit, notify, log } from "@/lib/audit";

// ---------------------------------------------------------------------------
// ADAPTER REGISTRY — the single place where channels are registered.
// Future channels (TikTok, LinkedIn, YouTube, X, WhatsApp, Email) plug in here.
// ---------------------------------------------------------------------------

export const adapters: Record<string, SocialAdapter> = {
  telegram: telegramAdapter,
  facebook: facebookAdapter,
  instagram: instagramAdapter,
};

export interface PlatformInfo {
  id: PlatformId | string;
  label: string;
  labelAr: string;
  connected: boolean;
  implemented: boolean;
  requiredCredentials: string[];
  accountCount: number;
}

/** All channels the architecture knows about (implemented or planned). */
export const PLATFORM_CATALOG: {
  id: string;
  label: string;
  labelAr: string;
  implemented: boolean;
  requiredCredentials: string[];
}[] = [
  {
    id: "facebook",
    label: "Facebook",
    labelAr: "فيسبوك",
    implemented: true,
    requiredCredentials: facebookAdapter.requiredCredentials,
  },
  {
    id: "instagram",
    label: "Instagram",
    labelAr: "إنستغرام",
    implemented: true,
    requiredCredentials: instagramAdapter.requiredCredentials,
  },
  {
    id: "telegram",
    label: "Telegram",
    labelAr: "تيليغرام",
    implemented: true,
    requiredCredentials: telegramAdapter.requiredCredentials,
  },
  {
    id: "tiktok",
    label: "TikTok",
    labelAr: "تيك توك",
    implemented: false,
    requiredCredentials: ["TikTok Content Posting API credentials"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    labelAr: "لينكد إن",
    implemented: false,
    requiredCredentials: ["LinkedIn Marketing API credentials"],
  },
  {
    id: "youtube",
    label: "YouTube",
    labelAr: "يوتيوب",
    implemented: false,
    requiredCredentials: ["YouTube Data API OAuth client"],
  },
  {
    id: "x",
    label: "X (Twitter)",
    labelAr: "إكس",
    implemented: false,
    requiredCredentials: ["X API v2 credentials"],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    labelAr: "واتساب",
    implemented: false,
    requiredCredentials: ["WhatsApp Business API credentials"],
  },
  {
    id: "email",
    label: "Email",
    labelAr: "البريد الإلكتروني",
    implemented: false,
    requiredCredentials: ["SMTP / transactional email provider"],
  },
];

export function getAdapter(platform: string): SocialAdapter | undefined {
  return adapters[platform];
}

export async function listPlatformStatus(): Promise<PlatformInfo[]> {
  const rows = await db.select().from(socialAccounts);
  return PLATFORM_CATALOG.map((p) => {
    const accounts = rows.filter((r) => r.platform === p.id);
    return {
      id: p.id,
      label: p.label,
      labelAr: p.labelAr,
      implemented: p.implemented,
      requiredCredentials: p.requiredCredentials,
      connected: accounts.some((a) => a.status === "CONNECTED"),
      accountCount: accounts.length,
    };
  });
}

/**
 * Universal publish entrypoint:
 *   publish(platform, account, content)
 * Used by the scheduler, the manual "Publish now" action and automations.
 */
export async function publishContentItem(contentId: string): Promise<PublishResult> {
  const [item] = await db.select().from(contentItems).where(eq(contentItems.id, contentId)).limit(1);
  if (!item) return { ok: false, platform: "unknown", error: "Content not found", reason: "NOT_FOUND" };

  if (item.approvalStatus !== "APPROVED") {
    return {
      ok: false,
      platform: item.platform,
      error: "Publishing blocked: content must be approved before publication.",
      reason: "NOT_APPROVED",
    };
  }

  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.platform, item.platform), eq(socialAccounts.clientId, item.clientId)))
    .limit(1);

  const adapter = getAdapter(item.platform);
  if (!adapter)
    return {
      ok: false,
      platform: item.platform,
      error: `No adapter registered for platform "${item.platform}".`,
      reason: "NO_ADAPTER",
    };

  if (!account)
    return {
      ok: false,
      platform: item.platform,
      error: `No connected ${item.platform} account for this client.`,
      reason: "NO_ACCOUNT",
    };

  const result = await adapter.publish(
    {
      id: account.id,
      platform: account.platform,
      accountName: account.accountName,
      accountId: account.accountId,
      encryptedAccessToken: account.encryptedAccessToken,
      metadata: (account.metadata as Record<string, unknown>) ?? {},
    },
    {
      text: [item.body, item.cta, (item.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")]
        .filter(Boolean)
        .join("\n\n"),
      mediaUrls: item.mediaUrls ?? [],
      title: item.title,
    },
  );

  await db
    .update(contentItems)
    .set({
      status: result.ok ? "PUBLISHED" : "FAILED",
      publishedAt: result.ok ? new Date() : item.publishedAt,
      publishResult: {
        ok: result.ok,
        error: result.error ?? null,
        externalId: result.externalId ?? null,
        at: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(eq(contentItems.id, item.id));

  await audit({
    action: result.ok ? "content.published" : "content.publish_failed",
    entityType: "content",
    entityId: item.id,
    clientId: item.clientId,
    details: { platform: item.platform, error: result.error ?? null, externalId: result.externalId ?? null },
  });

  await notify({
    type: result.ok ? "content.published" : "publishing.failed",
    title: result.ok ? `Published to ${item.platform}` : `Publishing failed on ${item.platform}`,
    body: result.ok ? item.title : result.error,
    link: `/content/${item.id}`,
  });

  return result;
}

/** Scheduler tick: publish everything that is due, approved and not yet published. */
export async function runDuePublishJobs(): Promise<{ processed: number; results: PublishResult[] }> {
  const due = await db
    .select()
    .from(contentItems)
    .where(
      and(
        lte(contentItems.scheduledAt, new Date()),
        isNotNull(contentItems.scheduledAt),
        eq(contentItems.approvalStatus, "APPROVED"),
        eq(contentItems.status, "SCHEDULED"),
      ),
    )
    .limit(25);

  const results: PublishResult[] = [];
  for (const item of due) {
    const r = await publishContentItem(item.id);
    results.push(r);
    log(`[scheduler] ${item.id} → ${r.ok ? "published" : `failed: ${r.error}`}`);
  }
  return { processed: due.length, results };
}

export async function checkConnectionHealth() {
  const rows = await db.select().from(socialAccounts);
  return Promise.all(
    rows.map(async (account) => {
      const adapter = getAdapter(account.platform);
      if (!adapter?.healthCheck)
        return { id: account.id, platform: account.platform, ok: false, message: "No health check available." };
      const result = await adapter.healthCheck({
        id: account.id,
        platform: account.platform,
        accountName: account.accountName,
        accountId: account.accountId,
        encryptedAccessToken: account.encryptedAccessToken,
        metadata: (account.metadata as Record<string, unknown>) ?? {},
      });
      await db
        .update(socialAccounts)
        .set({
          status: result.ok ? "CONNECTED" : "ERROR",
          lastCheckedAt: new Date(),
          lastError: result.ok ? null : result.message,
        })
        .where(eq(socialAccounts.id, account.id));
      return { id: account.id, platform: account.platform, ...result };
    }),
  );
}

export { publishContentItem as publish };
