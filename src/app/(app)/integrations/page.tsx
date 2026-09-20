"use client";

import { useEffect, useState } from "react";
import {
  Plug,
  MessageCircle,
  Table2,
  Cpu,
  Share2,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Webhook,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast } from "@/components/ui";

export default function IntegrationsPage() {
  const [syncing, setSyncing] = useState(false);
  const [webhook, setWebhook] = useState<{ configured: boolean; webhookUrl: string } | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/telegram/webhook")
      .then((r) => r.json())
      .then((d) => setWebhook(d))
      .catch(() => undefined);
  }, []);

  const registerWebhook = async () => {
    const res = await fetch("/api/system", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "telegram.webhook" }),
    });
    const data = await res.json();
    toast.show(res.ok ? data.message ?? "Webhook registered" : (data?.error ?? "Failed"), res.ok ? "success" : "error");
  };

  const syncSheets = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sheets.sync" }),
      });
      const data = await res.json();
      toast.show(res.ok ? "Google Sheets synchronised" : (data?.error ?? "Sync failed"), res.ok ? "success" : "error");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-8 bg-[var(--c-accent)]" />
            <span className="micro">EXTERNAL SERVICES</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Integrations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Every external service is connected through environment variables and server-side adapters.
            Nothing here requires a third-party orchestration tool — but n8n can be layered on top of
            the REST API without changing the core application.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Telegram */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c-cyan)_16%,transparent)] text-[var(--c-cyan)]">
                <MessageCircle size={19} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">Telegram Bot</h3>
                <div className="num text-[10.5px] text-muted">TELEGRAM_BOT_TOKEN · TELEGRAM_WEBHOOK_URL</div>
              </div>
            </div>
            <Badge tone={webhook?.configured ? "success" : "warning"}>
              {webhook?.configured ? "token set" : "requires credentials"}
            </Badge>
          </div>

          <div className="mt-5 space-y-2.5 rounded-xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] px-4 py-3.5">
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Webhook size={12} className="text-[var(--c-accent)]" />
              <span className="num truncate">{webhook?.webhookUrl ?? "/api/telegram/webhook"}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["/start", "/help", "/status", "/contact", "/agent"].map((cmd) => (
                <Badge key={cmd} tone="neutral">
                  {cmd}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn btn-primary !py-2.5 !text-xs" onClick={registerWebhook}>
              <Webhook size={13} /> Register webhook
            </button>
            <a href="/help" className="btn btn-ghost !py-2.5 !text-xs">
              Setup guide <ExternalLink size={12} />
            </a>
          </div>
        </Panel>

        {/* Google Sheets */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c-success)_16%,transparent)] text-[var(--c-success)]">
                <Table2 size={19} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">Google Sheets</h3>
                <div className="num text-[10.5px] text-muted">GOOGLE_SHEETS_ID · GOOGLE_SERVICE_ACCOUNT</div>
              </div>
            </div>
            <Badge tone="neutral">service account</Badge>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-muted">
            Server-side synchronisation writes operational data to the master spreadsheet and creates a
            dedicated worksheet for every client. Passwords, tokens and API keys are never written to
            Sheets.
          </p>

          <button className="btn btn-primary mt-5 !py-2.5 !text-xs" onClick={syncSheets} disabled={syncing}>
            {syncing ? <Loader2 size={13} className="spin" /> : <CheckCircle2 size={13} />} Sync now
          </button>
        </Panel>

        {/* Meta */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                <Share2 size={19} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">Meta (Facebook & Instagram)</h3>
                <div className="num text-[10.5px] text-muted">META_APP_ID · META_APP_SECRET · META_REDIRECT_URI</div>
              </div>
            </div>
            <Badge tone="warning">requires credentials</Badge>
          </div>

          <div className="mt-5 space-y-2">
            {[
              "OAuth login flow scaffolding",
              "Page access token storage (encrypted)",
              "Graph API publishing adapter",
              "Instagram content publishing adapter",
              "Connection health checks",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[11.5px] text-muted">
                <CheckCircle2 size={12} className="text-[var(--c-success)]" />
                {item}
              </div>
            ))}
          </div>

          <a href="/social" className="btn btn-ghost mt-5 !py-2.5 !text-xs">
            Configure channels <ExternalLink size={12} />
          </a>
        </Panel>

        {/* AI */}
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--c-amber)_16%,transparent)] text-[var(--c-amber)]">
                <Cpu size={19} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-ink">AI Provider Gateway</h3>
                <div className="num text-[10.5px] text-muted">
                  OMNIROUTE_URL · ARENA_API_URL · OPENROUTER_URL
                </div>
              </div>
            </div>
            <Badge tone="neutral">fallback routing</Badge>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-muted">
            Configure providers either in <strong className="text-ink">Settings → AI Providers</strong>{" "}
            (stored encrypted in the database) or through environment variables for a clean VPS
            deployment. Both sources are merged automatically by the gateway.
          </p>

          <a href="/providers" className="btn btn-primary mt-5 !py-2.5 !text-xs">
            Manage providers <ExternalLink size={12} />
          </a>
        </Panel>
      </div>

      <Panel>
        <PanelHeader label="OPTIONAL ORCHESTRATION" title="n8n, Zapier & custom automation" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "REST API first",
              body: "Every workflow (content, approvals, publishing, sync) is available as a documented REST endpoint, so external tools can trigger it.",
            },
            {
              title: "Webhook ready",
              body: "Incoming webhooks (Telegram today, Meta later) land in dedicated route handlers and are persisted before any processing.",
            },
            {
              title: "No hard dependency",
              body: "If an orchestration tool goes offline, the core platform keeps working — scheduling, publishing and sync are native.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-[var(--c-edge)] p-5">
              <div className="flex items-center gap-2.5">
                <Plug size={15} className="text-[var(--c-accent)]" />
                <div className="text-[13px] font-semibold text-ink">{item.title}</div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>

      {toast.node}
    </div>
  );
}
