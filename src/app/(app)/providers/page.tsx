"use client";

import { useEffect, useState } from "react";
import {
  Cpu,
  Plus,
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { Panel, PanelHeader, Badge, Modal, FadeIn, useToast, Skeleton } from "@/components/ui";

interface ProviderRow {
  id: string;
  key: string;
  name: string;
  model: string;
  enabled: boolean;
  configured: boolean;
  status: string;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastLatencyMs: number | null;
  baseUrl: string;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const toast = useToast();

  const [form, setForm] = useState({
    key: "",
    name: "",
    baseUrl: "https://",
    model: "",
    apiKey: "",
    timeoutMs: 60000,
    maxRetries: 1,
    priority: 10,
    enabled: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data?type=agentRuns&limit=1");
      await res.json();
      const health = await fetch("/api/system?scope=health");
      const data = await health.json();
      if (data.ok) setProviders(data.providers ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.key || !form.name || !form.model) {
      toast.show("Key, name and model are required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "provider.save", provider: form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Failed to save provider", "error");
        return;
      }
      toast.show("Provider configuration saved");
      setOpen(false);
      setForm({
        key: "",
        name: "",
        baseUrl: "https://",
        model: "",
        apiKey: "",
        timeoutMs: 60000,
        maxRetries: 1,
        priority: 10,
        enabled: true,
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  const test = async (key?: string) => {
    setTesting(key ?? "all");
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "provider.test", ...(key ? { key } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Connectivity test failed", "error");
        return;
      }
      toast.show(`Connected via ${data.provider} in ${data.latencyMs}ms`);
      load();
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">MODEL GATEWAY · FALLBACK ROUTING</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">AI Providers</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Agents never call a provider directly — they route through the gateway, which tries each
              enabled OpenAI-compatible provider in priority order until one succeeds. Usage is never
              described as &ldquo;unlimited&rdquo;.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn btn-ghost" onClick={() => test()} disabled={testing !== null}>
              {testing === "all" ? <Loader2 size={15} className="spin" /> : <Zap size={15} />} Test routing
            </button>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> Add provider
            </button>
          </div>
        </div>
      </FadeIn>

      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--c-amber)_34%,transparent)] bg-[color-mix(in_srgb,var(--c-amber)_10%,transparent)] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
          <div className="text-[12.5px] leading-relaxed text-ink-soft">
            <strong className="text-ink">Honest usage policy.</strong> The platform reports the exact
            provider, model, latency and token counts returned by the upstream API. It never claims
            unlimited AI, and it continues working (through fallback providers) when a model is
            unavailable.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-6">
              <Skeleton lines={5} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {providers.map((provider) => (
            <Panel key={provider.id} hover>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                    <Cpu size={19} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">{provider.name}</h3>
                    <div className="num text-[11px] text-muted">{provider.model}</div>
                  </div>
                </div>
                <Badge
                  tone={
                    provider.status === "OPERATIONAL"
                      ? "success"
                      : provider.status === "ERROR"
                        ? "danger"
                        : provider.configured
                          ? "warning"
                          : "neutral"
                  }
                >
                  {provider.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <div className="mt-5 space-y-2.5 text-xs text-muted">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <KeyRound size={12} /> API key
                  </span>
                  <span className="num">
                    {provider.configured ? "configured · encrypted" : "not configured"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} /> Last success
                  </span>
                  <span className="num">
                    {provider.lastSuccessAt ? new Date(provider.lastSuccessAt).toLocaleString() : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5">
                    <Zap size={12} /> Last latency
                  </span>
                  <span className="num">{provider.lastLatencyMs ? `${provider.lastLatencyMs}ms` : "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Enabled</span>
                  <Badge tone={provider.enabled ? "success" : "neutral"}>
                    {provider.enabled ? "yes" : "no"}
                  </Badge>
                </div>
              </div>

              {provider.lastError && (
                <div className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--c-danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--c-danger)_10%,transparent)] px-4 py-3">
                  <div className="flex items-start gap-2 text-[11px] text-[var(--c-danger)]">
                    <XCircle size={13} className="mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{provider.lastError}</span>
                  </div>
                </div>
              )}

              <button
                className="btn btn-ghost mt-5 w-full !py-2.5 !text-xs"
                onClick={() => test(provider.key)}
                disabled={testing !== null}
              >
                {testing === provider.key ? (
                  <>
                    <Loader2 size={13} className="spin" /> Testing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} /> Test connectivity
                  </>
                )}
              </button>
            </Panel>
          ))}

          {providers.length === 0 && (
            <Panel className="sm:col-span-2">
              <div className="flex flex-col items-center py-12 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] text-[var(--c-accent)]">
                  <Cpu size={26} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">No AI provider configured</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  Add an OpenAI-compatible provider (OmniRoute, Arena.ai, OpenRouter or your own
                  endpoint) to unlock real content generation.
                </p>
                <button className="btn btn-primary mt-6" onClick={() => setOpen(true)}>
                  <Plus size={15} /> Add your first provider
                </button>
              </div>
            </Panel>
          )}
        </div>
      )}

      <Panel>
        <PanelHeader label="ROUTING ORDER" title="How fallback works" />
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { step: "01", title: "Priority sort", body: "Providers are ordered by their priority number (1 is tried first)." },
            { step: "02", title: "Timeout & retry", body: "Each provider has its own timeout and retry count." },
            { step: "03", title: "Automatic fallback", body: "On failure the gateway moves to the next provider and records the attempt." },
            { step: "04", title: "Full transparency", body: "Every attempt (provider, model, latency, error) is stored with the run." },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-[var(--c-edge)] p-5">
              <div className="num text-[22px] font-semibold text-[var(--c-accent)]">{item.step}</div>
              <div className="mt-3 text-[13px] font-semibold text-ink">{item.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add / update AI provider"
        wide
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Save provider
            </button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="lbl">Provider key (unique)</label>
            <input
              className="input"
              dir="ltr"
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="omniroute"
            />
          </div>
          <div>
            <label className="lbl">Display name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="OmniRoute"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="lbl">Base URL (OpenAI-compatible)</label>
            <input
              className="input"
              dir="ltr"
              value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              placeholder="https://api.example.com/v1"
            />
            <p className="mt-2 text-[11px] text-muted">
              The gateway appends <code className="num">/chat/completions</code> automatically.
            </p>
          </div>
          <div>
            <label className="lbl">Model</label>
            <input
              className="input"
              dir="ltr"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="gpt-4o-mini"
            />
          </div>
          <div>
            <label className="lbl">API key (stored encrypted)</label>
            <input
              className="input"
              dir="ltr"
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="sk-…"
            />
          </div>
          <div>
            <label className="lbl">Timeout (ms)</label>
            <input
              className="input"
              type="number"
              value={form.timeoutMs}
              onChange={(e) => setForm({ ...form, timeoutMs: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="lbl">Max retries</label>
            <input
              className="input"
              type="number"
              value={form.maxRetries}
              onChange={(e) => setForm({ ...form, maxRetries: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="lbl">Priority (1 = first)</label>
            <input
              className="input"
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <input
              id="enabled"
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--c-accent)]"
            />
            <label htmlFor="enabled" className="text-sm text-ink">
              Enabled for routing
            </label>
          </div>
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
