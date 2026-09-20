"use client";

import { useEffect, useState } from "react";
import {
  Table2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  Database,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast, Skeleton } from "@/components/ui";

interface SyncRun {
  id: string;
  kind: string;
  status: string;
  recordsSynced: number;
  durationMs: number | null;
  error: string | null;
  startedAt: string;
}

export default function SheetsPage() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [runsRes, healthRes] = await Promise.all([
        fetch("/api/data?type=syncRuns"),
        fetch("/api/system?scope=health"),
      ]);
      const runsData = await runsRes.json();
      const healthData = await healthRes.json();
      if (runsData.ok) setRuns(runsData.rows);
      if (healthData.ok) {
        const sheetsCheck = (healthData.checks ?? []).find(
          (c: { key: string; message: string; status: string }) => c.key === "sheets",
        );
        setHealth(
          sheetsCheck
            ? { ok: sheetsCheck.status === "OPERATIONAL", message: sheetsCheck.message }
            : null,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sheets.sync" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Sync failed", "error");
      } else {
        const s = data.sync;
        toast.show(
          s.ran
            ? `Synced ${s.rowsWritten} rows across ${s.tabsWritten} worksheets`
            : "Sync skipped — Google Sheets is not configured yet",
          s.ran ? "success" : "error",
        );
      }
      load();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">OPERATIONAL DATA SYNCHRONISATION</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">
              Google Sheets Integration
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              The agency spreadsheet mirrors operational data — clients, campaigns, content, calendar,
              approvals, leads, conversations and audit metadata — plus a dedicated worksheet per
              client. Secrets never leave the server.
            </p>
          </div>

          <button className="btn btn-primary" onClick={sync} disabled={syncing}>
            {syncing ? (
              <>
                <Loader2 size={15} className="spin" /> Syncing…
              </>
            ) : (
              <>
                <RefreshCw size={15} /> Sync now
              </>
            )}
          </button>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
              <Database size={18} />
            </div>
            <div>
              <div className="micro text-[9px]">CONNECTION</div>
              <div className="mt-1 text-[13px] font-semibold text-ink">
                {health?.ok ? "Connected" : "Not connected"}
              </div>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
            {health?.message ??
              "Set GOOGLE_SHEETS_ID and GOOGLE_SERVICE_ACCOUNT in your .env file to enable synchronisation."}
          </p>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c-cyan)_14%,transparent)] text-[var(--c-cyan)]">
              <Clock size={18} />
            </div>
            <div>
              <div className="micro text-[9px]">LAST SYNC</div>
              <div className="num mt-1 text-[13px] font-semibold text-ink">
                {runs[0] ? new Date(runs[0].startedAt).toLocaleString() : "Never"}
              </div>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
            Synchronisation is idempotent: each run replaces worksheet contents with the current
            database state, so retries never create duplicates.
          </p>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c-success)_14%,transparent)] text-[var(--c-success)]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="micro text-[9px]">SECURITY POLICY</div>
              <div className="mt-1 text-[13px] font-semibold text-ink">Secrets stay server-side</div>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
            Passwords, API keys, access tokens, refresh tokens and encryption keys are never written to
            Google Sheets — only safe business metadata and connection status.
          </p>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          label="WORKSHEET STRUCTURE"
          title="Tabs created automatically"
          action={<Badge tone="info">12 master tabs + per-client tabs</Badge>}
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "AgencySettings",
            "Users",
            "Clients",
            "Campaigns",
            "Content",
            "Calendar",
            "Approvals",
            "Analytics",
            "SocialAccounts",
            "Leads",
            "Conversations",
            "AuditLogs",
            "Client_A",
            "Client_B",
            "Client_C",
          ].map((tab) => (
            <div
              key={tab}
              className="flex items-center gap-2.5 rounded-xl border border-[var(--c-edge)] px-4 py-3 text-[12px] text-ink-soft"
            >
              <Table2 size={13} className="text-[var(--c-accent)]" />
              <span className="num truncate">{tab}</span>
              {tab.startsWith("Client_") && <Badge tone="accent">auto</Badge>}
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <PanelHeader label="SYNC HISTORY" title="Recent synchronisation runs" />

        {loading ? (
          <div className="mt-6">
            <Skeleton lines={5} />
          </div>
        ) : runs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--c-edge-strong)] px-6 py-12 text-center">
            <Table2 size={26} className="mx-auto text-muted" />
            <h3 className="mt-4 text-[14px] font-semibold text-ink">No synchronisation runs yet</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted">
              Configure the Google service account credentials, then press &ldquo;Sync now&rdquo; to
              create the worksheet structure and push the first dataset.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Duration</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="num text-xs">{new Date(run.startedAt).toLocaleString()}</td>
                    <td>
                      <Badge tone="neutral">{run.kind}</Badge>
                    </td>
                    <td>
                      <Badge tone={run.status === "SUCCESS" ? "success" : run.status === "FAILED" ? "danger" : "warning"}>
                        {run.status === "SUCCESS" ? (
                          <>
                            <CheckCircle2 size={11} /> {run.status}
                          </>
                        ) : (
                          <>
                            <XCircle size={11} /> {run.status}
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="num text-xs">{run.recordsSynced}</td>
                    <td className="num text-xs">{run.durationMs ? `${run.durationMs}ms` : "—"}</td>
                    <td className="max-w-[280px] truncate text-xs text-muted">{run.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {toast.node}
    </div>
  );
}
