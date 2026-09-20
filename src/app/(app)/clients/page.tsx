"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Building2, Globe, MapPin, Search, Users, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Panel, PanelHeader, Badge, EmptyState, Modal, FadeIn, useToast, Skeleton } from "@/components/ui";

interface ClientRow {
  id: string;
  name: string;
  brandName: string | null;
  industry: string | null;
  country: string | null;
  website: string | null;
  status: string;
  language: string;
  timezone: string;
  createdAt: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    brandName: "",
    industry: "",
    country: "",
    website: "",
    contactEmail: "",
    description: "",
    language: "en",
    timezone: "UTC",
    tone: "",
    targetAudience: "",
  });

  const load = useCallback(async (search = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients${search ? `?q=${encodeURIComponent(search)}` : ""}`);
      const data = await res.json();
      if (data.ok) setClients(data.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => load(query), 280);
    return () => window.clearTimeout(id);
  }, [query, load]);

  const create = async () => {
    if (!form.name.trim()) {
      toast.show("Client name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Failed to create client", "error");
        return;
      }
      toast.show("Client workspace created");
      setOpen(false);
      setForm({
        name: "",
        brandName: "",
        industry: "",
        country: "",
        website: "",
        contactEmail: "",
        description: "",
        language: "en",
        timezone: "UTC",
        tone: "",
        targetAudience: "",
      });
      load(query);
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
              <span className="micro">MULTI-TENANT WORKSPACES</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Clients</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Every client workspace is isolated at the database and API layer — content, campaigns,
              analytics, conversations and tokens are scoped server-side.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                className="input w-full min-w-[220px] ps-10"
                aria-label="Search clients"
              />
            </div>
            <button onClick={() => setOpen(true)} className="btn btn-primary">
              <Plus size={16} /> New client
            </button>
          </div>
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
      ) : clients.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Building2 size={26} />}
            title="No clients yet"
            body="Create your first client workspace to start generating content, campaigns, approvals and analytics."
            actionLabel="Create your first client"
            onAction={() => setOpen(true)}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.36 }}
            >
              <Link
                href={`/clients/${client.id}`}
                className="panel group block p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--c-accent)] hover:shadow-[0_28px_70px_-32px_var(--c-glow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-2)] text-sm font-bold text-white">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">{client.name}</div>
                      <div className="truncate text-xs text-muted">{client.brandName ?? "—"}</div>
                    </div>
                  </div>
                  <Badge tone={client.status === "ACTIVE" ? "success" : "neutral"}>{client.status}</Badge>
                </div>

                <div className="mt-5 space-y-2.5 text-xs text-muted">
                  {client.industry && (
                    <div className="flex items-center gap-2">
                      <Building2 size={13} className="text-[var(--c-accent)]" />
                      <span className="truncate">{client.industry}</span>
                    </div>
                  )}
                  {client.country && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-[var(--c-accent)]" />
                      <span className="truncate">
                        {client.country} · {client.timezone}
                      </span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={13} className="text-[var(--c-accent)]" />
                      <span className="truncate" dir="ltr">
                        {client.website}
                      </span>
                    </div>
                  )}
                </div>

                <div className="hairline my-5" />

                <div className="flex items-center justify-between">
                  <Badge tone="accent">{client.language === "ar" ? "العربية" : "English"}</Badge>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!confirm(`Delete ${client.name}? This cannot be undone.`)) return;
                        await fetch(`/api/clients?id=${client.id}`, { method: "DELETE" });
                        load(query);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--c-edge)] text-muted opacity-0 transition-all hover:text-[var(--c-danger)] group-hover:opacity-100"
                      aria-label="Delete client"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-accent)]">
                      <Users size={13} /> Open workspace
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create client workspace"
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={create} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={15} className="spin" /> Creating…
                </>
              ) : (
                <>
                  <Plus size={15} /> Create client
                </>
              )}
            </button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="lbl">Client name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Acme Real Estate"
            />
          </div>
          <div>
            <label className="lbl">Brand name</label>
            <input
              className="input"
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Industry</label>
            <input
              className="input"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Real estate, retail, SaaS…"
            />
          </div>
          <div>
            <label className="lbl">Country</label>
            <input
              className="input"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Website</label>
            <input
              className="input"
              dir="ltr"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="lbl">Contact email</label>
            <input
              className="input"
              dir="ltr"
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Preferred language</label>
            <select
              className="input"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <div>
            <label className="lbl">Timezone</label>
            <input
              className="input"
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              placeholder="Asia/Riyadh"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="lbl">Description</label>
            <textarea
              className="input min-h-[92px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Tone of voice</label>
            <input
              className="input"
              value={form.tone}
              onChange={(e) => setForm({ ...form, tone: e.target.value })}
              placeholder="Professional, warm, confident"
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
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
