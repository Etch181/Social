"use client";

import { useEffect, useState } from "react";
import { Plus, Megaphone, Loader2, CalendarRange, Target, Users } from "lucide-react";
import { Panel, Badge, EmptyState, Modal, FadeIn, useToast, Skeleton } from "@/components/ui";

interface CampaignRow {
  id: string;
  name: string;
  objective: string | null;
  targetAudience: string | null;
  platforms: string[];
  status: string;
  budget: string | null;
  startDate: string | null;
  endDate: string | null;
}

const TONE: Record<string, string> = {
  ACTIVE: "success",
  STRATEGY: "accent",
  PAUSED: "warning",
  COMPLETED: "info",
  DRAFT: "neutral",
};

export default function CampaignsPage() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    clientId: "",
    name: "",
    objective: "",
    targetAudience: "",
    platforms: "instagram,facebook,telegram",
    budget: "",
    startDate: "",
    endDate: "",
    strategy: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data?type=campaigns&limit=120");
      const data = await res.json();
      if (data.ok) setRows(data.rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
    if (!form.name.trim() || !form.clientId) {
      toast.show("Campaign name and client are required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "campaign",
          clientId: form.clientId,
          name: form.name,
          objective: form.objective,
          targetAudience: form.targetAudience,
          platforms: form.platforms.split(",").map((p) => p.trim()).filter(Boolean),
          budget: form.budget ? Number(form.budget) : undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          strategy: form.strategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Failed to create campaign", "error");
        return;
      }
      toast.show("Campaign created");
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">CAMPAIGN OPERATIONS</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Campaigns</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Strategy → content plan → creative → approval → scheduling → publishing → analytics →
              optimisation. Each campaign is scoped to a single client workspace.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> New campaign
          </button>
        </div>
      </FadeIn>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel p-6">
              <Skeleton lines={5} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Megaphone size={26} />}
            title="No campaigns yet"
            body="Create a campaign to organise content, budgets, KPIs and publishing schedules per client."
            actionLabel="Create your first campaign"
            onAction={() => setOpen(true)}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Panel key={row.id} hover>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[15px] font-semibold text-ink">{row.name}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Target size={12} className="text-[var(--c-accent)]" />
                    <span className="truncate">{row.objective ?? "No objective set"}</span>
                  </div>
                </div>
                <Badge tone={TONE[row.status] ?? "neutral"}>{row.status}</Badge>
              </div>

              <div className="mt-5 space-y-3 text-xs text-muted">
                {row.targetAudience && (
                  <div className="flex items-start gap-2">
                    <Users size={13} className="mt-0.5 text-[var(--c-accent)]" />
                    <span className="line-clamp-2">{row.targetAudience}</span>
                  </div>
                )}
                {(row.startDate || row.endDate) && (
                  <div className="flex items-center gap-2">
                    <CalendarRange size={13} className="text-[var(--c-accent)]" />
                    <span className="num">
                      {row.startDate ? new Date(row.startDate).toLocaleDateString() : "—"} →{" "}
                      {row.endDate ? new Date(row.endDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {(row.platforms ?? []).map((p) => (
                  <Badge key={p} tone="info">
                    {p}
                  </Badge>
                ))}
                {(row.platforms ?? []).length === 0 && <Badge tone="neutral">No platforms</Badge>}
              </div>

              {row.budget && (
                <>
                  <div className="hairline my-5" />
                  <div className="flex items-center justify-between">
                    <span className="micro text-[9px]">BUDGET</span>
                    <span className="num text-sm font-semibold text-ink">{row.budget}</span>
                  </div>
                </>
              )}
            </Panel>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create campaign"
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={create} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Create campaign
            </button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
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
            <label className="lbl">Campaign name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="lbl">Objective</label>
            <textarea
              className="input min-h-[86px]"
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Target audience</label>
            <input
              className="input"
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Platforms (comma separated)</label>
            <input
              className="input"
              value={form.platforms}
              onChange={(e) => setForm({ ...form, platforms: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Budget</label>
            <input
              className="input"
              type="number"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Status</label>
            <select className="input" defaultValue="STRATEGY" onChange={(e) => setForm({ ...form, strategy: e.target.value })}>
              <option value="STRATEGY">Strategy</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          <div>
            <label className="lbl">Start date</label>
            <input
              className="input"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">End date</label>
            <input
              className="input"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="lbl">Strategy notes</label>
            <textarea
              className="input min-h-[86px]"
              value={form.strategy}
              onChange={(e) => setForm({ ...form, strategy: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
