import { db } from "@/db";
import { auditLogs, notifications, syncRuns } from "@/db/schema";

type DetailValue = string | number | boolean | null | undefined | Record<string, unknown>;

/** Structured audit trail. Never pass secrets into `details`. */
export async function audit(entry: {
  action: string;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  clientId?: string | null;
  details?: Record<string, DetailValue>;
  ip?: string | null;
}) {
  try {
    await db.insert(auditLogs).values({
      action: entry.action,
      userId: entry.userId ?? null,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      clientId: entry.clientId ?? null,
      details: (entry.details ?? {}) as Record<string, unknown>,
      ip: entry.ip ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}

export async function notify(entry: {
  type: string;
  title: string;
  body?: string;
  link?: string;
  userId?: string | null;
}) {
  try {
    await db.insert(notifications).values({
      type: entry.type,
      title: entry.title,
      body: entry.body ?? null,
      link: entry.link ?? null,
      userId: entry.userId ?? null,
    });
  } catch (err) {
    console.error("[notify] failed to write notification", err);
  }
}

export async function recordSyncRun(entry: {
  kind?: string;
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  recordsSynced?: number;
  durationMs?: number;
  error?: string;
}) {
  try {
    await db.insert(syncRuns).values({
      kind: entry.kind ?? "google-sheets",
      status: entry.status,
      recordsSynced: entry.recordsSynced ?? 0,
      durationMs: entry.durationMs ?? 0,
      error: entry.error ?? null,
    });
  } catch (err) {
    console.error("[sync] failed to record sync run", err);
  }
}

export function log(...args: unknown[]) {
  console.log(new Date().toISOString(), "[fox-ai-social]", ...args);
}
