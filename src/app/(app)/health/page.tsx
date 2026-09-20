"use client";

import { useEffect, useState } from "react";
import {
  HeartPulse,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Cpu,
  MessageCircle,
  Share2,
  Table2,
  Workflow,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast } from "@/components/ui";

interface HealthCheck {
  key: string;
  label: string;
  status: string;
  message: string;
  checkedAt: string;
}

const STATUS_TONE: Record<string, string> = {
  OPERATIONAL: "success",
  DEGRADED: "warning",
  ERROR: "danger",
  NOT_CONFIGURED: "neutral",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  OPERATIONAL: <CheckCircle2 size={15} className="text-[var(--c-success)]" />,
  DEGRADED: <AlertTriangle size={15} className="text-[var(--c-amber)]" />,
  ERROR: <XCircle size={15} className="text-[var(--c-danger)]" />,
  NOT_CONFIGURED: <AlertTriangle size={15} className="text-muted" />,
};

export default function HealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/system?scope=health");
      const data = await res.json();
      if (data.ok) setChecks(data.checks);
    } catch {
      toast.show("Failed to load system health", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">INFRASTRUCTURE MONITORING</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">System Health</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Live probes against the database, AI gateway, Google Sheets, Telegram, Meta and the
              background scheduler. Status refreshes automatically every minute.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} /> Refresh now
          </button>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && checks.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="panel h-[170px] animate-pulse p-6" />
            ))
          : checks.map((check) => (
              <Panel key={check.key} hover>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--c-panel-2)] text-[var(--c-accent)]">
                      {check.key === "database" ? (
                        <Database size={18} />
                      ) : check.key === "ai-gateway" ? (
                        <Cpu size={18} />
                      ) : check.key === "telegram" ? (
                        <MessageCircle size={18} />
                      ) : check.key === "meta" ? (
                        <Share2 size={18} />
                      ) : check.key === "sheets" ? (
                        <Table2 size={18} />
                      ) : check.key === "sync" ? (
                        <Workflow size={18} />
                      ) : (
                        <HeartPulse size={18} />
                      )}
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-semibold text-ink">{check.label}</h3>
                      <div className="num text-[10px] text-muted">
                        checked {new Date(check.checkedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[check.status] ?? "neutral"}>
                    {check.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[var(--c-edge)] bg-[color-mix(in_srgb,var(--c-panel-2)_46%,transparent)] px-4 py-3">
                  <span className="mt-0.5">{STATUS_ICON[check.status] ?? STATUS_ICON.NOT_CONFIGURED}</span>
                  <p className="text-[11.5px] leading-relaxed text-muted">{check.message}</p>
                </div>
              </Panel>
            ))}
      </div>

      <Panel>
        <PanelHeader label="STATUS LEGEND" title="What each state means" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Operational",
              tone: "success",
              body: "The dependency responded successfully to the last probe.",
            },
            {
              label: "Degraded",
              tone: "warning",
              body: "The dependency is reachable but slower or partially configured.",
            },
            {
              label: "Not configured",
              tone: "neutral",
              body: "The integration is fully implemented but waiting for external credentials.",
            },
            {
              label: "Error",
              tone: "danger",
              body: "The last probe failed. Check the audit logs and the troubleshooting guide.",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--c-edge)] p-5">
              <Badge tone={item.tone}>{item.label}</Badge>
              <p className="mt-3.5 text-xs leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      {toast.node}
    </div>
  );
}
