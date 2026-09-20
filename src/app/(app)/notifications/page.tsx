"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, Clock, AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { Panel, PanelHeader, Badge, EmptyState, FadeIn, useToast } from "@/components/ui";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TONE: Record<string, string> = {
  "approval.requested": "warning",
  "approval.completed": "success",
  "content.published": "success",
  "publishing.failed": "danger",
  "conversation.created": "info",
  "system.error": "danger",
};

export default function NotificationsPage() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const toast = useToast();

  const load = () =>
    fetch("/api/data?type=notifications&limit=150")
      .then((r) => r.json())
      .then((d) => d.ok && setRows(d.rows));

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">EVENT STREAM</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Notifications</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Approval requests, publishing results, integration failures and system events — generated
              by real backend operations, not simulated.
            </p>
          </div>

          <button
            className="btn btn-ghost"
            onClick={async () => {
              await fetch("/api/system", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "notifications.readAll" }),
              });
              toast.show("All notifications marked as read");
              load();
            }}
          >
            <CheckCheck size={15} /> Mark all as read
          </button>
        </div>
      </FadeIn>

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Bell size={26} />}
            title="You're all caught up"
            body="Notifications appear here as soon as the platform records relevant events — approvals, publications, integrations and AI runs."
          />
        </Panel>
      ) : (
        <Panel pad={false}>
          <div className="divide-y divide-[var(--c-edge)]">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`flex items-start gap-4 px-6 py-5 transition-colors hover:bg-[var(--c-panel-2)] ${
                  row.read ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    row.type.includes("failed") || row.type.includes("error")
                      ? "bg-[color-mix(in_srgb,var(--c-danger)_14%,transparent)] text-[var(--c-danger)]"
                      : row.type.includes("approval")
                        ? "bg-[color-mix(in_srgb,var(--c-amber)_14%,transparent)] text-[var(--c-amber)]"
                        : "bg-[var(--c-accent-soft)] text-[var(--c-accent)]"
                  }`}
                >
                  {row.type.includes("failed") || row.type.includes("error") ? (
                    <XCircle size={16} />
                  ) : row.type.includes("approval") ? (
                    <AlertTriangle size={16} />
                  ) : row.type.includes("published") ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Info size={16} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[13.5px] font-semibold text-ink">{row.title}</h3>
                    <Badge tone={TONE[row.type] ?? "neutral"}>{row.type.replace(/[._]/g, " ")}</Badge>
                    {!row.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--c-accent)]" aria-label="unread" />
                    )}
                  </div>
                  {row.body && <p className="mt-1.5 truncate text-[12px] text-muted">{row.body}</p>}
                  <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-muted">
                    <Clock size={10} />
                    <span className="num">{new Date(row.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {row.link && (
                  <a href={row.link} className="btn btn-ghost !px-3 !py-1.5 !text-[11px]">
                    Open
                  </a>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader label="NOTIFICATION TYPES" title="What the platform tracks" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "Approval requested",
            "Approval completed",
            "Content published",
            "Publishing failed",
            "Integration disconnected",
            "AI provider failed",
            "Google Sheets sync failed",
            "Campaign milestone",
            "System error",
            "New conversation",
          ].map((type) => (
            <div key={type} className="flex items-center gap-3 rounded-xl border border-[var(--c-edge)] px-4 py-3">
              <Bell size={13} className="text-[var(--c-accent)]" />
              <span className="text-[11.5px] text-ink-soft">{type}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-muted">
          Email and Telegram delivery channels are extension points: the notification record is already
          persisted centrally, so a delivery adapter can be added without touching the producers.
        </p>
      </Panel>

      {toast.node}
    </div>
  );
}
