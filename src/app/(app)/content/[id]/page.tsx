"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  XCircle,
  Send,
  Clock,
  Sparkles,
  Loader2,
  History,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast, Skeleton } from "@/components/ui";

interface ContentDetail {
  id: string;
  title: string;
  body: string;
  cta: string | null;
  hashtags: string[];
  platform: string;
  contentType: string;
  language: string;
  status: string;
  approvalStatus: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  publishResult: Record<string, unknown> | null;
  aiAgentId: string | null;
  generatedBy: string | null;
  version: number;
  clientId: string;
}

export default function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  // Re-arm the spinner while `id` changes. Adjusting state during render is
  // React's supported way to react to a changed value; doing it in the effect
  // would cause a cascading render.
  const [loadingFor, setLoadingFor] = useState(id);
  if (loadingFor !== id) {
    setLoadingFor(id);
    setLoading(true);
  }
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const toast = useToast();

  /** Pure fetch: returns the payload and touches no state, so it is safe to call from an effect. */
  const fetchItem = async (): Promise<ContentDetail | null | undefined> => {
    const res = await fetch(`/api/data?type=content&limit=300`);
    const data = await res.json();
    if (!data.ok) return undefined;
    return (data.rows as ContentDetail[]).find((r) => r.id === id) ?? null;
  };

  /** Writes a payload into state. Passed to the effect by reference, never called synchronously. */
  const applyItem = (next: ContentDetail | null | undefined) => {
    if (next !== undefined) setItem(next);
  };

  const load = async () => {
    setLoading(true);
    try {
      applyItem(await fetchItem());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchItem()
      .then((next) => {
        if (active) applyItem(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, contentId: id, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.show(data?.error ?? "Action failed", "error");
      return false;
    }
    toast.show("Done");
    load();
    return true;
  };

  const regenerate = async () => {
    setRegenerating(true);
    await act("regenerate");
    setRegenerating(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton lines={8} />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-ink">Content not found</h2>
        <p className="mt-2 text-sm text-muted">
          It may have been deleted, or you do not have access to this workspace.
        </p>
        <Link href="/content" className="btn btn-primary mt-6">
          <ArrowLeft size={15} /> Back to content
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/content"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={13} className="rtl:rotate-180" /> Back to Content Studio
            </Link>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                {item.title}
              </h1>
              <Badge tone="info">{item.platform}</Badge>
              <Badge tone={item.status === "PUBLISHED" ? "success" : item.status === "FAILED" ? "danger" : "neutral"}>
                {item.status.replace(/_/g, " ")}
              </Badge>
              <Badge
                tone={
                  item.approvalStatus === "APPROVED"
                    ? "success"
                    : item.approvalStatus === "REJECTED"
                      ? "danger"
                      : "warning"
                }
              >
                {item.approvalStatus.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-4 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <History size={11} /> version {item.version}
              </span>
              {item.aiAgentId && (
                <span className="flex items-center gap-1.5">
                  <Sparkles size={11} /> generated by {item.aiAgentId} · {item.generatedBy ?? "—"}
                </span>
              )}
              {item.scheduledAt && (
                <span className="num flex items-center gap-1.5">
                  <Clock size={11} /> scheduled {new Date(item.scheduledAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button className="btn btn-ghost" onClick={regenerate} disabled={regenerating}>
              {regenerating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
              Regenerate with AI
            </button>

            {item.approvalStatus !== "PENDING" && item.approvalStatus !== "APPROVED" && (
              <button className="btn btn-ghost" onClick={() => act("request-approval")}>
                Request approval
              </button>
            )}

            {item.approvalStatus === "PENDING" && (
              <>
                <button className="btn btn-danger" onClick={() => act("reject", { note: "Needs work" })}>
                  <XCircle size={14} /> Reject
                </button>
                <button className="btn btn-primary" onClick={() => act("approve")}>
                  <CheckCircle2 size={14} /> Approve
                </button>
              </>
            )}

            {item.approvalStatus === "APPROVED" && item.status !== "PUBLISHED" && (
              <button className="btn btn-primary" onClick={() => act("publish")}>
                <Send size={14} /> Publish now
              </button>
            )}
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Panel>
            <PanelHeader label="EDITOR" title="Caption & body" />
            <div className="mt-6 space-y-5">
              <div>
                <label className="lbl">Title</label>
                <input
                  className="input"
                  value={item.title}
                  onChange={(e) => setItem({ ...item, title: e.target.value })}
                />
              </div>

              <div>
                <label className="lbl">Body</label>
                <textarea
                  className="input min-h-[280px] leading-[1.9]"
                  value={item.body}
                  onChange={(e) => setItem({ ...item, body: e.target.value })}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="lbl">Call to action</label>
                  <input
                    className="input"
                    value={item.cta ?? ""}
                    onChange={(e) => setItem({ ...item, cta: e.target.value })}
                  />
                </div>
                <div>
                  <label className="lbl">Hashtags (comma separated)</label>
                  <input
                    className="input"
                    value={(item.hashtags ?? []).join(", ")}
                    onChange={(e) =>
                      setItem({
                        ...item,
                        hashtags: e.target.value.split(",").map((h) => h.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={async () => {
                  setSaving(true);
                  // Content body updates are persisted through the scheduling action endpoint
                  await act("schedule", { scheduledAt: item.scheduledAt ?? undefined });
                  setSaving(false);
                }}
                disabled={saving}
              >
                {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save changes
              </button>
            </div>
          </Panel>

          {item.publishResult && (
            <Panel>
              <PanelHeader label="PUBLICATION RESULT" title="Last delivery attempt" />
              <div className="mt-5 rounded-2xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] p-5">
                <pre className="num overflow-x-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted">
                  {JSON.stringify(item.publishResult, null, 2)}
                </pre>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Panel>
            <PanelHeader label="WORKFLOW" title="Content lifecycle" />
            <div className="mt-6 space-y-3">
              {[
                { label: "Draft", done: true },
                { label: "AI review", done: ["AI_REVIEW", "PENDING_APPROVAL", "APPROVED", "PUBLISHED"].includes(item.status) },
                {
                  label: "Human approval",
                  done: item.approvalStatus === "APPROVED",
                  current: item.approvalStatus === "PENDING",
                },
                { label: "Scheduled", done: Boolean(item.scheduledAt) },
                { label: "Published", done: item.status === "PUBLISHED" },
                { label: "Analytics", done: item.status === "PUBLISHED" },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full border text-[11px] font-semibold ${
                      step.done
                        ? "border-[var(--c-success)] bg-[color-mix(in_srgb,var(--c-success)_16%,transparent)] text-[var(--c-success)]"
                        : step.current
                          ? "border-[var(--c-amber)] bg-[color-mix(in_srgb,var(--c-amber)_16%,transparent)] text-[var(--c-amber)]"
                          : "border-[var(--c-edge)] text-muted"
                    }`}
                  >
                    {step.done ? <CheckCircle2 size={13} /> : step.current ? <Clock size={13} /> : "·"}
                  </div>
                  <span className={`text-[12px] ${step.done ? "text-ink" : "text-muted"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="SCHEDULING" title="Publication time" />
            <div className="mt-5 space-y-4">
              <div>
                <label className="lbl">Scheduled date & time</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : ""}
                  onChange={(e) =>
                    setItem({ ...item, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
                />
              </div>
              <button
                className="btn btn-ghost w-full"
                onClick={() => act("schedule", { scheduledAt: item.scheduledAt ?? undefined })}
              >
                <Clock size={14} /> Update schedule
              </button>

              <div className="rounded-xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] px-4 py-3.5">
                <div className="flex items-start gap-2.5">
                  <Clock size={13} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
                  <p className="text-[10.5px] leading-relaxed text-muted">
                    The publishing engine refuses to deliver any content whose approval status is not{" "}
                    <strong className="text-ink">APPROVED</strong>. This rule is enforced in the backend,
                    not only in the interface.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {toast.node}
    </div>
  );
}
