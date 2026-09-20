"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Globe,
  MapPin,
  Palette,
  Save,
  Sparkles,
  Megaphone,
  Share2,
  Users,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast, Skeleton } from "@/components/ui";

interface ClientDetail {
  id: string;
  name: string;
  brandName: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  timezone: string;
  language: string;
  status: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface BrandKit {
  tone: string | null;
  fonts: string | null;
  targetAudience: string | null;
  brandDescription: string | null;
  preferredCta: string | null;
  visualStyle: string | null;
  guidelines: string | null;
  hashtags: string[];
  primaryColors: string[];
  prohibitedPhrases: string[];
}

export default function ClientWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [brand, setBrand] = useState<BrandKit>({
    tone: "",
    fonts: "",
    targetAudience: "",
    brandDescription: "",
    preferredCta: "",
    visualStyle: "",
    guidelines: "",
    hashtags: [],
    primaryColors: [],
    prohibitedPhrases: [],
  });
  const [stats, setStats] = useState({ content: 0, campaigns: 0, accounts: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch(`/api/data?type=brandKits&clientId=${id}`).then((r) => r.json()),
      fetch(`/api/data?type=content&clientId=${id}&limit=200`).then((r) => r.json()),
      fetch(`/api/data?type=campaigns&clientId=${id}`).then((r) => r.json()),
      fetch(`/api/data?type=socialAccounts&clientId=${id}`).then((r) => r.json()),
    ])
      .then(([clientsRes, brandRes, contentRes, campaignsRes, accountsRes]) => {
        if (clientsRes.ok) {
          const found = clientsRes.clients.find((c: ClientDetail) => c.id === id);
          setClient(found ?? null);
        }
        if (brandRes.ok && brandRes.rows[0]) setBrand(brandRes.rows[0]);
        setStats({
          content: contentRes.ok ? contentRes.rows.length : 0,
          campaigns: campaignsRes.ok ? campaignsRes.rows.length : 0,
          accounts: accountsRes.ok ? accountsRes.rows.length : 0,
        });
      })
      .catch(() => toast.show("Failed to load workspace", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const saveBrand = async () => {
    if (!brand) return;
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "brandKit", clientId: id, ...brand }),
      });
      if (!res.ok) {
        toast.show("Failed to save brand kit", "error");
        return;
      }
      toast.show("Brand kit saved — AI agents will use it automatically");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton lines={10} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-ink">Client not found</h2>
        <Link href="/clients" className="btn btn-primary mt-6">
          <ArrowLeft size={15} /> Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={13} className="rtl:rotate-180" /> Back to clients
          </Link>

          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--c-accent)] to-[var(--c-accent-2)] text-xl font-bold text-white">
                {client.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                    {client.name}
                  </h1>
                  <Badge tone={client.status === "ACTIVE" ? "success" : "neutral"}>{client.status}</Badge>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[11.5px] text-muted">
                  {client.industry && (
                    <span className="flex items-center gap-1.5">
                      <Building2 size={11} className="text-[var(--c-accent)]" /> {client.industry}
                    </span>
                  )}
                  {client.country && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-[var(--c-accent)]" /> {client.country} ·{" "}
                      {client.timezone}
                    </span>
                  )}
                  {client.website && (
                    <span className="flex items-center gap-1.5">
                      <Globe size={11} className="text-[var(--c-accent)]" /> {client.website}
                    </span>
                  )}
                </div>
                {client.description && (
                  <p className="mt-3.5 max-w-2xl text-[12.5px] leading-relaxed text-muted">
                    {client.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Link href={`/agent-lab?clientId=${client.id}`} className="btn btn-primary">
                <Sparkles size={14} /> Generate content
              </Link>
              <Link href="/campaigns" className="btn btn-ghost">
                <Megaphone size={14} /> Campaigns
              </Link>
              <Link href="/social" className="btn btn-ghost">
                <Share2 size={14} /> Channels
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "CONTENT PIECES", value: stats.content, icon: <Sparkles size={17} /> },
          { label: "CAMPAIGNS", value: stats.campaigns, icon: <Megaphone size={17} /> },
          { label: "CONNECTED ACCOUNTS", value: stats.accounts, icon: <Share2 size={17} /> },
        ].map((stat) => (
          <Panel key={stat.label}>
            <div className="flex items-center justify-between">
              <div>
                <div className="micro text-[9px]">{stat.label}</div>
                <div className="num mt-2 text-[26px] font-semibold leading-none text-ink">{stat.value}</div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                {stat.icon}
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel>
            <PanelHeader
              label="BRAND KIT"
              title="Identity used automatically by every AI agent"
              action={
                <button className="btn btn-primary !py-2 !text-xs" onClick={saveBrand} disabled={saving}>
                  <Save size={13} /> Save brand kit
                </button>
              }
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="lbl">
                  <Palette size={10} className="me-1.5 inline" /> Tone of voice
                </label>
                <input
                  className="input"
                  value={brand?.tone ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...(b as BrandKit), tone: e.target.value }))}
                  placeholder="Confident, warm, professional"
                />
              </div>
              <div>
                <label className="lbl">Typography</label>
                <input
                  className="input"
                  value={brand?.fonts ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...(b as BrandKit), fonts: e.target.value }))}
                  placeholder="Cairo, Space Grotesk"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="lbl">Target audience</label>
                <textarea
                  className="input min-h-[86px]"
                  value={brand?.targetAudience ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...(b as BrandKit), targetAudience: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="lbl">Brand description</label>
                <textarea
                  className="input min-h-[92px]"
                  value={brand?.brandDescription ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...(b as BrandKit), brandDescription: e.target.value }))}
                />
              </div>
              <div>
                <label className="lbl">Preferred call to action</label>
                <input
                  className="input"
                  value={brand?.preferredCta ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...(b as BrandKit), preferredCta: e.target.value }))}
                />
              </div>
              <div>
                <label className="lbl">Brand hashtags (comma separated)</label>
                <input
                  className="input"
                  value={(brand?.hashtags ?? []).join(", ")}
                  onChange={(e) =>
                    setBrand((b) => ({
                      ...(b as BrandKit),
                      hashtags: e.target.value.split(",").map((h) => h.trim()).filter(Boolean),
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="lbl">Visual style</label>
                <textarea
                  className="input min-h-[76px]"
                  value={brand?.visualStyle ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...(b as BrandKit), visualStyle: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="lbl">Brand guidelines</label>
                <textarea
                  className="input min-h-[76px]"
                  value={brand?.guidelines ?? ""}
                  onChange={(e) => setBrand((b) => ({ ...(b as BrandKit), guidelines: e.target.value }))}
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <PanelHeader label="COLOUR SYSTEM" title="Primary palette" />
            <div className="mt-6 flex flex-wrap gap-3">
              {(brand?.primaryColors ?? []).length === 0 ? (
                <div className="flex flex-wrap gap-3">
                  {["#7C4DFF", "#2E7BFF", "#22D3EE"].map((color) => (
                    <div key={color} className="text-center">
                      <div
                        className="h-16 w-16 rounded-2xl border border-[var(--c-edge)]"
                        style={{ background: color }}
                      />
                      <div className="num mt-2 text-[9px] text-muted">{color}</div>
                    </div>
                  ))}
                  <p className="w-full text-[11px] text-muted">
                    No custom colours set — the FOX default palette is used until you define one.
                  </p>
                </div>
              ) : (
                (brand?.primaryColors ?? []).map((color) => (
                  <div key={color} className="text-center">
                    <div
                      className="h-16 w-16 rounded-2xl border border-[var(--c-edge)]"
                      style={{ background: color }}
                    />
                    <div className="num mt-2 text-[9px] text-muted">{color}</div>
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="GUARDRAILS" title="Prohibited phrases" />
            <div className="mt-5 flex flex-wrap gap-2">
              {(brand?.prohibitedPhrases ?? []).length === 0 ? (
                <p className="text-[11.5px] leading-relaxed text-muted">
                  No prohibited phrases configured yet. Add the words and claims the AI must never use for
                  this brand — agents receive them automatically as constraints.
                </p>
              ) : (
                (brand?.prohibitedPhrases ?? []).map((phrase) => (
                  <Badge key={phrase} tone="danger">
                    {phrase}
                  </Badge>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="CONTACT" title="Workspace contact details" />
            <div className="mt-5 space-y-3.5">
              {[
                { label: "Contact email", value: client.contactEmail ?? "—" },
                { label: "Contact phone", value: client.contactPhone ?? "—" },
                { label: "Website", value: client.website ?? "—" },
                { label: "Timezone", value: client.timezone },
                { label: "Preferred language", value: client.language === "ar" ? "العربية" : "English" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <span className="text-[11px] text-muted">{row.label}</span>
                  <span className="num text-[11.5px] text-ink">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="hairline my-5" />
            <div className="flex items-center gap-2.5 text-[11px] text-muted">
              <Users size={12} className="text-[var(--c-accent)]" />
              Tenant isolation active — only this workspace&rsquo;s data is returned by the API.
            </div>
          </Panel>
        </div>
      </div>

      {toast.node}
    </div>
  );
}
