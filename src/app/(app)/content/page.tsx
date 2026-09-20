"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  Send,
  Clock,
  Filter,
  Loader2,
} from "lucide-react";
import { Panel, Badge, EmptyState, Modal, FadeIn, useToast, Skeleton } from "@/components/ui";

interface ContentRow {
  id: string;
  title: string;
  body: string;
  platform: string;
  status: string;
  approvalStatus: string;
  language: string;
  scheduledAt: string | null;
  updatedAt: string;
  clientId: string;
}

const TONE: Record<string, string> = {
  PUBLISHED: "success",
  SCHEDULED: "info",
  FAILED: "danger",
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  AI_REVIEW: "accent",
  CHANGES_REQUESTED: "warning",
  NOT_REQUESTED: "neutral",
  PENDING: "warning",
  REJECTED: "danger",
};

export default function ContentPage() {
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    title: "",
    body: "",
    platform: "instagram",
    contentType: "post",
    language: "en",
    clientId: "",
    cta: "",
    hashtags: "",
    scheduledAt: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/data?type=content&${params.toString()}&limit=120`);
      const data = await res.json();
      if (data.ok) setRows(data.rows);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setClients(d.clients);
          if (d.clients[0]) setForm((f) => ({ ...f, clientId: d.clients[0].id }));
        }
      })
      .catch(() => undefined);
  }, []);

  const create = async () => {
    if (!form.title.trim() || !form.clientId) {
      toast.show("Title and client are required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hashtags: form.hashtags
            .split(",")
            .map((h) => h.trim())
            .filter(Boolean),
          scheduledAt: form.scheduledAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Failed to create content", "error");
        return;
      }
      toast.show("Content created");
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const act = async (contentId: string, action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, contentId, ...extra }),
    });
    const data = await res.json();
    toast.show(res.ok ? "Done" : (data?.error ?? "Action failed"), res.ok ? "success" : "error");
    load();
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">CONTENT STUDIO</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Content</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Draft → AI review → human approval → scheduled → published → analytics. Publishing is
              blocked by the backend until content is explicitly approved.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search content…"
                className="input w-full min-w-[200px] ps-10"
              />
            </div>
            <div className="relative">
              <Filter size={14} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <select
                className="input w-full min-w-[150px] ps-9"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="AI_REVIEW">AI review</option>
                <option value="PENDING_APPROVAL">Pending approval</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="PUBLISHED">Published</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <Link href="/agent-lab" className="btn btn-ghost">
              <Sparkles size={15} /> Generate with AI
            </Link>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> New content
            </button>
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="panel p-6">
              <Skeleton lines={3} />
            </div>
          ))}
        </div>
      ) : rows.filter(
          (r) =>
            !query.trim() ||
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.body.toLowerCase().includes(query.toLowerCase()),
        ).length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Sparkles size={26} />}
            title="Your content library is empty"
            body="Generate your first post with an AI agent or create one manually, then route it through approval and scheduling."
            actionLabel="Open Agent Lab"
            onAction={() => {
              window.location.href = "/agent-lab";
            }}
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {rows
            .filter(
              (r) =>
                !query.trim() ||
                r.title.toLowerCase().includes(query.toLowerCase()) ||
                r.body.toLowerCase().includes(query.toLowerCase()),
            )
            .map((row) => (
              <div
                key={row.id}
                className="panel group flex flex-col gap-4 p-5 transition-all duration-200 hover:border-[var(--c-accent)] sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/content/${row.id}`}
                      className="truncate text-[15px] font-semibold text-ink hover:text-[var(--c-accent)]"
                    >
                      {row.title}
                    </Link>
                    <Badge tone="info">{row.platform}</Badge>
                    <Badge tone={TONE[row.status] ?? "neutral"}>{row.status.replace(/_/g, " ")}</Badge>
                    <Badge tone={TONE[row.approvalStatus] ?? "neutral"}>
                      {row.approvalStatus.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 max-w-3xl text-[13px] leading-relaxed text-muted">
                    {row.body.slice(0, 220)}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11px] text-muted">
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} />
                      {row.scheduledAt
                        ? `Scheduled ${new Date(row.scheduledAt).toLocaleString()}`
                        : `Updated ${new Date(row.updatedAt).toLocaleDateString()}`}
                    </span>
                    <span>{row.language === "ar" ? "العربية" : "English"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {row.approvalStatus !== "PENDING" && row.approvalStatus !== "APPROVED" && (
                    <button
                      onClick={() => act(row.id, "request-approval")}
                      className="btn btn-ghost !px-3.5 !py-2 !text-xs"
                    >
                      Request approval
                    </button>
                  )}
                  {row.approvalStatus === "PENDING" && (
                    <button
                      onClick={() => act(row.id, "approve")}
                      className="btn btn-primary !px-3.5 !py-2 !text-xs"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                  )}
                  {row.approvalStatus === "APPROVED" && row.status !== "PUBLISHED" && (
                    <button
                      onClick={() => act(row.id, "publish")}
                      className="btn btn-primary !px-3.5 !py-2 !text-xs"
                    >
                      <Send size={13} /> Publish now
                    </button>
                  )}
                  <Link href={`/content/${row.id}`} className="btn btn-ghost !px-3.5 !py-2 !text-xs">
                    Open
                  </Link>
                </div>
              </div>
            ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create content"
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={create} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Create content
            </button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="lbl">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Client *</label>
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="lbl">Platform</label>
            <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="telegram">Telegram</option>
              <option value="tiktok">TikTok (future)</option>
              <option value="linkedin">LinkedIn (future)</option>
            </select>
          </div>
          <div>
            <label className="lbl">Content type</label>
            <select
              className="input"
              value={form.contentType}
              onChange={(e) => setForm({ ...form, contentType: e.target.value })}
            >
              <option value="post">Post</option>
              <option value="carousel">Carousel</option>
              <option value="reel">Reel</option>
              <option value="story">Story</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label className="lbl">Language</label>
            <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="lbl">Caption / body</label>
            <textarea
              className="input min-h-[120px]"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Call to action</label>
            <input className="input" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Hashtags (comma separated)</label>
            <input
              className="input"
              value={form.hashtags}
              onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
              placeholder="marketing, ai, social"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="lbl">Schedule (optional)</label>
            <input
              type="datetime-local"
              className="input"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
