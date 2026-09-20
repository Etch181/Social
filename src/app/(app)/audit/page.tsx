"use client";

import { useEffect, useState } from "react";
import { ScrollText, Search, ShieldCheck, Download, Clock, User, Layers } from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast, Skeleton } from "@/components/ui";

interface AuditRow {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  clientId: string | null;
  userId: string | null;
  ip: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const toast = useToast();

  useEffect(() => {
    const id = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/data?type=audit&limit=200${query ? `&q=${encodeURIComponent(query)}` : ""}`)
        .then((r) => r.json())
        .then((d) => d.ok && setRows(d.rows))
        .catch(() => toast.show("Failed to load audit logs", "error"))
        .finally(() => setLoading(false));
    }, 260);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">STRUCTURED AUDIT TRAIL</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Audit Logs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Logins, client and content changes, approvals, publications, AI executions, integration
              changes and synchronisation events. Secrets are never written to log entries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by action…"
                className="input w-full min-w-[220px] ps-10"
              />
            </div>
            <button
              className="btn btn-ghost"
              onClick={() => {
                const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "fox-ai-social-audit.json";
                a.click();
                URL.revokeObjectURL(url);
                toast.show("Audit log exported");
              }}
            >
              <Download size={15} /> Export JSON
            </button>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
              <ScrollText size={18} />
            </div>
            <div>
              <div className="micro text-[9px]">EVENTS LOADED</div>
              <div className="num mt-1 text-[20px] font-semibold text-ink">{rows.length}</div>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c-success)_14%,transparent)] text-[var(--c-success)]">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="micro text-[9px]">RETENTION</div>
              <div className="mt-1 text-[13px] font-semibold text-ink">Persistent (PostgreSQL)</div>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c-cyan)_14%,transparent)] text-[var(--c-cyan)]">
              <Layers size={18} />
            </div>
            <div>
              <div className="micro text-[9px]">SCOPE</div>
              <div className="mt-1 text-[13px] font-semibold text-ink">Agency-wide + per client</div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel pad={false}>
        <div className="border-b border-[var(--c-edge)] px-6 py-4">
          <PanelHeader label="EVENT STREAM" title="Most recent events" />
        </div>

        {loading ? (
          <div className="p-6">
            <Skeleton lines={8} />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ScrollText size={26} className="mx-auto text-muted" />
            <h3 className="mt-4 text-[14px] font-semibold text-ink">No audit events match your filter</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted">
              Try a different search term, or perform an action in the platform to generate events.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th>IP</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="num whitespace-nowrap text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-muted" />
                        {new Date(row.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          row.action.includes("failed") || row.action.includes("rejected")
                            ? "danger"
                            : row.action.includes("created") || row.action.includes("approved")
                              ? "success"
                              : "neutral"
                        }
                      >
                        {row.action.replace(/[._]/g, " ")}
                      </Badge>
                    </td>
                    <td className="text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Layers size={10} className="text-muted" />
                        {row.entityType ?? "—"}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <User size={10} className="text-muted" />
                        <span className="num">{row.userId ? row.userId.slice(0, 8) : "system"}</span>
                      </div>
                    </td>
                    <td className="num text-[11px]">{row.ip ?? "—"}</td>
                    <td className="max-w-[260px]">
                      <div className="truncate text-[10.5px] text-muted">
                        {Object.keys(row.details ?? {}).length
                          ? JSON.stringify(row.details).slice(0, 90)
                          : "—"}
                      </div>
                    </td>
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
