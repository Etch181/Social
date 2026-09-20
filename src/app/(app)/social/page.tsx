"use client";

import { useEffect, useState } from "react";
import {
  Share2,
  Plus,
  Loader2,
  Plug,
  CheckCircle2,
  XCircle,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import { Panel, PanelHeader, Badge, Modal, EmptyState, FadeIn, useToast } from "@/components/ui";

interface PlatformInfo {
  id: string;
  label: string;
  labelAr: string;
  connected: boolean;
  implemented: boolean;
  requiredCredentials: string[];
  accountCount: number;
}

interface AccountRow {
  id: string;
  platform: string;
  accountName: string | null;
  accountId: string | null;
  status: string;
  hasToken: boolean;
  lastError: string | null;
  lastCheckedAt: string | null;
}

/** What one social page fetch resolves to. */
interface SocialSnapshot {
  platforms: PlatformInfo[] | null;
  accounts: AccountRow[] | null;
  clients: { id: string; name: string }[] | null;
}

export default function SocialPage() {
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const toast = useToast();

  const [form, setForm] = useState({
    platform: "telegram",
    clientId: "",
    accountName: "",
    accountId: "",
    accessToken: "",
  });

  /** Pure fetch: returns all three payloads and touches no state, so it is safe to call from an effect. */
  const fetchSocial = async (): Promise<SocialSnapshot> => {
    const [healthRes, accountsRes, clientsRes] = await Promise.all([
      fetch("/api/system?scope=health"),
      fetch("/api/data?type=socialAccounts"),
      fetch("/api/clients"),
    ]);
    const health = await healthRes.json();
    const acc = await accountsRes.json();
    const cl = await clientsRes.json();
    return {
      platforms: health.ok ? (health.platforms as PlatformInfo[]) ?? [] : null,
      accounts: acc.ok ? (acc.rows as AccountRow[]) : null,
      clients: cl.ok ? (cl.clients as { id: string; name: string }[]) : null,
    };
  };

  /** Writes a payload into state. Passed to the effect by reference, never called synchronously. */
  const applySocial = (next: SocialSnapshot) => {
    if (next.platforms) setPlatforms(next.platforms);
    if (next.accounts) setAccounts(next.accounts);
    if (next.clients) {
      setClients(next.clients);
      if (next.clients[0]) setForm((f) => ({ ...f, clientId: next.clients![0].id }));
    }
  };

  const load = async () => {
    applySocial(await fetchSocial());
  };

  useEffect(() => {
    let active = true;
    fetchSocial()
      .then((snapshot) => {
        if (active) applySocial(snapshot);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const connect = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "socialAccount", ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show(data?.error ?? "Failed to connect account", "error");
        return;
      }
      toast.show("Account saved");
      setOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const checkHealth = async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "social.health" }),
      });
      const data = await res.json();
      if (res.ok) toast.show("Connection health refreshed");
      else toast.show(data?.error ?? "Health check failed", "error");
      load();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">UNIVERSAL PUBLISHING ADAPTERS</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Social Accounts</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Every channel implements the same adapter interface — <code className="num">publish(platform, account, content)</code> —
              so the scheduler, automations and analytics work identically for current and future
              channels. Access tokens are encrypted at rest and never returned to the browser.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="btn btn-ghost" onClick={checkHealth} disabled={checking}>
              {checking ? <Loader2 size={15} className="spin" /> : <Plug size={15} />} Check health
            </button>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> Connect account
            </button>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => (
          <Panel key={platform.id} hover>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14.5px] font-semibold text-ink">{platform.label}</h3>
                <div className="mt-1 text-[11px] text-muted">{platform.labelAr}</div>
              </div>
              <Badge
                tone={
                  !platform.implemented
                    ? "neutral"
                    : platform.connected
                      ? "success"
                      : platform.accountCount > 0
                        ? "warning"
                        : "neutral"
                }
              >
                {!platform.implemented ? (
                  "future extension"
                ) : platform.connected ? (
                  <>
                    <CheckCircle2 size={11} /> connected
                  </>
                ) : (
                  <>
                    <AlertTriangle size={11} /> requires credentials
                  </>
                )}
              </Badge>
            </div>

            <div className="mt-5">
              <div className="micro text-[9px]">REQUIRED CREDENTIALS</div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {platform.requiredCredentials.map((c) => (
                  <Badge key={c} tone="neutral">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--c-edge)] pt-4">
              <span className="text-[11px] text-muted">
                {platform.accountCount} account{platform.accountCount === 1 ? "" : "s"}
              </span>
              <button
                className="btn btn-ghost !px-3 !py-1.5 !text-[11px]"
                onClick={() => {
                  setForm((f) => ({ ...f, platform: platform.id }));
                  setOpen(true);
                }}
                disabled={!platform.implemented}
              >
                {platform.implemented ? "Configure" : "Planned"}
              </button>
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader label="CONNECTED ACCOUNTS" title="Workspace channel connections" />
        {accounts.length === 0 ? (
          <EmptyState
            icon={<Share2 size={26} />}
            title="Connect your first social account"
            body="Once connected, the universal publisher can deliver approved content automatically on schedule."
            actionLabel="Connect an account"
            onAction={() => setOpen(true)}
          />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Account</th>
                  <th>Account ID</th>
                  <th>Status</th>
                  <th>Token</th>
                  <th>Last checked</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <Badge tone="info">{account.platform}</Badge>
                    </td>
                    <td className="font-medium text-ink">{account.accountName ?? "—"}</td>
                    <td className="num text-xs">{account.accountId ?? "—"}</td>
                    <td>
                      <Badge tone={account.status === "CONNECTED" ? "success" : account.status === "ERROR" ? "danger" : "neutral"}>
                        {account.status === "CONNECTED" ? (
                          <>
                            <CheckCircle2 size={11} /> {account.status}
                          </>
                        ) : account.status === "ERROR" ? (
                          <>
                            <XCircle size={11} /> {account.status}
                          </>
                        ) : (
                          account.status
                        )}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={account.hasToken ? "success" : "warning"}>
                        {account.hasToken ? "encrypted" : "missing"}
                      </Badge>
                    </td>
                    <td className="num text-xs">
                      {account.lastCheckedAt ? new Date(account.lastCheckedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel className="relative overflow-hidden">
        <div className="absolute inset-0 aurora opacity-50" />
        <div className="relative flex flex-col items-start gap-5 p-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--c-cyan)_16%,transparent)] text-[var(--c-cyan)]">
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">Telegram bot & webhook</h3>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
                Set <code className="num">TELEGRAM_BOT_TOKEN</code> in your environment, then register
                the webhook from the Integrations page to start receiving customer messages into the
                unified inbox with AI-assisted replies.
              </p>
            </div>
          </div>
          <a href="/integrations" className="btn btn-primary">
            Open integrations
          </a>
        </div>
      </Panel>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Connect social account"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={connect} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />} Save account
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="lbl">Platform</label>
            <select
              className="input"
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
            >
              {platforms
                .filter((p) => p.implemented)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="lbl">Client workspace</label>
            <select
              className="input"
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="lbl">Account name</label>
            <input
              className="input"
              value={form.accountName}
              onChange={(e) => setForm({ ...form, accountName: e.target.value })}
              placeholder="@brandchannel"
            />
          </div>
          <div>
            <label className="lbl">
              Account / page / chat ID{" "}
              {form.platform === "telegram" && "(Telegram channel or chat id)"}
            </label>
            <input
              className="input"
              dir="ltr"
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Access token (encrypted with AES-256-GCM before storage)</label>
            <input
              className="input"
              dir="ltr"
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              placeholder="Paste the token from the provider dashboard"
            />
          </div>
        </div>
      </Modal>

      {toast.node}
    </div>
  );
}
