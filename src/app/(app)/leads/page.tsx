"use client";

import { useEffect, useState } from "react";
import { UserPlus, Plus, Loader2, Mail, Building2, Clock } from "lucide-react";
import { Panel, PanelHeader, Badge, EmptyState, Modal, FadeIn, useToast } from "@/components/ui";

interface LeadRow {
  id: string;
  name: string;
  contact: string | null;
  source: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

export default function LeadsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ name: "", contact: "", source: "manual", clientId: "", notes: "" });
  const toast = useToast();

  const load = () =>
    fetch("/api/data?type=leads&limit=120")
      .then((r) => r.json())
      .then((d) => d.ok && setRows(d.rows));

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
    if (!form.name.trim()) {
      toast.show("Lead name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "lead", ...form }),
      });
      if (!res.ok) {
        toast.show("Failed to create lead", "error");
        return;
      }
      toast.show("Lead created");
      setOpen(false);
      setForm({ name: "", contact: "", source: "manual", clientId: form.clientId, notes: "" });
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
              <span className="micro">PIPELINE</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Leads</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Leads captured by the AI customer-service bot, social conversations or manual entry — all
              scoped to a client workspace.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Add lead
          </button>
        </div>
      </FadeIn>

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<UserPlus size={26} />}
            title="No leads yet"
            body="Leads created by the Telegram assistant or added manually will appear here with their source and status."
            actionLabel="Add your first lead"
            onAction={() => setOpen(true)}
          />
        </Panel>
      ) : (
        <Panel pad={false}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--c-accent-soft)] text-[11px] font-bold text-[var(--c-accent)]">
                          {lead.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-ink">{lead.name}</div>
                          {lead.notes && <div className="text-[11px] text-muted">{lead.notes.slice(0, 60)}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Mail size={11} className="text-muted" />
                        <span className="num">{lead.contact ?? "—"}</span>
                      </div>
                    </td>
                    <td>
                      <Badge tone="neutral">
                        <Building2 size={10} /> {lead.source}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={lead.status === "NEW" ? "info" : "success"}>{lead.status}</Badge>
                    </td>
                    <td className="num text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} className="text-muted" />
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add lead"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={create} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Save lead
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="lbl">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Contact (email / phone / username)</label>
            <input className="input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div>
            <label className="lbl">Client workspace</label>
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="lbl">Source</label>
            <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="manual">Manual</option>
              <option value="telegram">Telegram bot</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="website">Website</option>
            </select>
          </div>
          <div>
            <label className="lbl">Notes</label>
            <textarea className="input min-h-[86px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
