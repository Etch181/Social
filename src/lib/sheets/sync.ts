import { db } from "@/db";
import {
  agencies,
  auditLogs,
  campaigns,
  clients,
  contentItems,
  conversations,
  leads,
  syncRuns,
  users,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  ensureSheet,
  getServiceAccount,
  sanitizeSheetName,
  writeRange,
  sheetsConfigured,
} from "@/lib/sheets/google";
import { recordSyncRun, audit } from "@/lib/audit";

// ---------------------------------------------------------------------------
// GOOGLE SHEETS SYNCHRONIZATION
// Sheets is the agency's *operational* mirror: business data + safe metadata.
// Passwords, API keys, access tokens and encryption secrets are NEVER written.
// ---------------------------------------------------------------------------

export interface SyncSummary {
  ran: boolean;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  tabsWritten: number;
  rowsWritten: number;
  durationMs: number;
  error?: string;
}

function iso(value: Date | string | null | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : String(value);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? "");
  } catch {
    return "";
  }
}

/** Full bidirectional-safe export: DB → Sheets (idempotent, whole-tab writes). */
export async function runSheetsSync(options: { triggeredBy?: string } = {}): Promise<SyncSummary> {
  const started = Date.now();

  if (!sheetsConfigured()) {
    return {
      ran: false,
      status: "SKIPPED",
      tabsWritten: 0,
      rowsWritten: 0,
      durationMs: Date.now() - started,
      error: "Google Sheets is not configured (GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT).",
    };
  }

  const cfg = getServiceAccount()!;
  let tabsWritten = 0;
  let rowsWritten = 0;

  try {
    const writeTab = async (tab: string, rows: unknown[][]) => {
      const safe = await ensureSheet(cfg, tab);
      await writeRange(cfg, safe, rows);
      tabsWritten += 1;
      rowsWritten += Math.max(rows.length - 1, 0);
    };

    // --- Agency settings -------------------------------------------------
    const [agency] = await db.select().from(agencies).limit(1);
    if (agency) {
      await writeTab("AgencySettings", [
        ["Field", "Value"],
        ["Agency Name", agency.name],
        ["Website", agency.website ?? ""],
        ["Contact Email", agency.contactEmail ?? ""],
        ["Timezone", agency.timezone],
        ["Default Language", agency.defaultLanguage],
        ["Last Sync", new Date().toISOString()],
      ]);
    }

    // --- Users (metadata only — never password hashes) -------------------
    const allUsers = await db.select().from(users).limit(1000);
    await writeTab("Users", [
      ["User ID", "Name", "Email", "Role", "Status", "Locale", "Last Login", "Created"],
      ...allUsers.map((u) => [
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.locale,
        iso(u.lastLoginAt),
        iso(u.createdAt),
      ]),
    ]);

    // --- Clients ---------------------------------------------------------
    const allClients = await db.select().from(clients).limit(2000);
    await writeTab("Clients", [
      [
        "Client ID",
        "Name",
        "Brand",
        "Industry",
        "Country",
        "Timezone",
        "Language",
        "Status",
        "Website",
        "Contact Email",
        "Created",
      ],
      ...allClients.map((c) => [
        c.id,
        c.name,
        c.brandName ?? "",
        c.industry ?? "",
        c.country ?? "",
        c.timezone,
        c.language,
        c.status,
        c.website ?? "",
        c.contactEmail ?? "",
        iso(c.createdAt),
      ]),
    ]);

    // --- Campaigns -------------------------------------------------------
    const allCampaigns = await db.select().from(campaigns).limit(2000);
    await writeTab("Campaigns", [
      [
        "Campaign ID",
        "Client ID",
        "Name",
        "Objective",
        "Platforms",
        "Budget",
        "Start",
        "End",
        "Status",
        "Created",
      ],
      ...allCampaigns.map((c) => [
        c.id,
        c.clientId,
        c.name,
        c.objective ?? "",
        safeJson(c.platforms),
        c.budget ?? "",
        iso(c.startDate),
        iso(c.endDate),
        c.status,
        iso(c.createdAt),
      ]),
    ]);

    // --- Content ---------------------------------------------------------
    const allContent = await db.select().from(contentItems).limit(3000);
    await writeTab("Content", [
      [
        "Content ID",
        "Client ID",
        "Campaign ID",
        "Title",
        "Platform",
        "Type",
        "Language",
        "Status",
        "Approval",
        "Scheduled",
        "Published",
        "Agent",
      ],
      ...allContent.map((c) => [
        c.id,
        c.clientId,
        c.campaignId ?? "",
        c.title,
        c.platform,
        c.contentType,
        c.language,
        c.status,
        c.approvalStatus,
        iso(c.scheduledAt),
        iso(c.publishedAt),
        c.aiAgentId ?? "",
      ]),
    ]);

    // --- Calendar (scheduled items only) --------------------------------
    await writeTab("Calendar", [
      [
        "Content ID",
        "Client ID",
        "Title",
        "Platform",
        "Scheduled At",
        "Approval",
        "Status",
        "Published At",
      ],
      ...allContent
        .filter((c) => c.scheduledAt)
        .map((c) => [
          c.id,
          c.clientId,
          c.title,
          c.platform,
          iso(c.scheduledAt),
          c.approvalStatus,
          c.status,
          iso(c.publishedAt),
        ]),
    ]);

    // --- Leads & conversations ------------------------------------------
    const allLeads = await db.select().from(leads).limit(2000);
    await writeTab("Leads", [
      ["Lead ID", "Client ID", "Name", "Contact", "Source", "Status", "Value", "Created"],
      ...allLeads.map((l) => [
        l.id,
        l.clientId ?? "",
        l.name,
        l.contact ?? "",
        l.source,
        l.status,
        l.value ?? "",
        iso(l.createdAt),
      ]),
    ]);

    const allConversations = await db.select().from(conversations).limit(2000);
    await writeTab("Conversations", [
      [
        "Conversation ID",
        "Client ID",
        "Channel",
        "Customer",
        "Status",
        "Sentiment",
        "Escalated",
        "AI Paused",
        "Last Message",
      ],
      ...allConversations.map((c) => [
        c.id,
        c.clientId ?? "",
        c.channel,
        c.customerName ?? "",
        c.status,
        c.sentiment ?? "",
        c.escalated ? "YES" : "NO",
        c.aiPaused ? "YES" : "NO",
        iso(c.lastMessageAt),
      ]),
    ]);

    // --- Audit logs (metadata only) -------------------------------------
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(500);
    await writeTab("AuditLogs", [
      ["Timestamp", "Action", "Entity", "Entity ID", "User ID", "Client ID", "IP"],
      ...logs.map((l) => [
        iso(l.createdAt),
        l.action,
        l.entityType ?? "",
        l.entityId ?? "",
        l.userId ?? "",
        l.clientId ?? "",
        l.ip ?? "",
      ]),
    ]);

    // --- Per-client dedicated worksheets --------------------------------
    for (const client of allClients.slice(0, 60)) {
      const tabName = sanitizeSheetName(`Client_${client.brandName || client.name}_${client.id.slice(0, 6)}`);
      await ensureSheet(cfg, tabName);

      const clientContent = allContent.filter((c) => c.clientId === client.id);
      const clientCampaigns = allCampaigns.filter((c) => c.clientId === client.id);

      await writeTab(tabName, [
        ["FOX AI SOCIAL — Client Operational Sheet"],
        ["Client", client.name],
        ["Brand", client.brandName ?? ""],
        ["Industry", client.industry ?? ""],
        ["Status", client.status],
        ["Last Sync", new Date().toISOString()],
        [],
        ["CAMPAIGNS"],
        ["Campaign ID", "Name", "Objective", "Status", "Start", "End"],
        ...clientCampaigns.map((c) => [c.id, c.name, c.objective ?? "", c.status, iso(c.startDate), iso(c.endDate)]),
        [],
        ["CONTENT"],
        ["Content ID", "Title", "Platform", "Status", "Approval", "Scheduled", "Published"],
        ...clientContent.map((c) => [
          c.id,
          c.title,
          c.platform,
          c.status,
          c.approvalStatus,
          iso(c.scheduledAt),
          iso(c.publishedAt),
        ]),
      ]);
    }

    const durationMs = Date.now() - started;
    await recordSyncRun({ status: "SUCCESS", recordsSynced: rowsWritten, durationMs });
    await audit({
      action: "sheets.sync_completed",
      entityType: "integration",
      entityId: "google-sheets",
      details: { tabsWritten, rowsWritten, durationMs, triggeredBy: options.triggeredBy ?? "system" },
    });

    return { ran: true, status: "SUCCESS", tabsWritten, rowsWritten, durationMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - started;
    await recordSyncRun({ status: "FAILED", durationMs, error: message });
    await audit({
      action: "sheets.sync_failed",
      entityType: "integration",
      entityId: "google-sheets",
      details: { error: message },
    });
    return {
      ran: true,
      status: "FAILED",
      tabsWritten,
      rowsWritten,
      durationMs,
      error: message,
    };
  }
}

export async function lastSyncRun() {
  const [row] = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1);
  return row ?? null;
}

/** Health probe used by the System Health page. */
export async function sheetsHealth(): Promise<{ ok: boolean; message: string; lastSync?: string }> {
  const run = await lastSyncRun();
  if (!sheetsConfigured())
    return {
      ok: false,
      message: "Google Sheets not configured (set GOOGLE_SHEETS_ID + GOOGLE_SERVICE_ACCOUNT).",
    };
  return {
    ok: run?.status !== "FAILED",
    message:
      run?.status === "FAILED"
        ? `Last sync failed: ${run.error ?? "unknown error"}`
        : run
          ? `Last sync ${run.status.toLowerCase()} — ${run.recordsSynced} rows.`
          : "Configured, no sync has run yet.",
    lastSync: run ? iso(run.startedAt) : undefined,
  };
}
