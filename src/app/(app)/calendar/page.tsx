"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Panel, PanelHeader, Badge, EmptyState, FadeIn, useToast } from "@/components/ui";

interface CalendarItem {
  id: string;
  title: string;
  platform: string;
  status: string;
  approvalStatus: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}

const TONE: Record<string, string> = {
  PUBLISHED: "success",
  SCHEDULED: "info",
  FAILED: "danger",
  DRAFT: "neutral",
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  NOT_REQUESTED: "neutral",
};

export default function CalendarPage() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<"month" | "list">("month");
  const toast = useToast();

  useEffect(() => {
    fetch("/api/data?type=content&limit=300")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setItems(d.rows);
      })
      .catch(() => undefined);
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const itemsFor = (date: Date) =>
    items.filter((item) => {
      if (!item.scheduledAt) return false;
      const d = new Date(item.scheduledAt);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });

  const scheduledItems = items
    .filter((i) => i.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">SCHEDULING</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Content Calendar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Only approved content can be published. The scheduler refuses any publication whose
              approval status is not <strong className="text-ink">APPROVED</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--c-edge)] p-1">
              {(["month", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                    view === v ? "bg-[var(--c-accent)] text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--c-edge)] text-muted hover:text-ink"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="min-w-[150px] text-center text-sm font-semibold text-ink">
                {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </div>
              <button
                onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--c-edge)] text-muted hover:text-ink"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </FadeIn>

      {view === "month" ? (
        <Panel pad={false} className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-[var(--c-edge)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="px-3 py-3.5 text-center">
                <span className="micro text-[9px]">{day.toUpperCase()}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((date, index) => {
              const dayItems = date ? itemsFor(date) : [];
              const isToday =
                date &&
                date.getDate() === new Date().getDate() &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={index}
                  className={`min-h-[112px] border-b border-e border-[var(--c-edge)] p-2.5 transition-colors ${
                    date ? "hover:bg-[var(--c-panel-2)]" : "bg-[color-mix(in_srgb,var(--c-panel-2)_38%,transparent)]"
                  }`}
                >
                  {date && (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className={`num text-[11px] ${
                            isToday
                              ? "grid h-6 w-6 place-items-center rounded-full bg-[var(--c-accent)] font-bold text-white"
                              : "text-muted"
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {dayItems.length > 0 && (
                          <span className="num text-[9px] text-[var(--c-accent)]">{dayItems.length}</span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            title={`${item.title} — ${item.status}`}
                            className={`rounded-md border-s-2 px-2 py-1.5 text-[9.5px] font-medium leading-tight ${
                              item.status === "PUBLISHED"
                                ? "border-[var(--c-success)] bg-[color-mix(in_srgb,var(--c-success)_13%,transparent)] text-ink"
                                : item.status === "FAILED"
                                  ? "border-[var(--c-danger)] bg-[color-mix(in_srgb,var(--c-danger)_13%,transparent)] text-ink"
                                  : "border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-ink"
                            }`}
                          >
                            <div className="truncate">{item.title}</div>
                            <div className="mt-0.5 truncate text-[8.5px] uppercase tracking-wider text-muted">
                              {item.platform} · {item.approvalStatus.replace(/_/g, " ")}
                            </div>
                          </div>
                        ))}
                        {dayItems.length > 3 && (
                          <div className="px-1 text-[9px] text-muted">+{dayItems.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      ) : (
        <Panel>
          <PanelHeader label="UPCOMING" title="Scheduled content" />
          {scheduledItems.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={26} />}
              title="Your content calendar is empty"
              body="Schedule approved content from the Content Studio and it will appear here instantly."
              actionLabel="Open Content Studio"
              onAction={() => {
                window.location.href = "/content";
              }}
            />
          ) : (
            <div className="mt-5 space-y-2">
              {scheduledItems.slice(0, 60).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-[var(--c-edge)] px-4 py-3.5 transition-colors hover:bg-[var(--c-panel-2)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{item.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                      <Clock size={11} />
                      <span className="num">{new Date(item.scheduledAt!).toLocaleString()}</span>
                      <Badge tone="info">{item.platform}</Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={TONE[item.approvalStatus] ?? "neutral"}>
                      {item.approvalStatus === "APPROVED" ? (
                        <>
                          <CheckCircle2 size={11} /> approved
                        </>
                      ) : item.approvalStatus === "REJECTED" ? (
                        <>
                          <XCircle size={11} /> rejected
                        </>
                      ) : (
                        item.approvalStatus.replace(/_/g, " ")
                      )}
                    </Badge>
                    <Badge tone={TONE[item.status] ?? "neutral"}>{item.status.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {toast.node}
    </div>
  );
}
