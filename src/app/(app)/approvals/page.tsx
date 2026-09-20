"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, MessageSquare, RefreshCw, Clock, Inbox } from "lucide-react";
import { Panel, PanelHeader, Badge, EmptyState, Modal, FadeIn, useToast, Skeleton } from "@/components/ui";

interface ApprovalRow {
  approval: {
    id: string;
    contentId: string;
    status: string;
    decisionNote: string | null;
    createdAt: string;
    decidedAt: string | null;
  };
  content: {
    id: string;
    title: string;
    body: string;
    platform: string;
    language: string;
    scheduledAt: string | null;
    approvalStatus: string;
    status: string;
    mediaUrls: string[];
  } | null;
}

export default function ApprovalsPage() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ApprovalRow | null>(null);
  const [note, setNote] = useState("");
  const toast = useToast();

  /** Pure fetch: returns the payload and touches no state, so it is safe to call from an effect. */
  const fetchRows = async (): Promise<ApprovalRow[] | null> => {
    const res = await fetch("/api/data?type=approvals&limit=120");
    const data = await res.json();
    return data.ok ? (data.rows as ApprovalRow[]) : null;
  };

  /** Writes a payload into state. Passed to the effect by reference, never called synchronously. */
  const applyRows = (next: ApprovalRow[] | null) => {
    if (next) setRows(next);
  };

  const load = async () => {
    setLoading(true);
    try {
      applyRows(await fetchRows());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchRows()
      .then(applyRows)
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const decide = async (contentId: string, action: "approve" | "reject") => {
    const res = await fetch("/api/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, contentId, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.show(data?.error ?? "Decision failed", "error");
      return;
    }
    toast.show(action === "approve" ? "Content approved" : "Changes requested");
    setPreview(null);
    setNote("");
    load();
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-8 bg-[var(--c-accent)]" />
            <span className="micro">HUMAN-IN-THE-LOOP</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Approvals</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Nothing is published automatically. Every AI-generated or manually created asset passes
            through explicit human approval, and every decision is written to the audit trail.
          </p>
        </div>
      </FadeIn>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-6">
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Inbox size={26} />}
            title="No approval requests"
            body="When a team member or an AI agent requests approval, the item appears here with a full preview and decision history."
            actionLabel="Open Content Studio"
            onAction={() => {
              window.location.href = "/content";
            }}
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Panel key={row.approval.id} className="transition-colors hover:border-[var(--c-accent)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-ink">
                      {row.content?.title ?? "Untitled content"}
                    </h3>
                    <Badge tone="info">{row.content?.platform ?? "—"}</Badge>
                    <Badge
                      tone={
                        row.approval.status === "PENDING"
                          ? "warning"
                          : row.approval.status === "APPROVED"
                            ? "success"
                            : "danger"
                      }
                    >
                      {row.approval.status}
                    </Badge>
                  </div>

                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
                    {(row.content?.body ?? "").slice(0, 420)}
                    {(row.content?.body?.length ?? 0) > 420 && "…"}
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-4 text-[11px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} /> Requested {new Date(row.approval.createdAt).toLocaleString()}
                    </span>
                    {row.content?.scheduledAt && (
                      <span className="num">
                        Scheduled for {new Date(row.content.scheduledAt).toLocaleString()}
                      </span>
                    )}
                    {row.approval.decisionNote && <span>Note: {row.approval.decisionNote}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-ghost !px-3.5 !py-2 !text-xs" onClick={() => setPreview(row)}>
                    Preview
                  </button>
                  <Link href={`/content/${row.approval.contentId}`} className="btn btn-ghost !px-3.5 !py-2 !text-xs">
                    Edit
                  </Link>
                  <button
                    className="btn btn-ghost !px-3.5 !py-2 !text-xs"
                    onClick={async () => {
                      await fetch("/api/content", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "regenerate",
                          contentId: row.approval.contentId,
                        }),
                      });
                      toast.show("Regeneration requested");
                      load();
                    }}
                  >
                    <RefreshCw size={13} /> Regenerate
                  </button>
                  {row.approval.status === "PENDING" && (
                    <>
                      <button
                        className="btn btn-danger !px-3.5 !py-2 !text-xs"
                        onClick={() => decide(row.approval.contentId, "reject")}
                      >
                        <XCircle size={13} /> Reject
                      </button>
                      <button
                        className="btn btn-primary !px-3.5 !py-2 !text-xs"
                        onClick={() => decide(row.approval.contentId, "approve")}
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.content?.title ?? "Preview"}
        wide
        footer={
          preview?.approval.status === "PENDING" ? (
            <>
              <button className="btn btn-ghost" onClick={() => setPreview(null)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => preview && decide(preview.approval.contentId, "reject")}
              >
                <XCircle size={15} /> Request changes
              </button>
              <button
                className="btn btn-primary"
                onClick={() => preview && decide(preview.approval.contentId, "approve")}
              >
                <CheckCircle2 size={15} /> Approve
              </button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>
              Close
            </button>
          )
        }
      >
        {preview?.content?.mediaUrls?.length ? (
          <div className="mb-5 grid grid-cols-2 gap-3">
            {preview.content.mediaUrls.slice(0, 4).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className="h-40 w-full rounded-xl border border-[var(--c-edge)] object-cover"
              />
            ))}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] p-5">
          <div className="micro mb-3">CAPTION PREVIEW</div>
          <div className="whitespace-pre-wrap text-[13.5px] leading-[1.9] text-ink-soft">
            {preview?.content?.body}
          </div>
        </div>

        <div className="mt-5">
          <label className="lbl">
            <MessageSquare size={12} className="me-1.5 inline" />
            Decision note (optional)
          </label>
          <textarea className="input min-h-[90px]" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
