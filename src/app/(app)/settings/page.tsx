"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2, Building2, Palette, Globe, ShieldCheck, KeyRound } from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast } from "@/components/ui";
import { useApp } from "@/components/providers/app-provider";

export default function SettingsPage() {
  const { theme, setTheme, locale, setLocale } = useApp();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [agency, setAgency] = useState({
    name: "",
    website: "",
    contactEmail: "",
    timezone: "UTC",
    defaultLanguage: "en",
    accentColor: "#7C4DFF",
    logoUrl: "",
  });

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    fetch("/api/system?scope=overview")
      .then((r) => r.json())
      .finally(() => setLoading(false));
  }, []);

  const saveAgency = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settings.agency", ...agency }),
      });
      const data = await res.json();
      toast.show(res.ok ? "Agency settings saved" : (data?.error ?? "Save failed"), res.ok ? "success" : "error");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwords.newPassword.length < 10) {
      toast.show("New password must be at least 10 characters", "error");
      return;
    }
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", ...passwords }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.show(data?.error ?? "Password change failed", "error");
      return;
    }
    setPasswords({ currentPassword: "", newPassword: "" });
    toast.show("Password updated and other sessions revoked");
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-8 bg-[var(--c-accent)]" />
            <span className="micro">PLATFORM CONFIGURATION</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Agency identity, appearance, language, security and integration defaults. Changes are
            applied immediately and written to the audit trail.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Panel>
            <PanelHeader label="AGENCY" title="Organisation identity" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="lbl">
                  <Building2 size={11} className="me-1.5 inline" /> Agency name
                </label>
                <input
                  className="input"
                  value={agency.name}
                  onChange={(e) => setAgency({ ...agency, name: e.target.value })}
                  placeholder="FOX AI SOCIAL"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="lbl">
                  <Globe size={11} className="me-1.5 inline" /> Website
                </label>
                <input
                  className="input"
                  dir="ltr"
                  value={agency.website}
                  onChange={(e) => setAgency({ ...agency, website: e.target.value })}
                  placeholder="https://social.foxaiagency.online"
                />
              </div>
              <div>
                <label className="lbl">Contact email</label>
                <input
                  className="input"
                  dir="ltr"
                  type="email"
                  value={agency.contactEmail}
                  onChange={(e) => setAgency({ ...agency, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <label className="lbl">Timezone</label>
                <input
                  className="input"
                  value={agency.timezone}
                  onChange={(e) => setAgency({ ...agency, timezone: e.target.value })}
                  placeholder="Asia/Riyadh"
                />
              </div>
              <div>
                <label className="lbl">Default language</label>
                <select
                  className="input"
                  value={agency.defaultLanguage}
                  onChange={(e) => setAgency({ ...agency, defaultLanguage: e.target.value })}
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="lbl">
                  <KeyRound size={11} className="me-1.5 inline" /> Logo URL (uploaded asset)
                </label>
                <input
                  className="input"
                  dir="ltr"
                  value={agency.logoUrl}
                  onChange={(e) => setAgency({ ...agency, logoUrl: e.target.value })}
                  placeholder="/images/logo.png"
                />
              </div>
            </div>

            <button className="btn btn-primary mt-6" onClick={saveAgency} disabled={saving}>
              {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save agency settings
            </button>
          </Panel>

          <Panel>
            <PanelHeader label="SECURITY" title="Change administrator password" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="lbl">Current password</label>
                <input
                  className="input"
                  type="password"
                  dir="ltr"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                />
              </div>
              <div>
                <label className="lbl">New password (min. 10 characters)</label>
                <input
                  className="input"
                  type="password"
                  dir="ltr"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] px-4 py-3.5">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--c-success)]" />
              <p className="text-[11.5px] leading-relaxed text-muted">
                Changing your password immediately revokes every other active session on the platform.
              </p>
            </div>
            <button className="btn btn-primary mt-6" onClick={changePassword}>
              <ShieldCheck size={15} /> Update password
            </button>
          </Panel>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <PanelHeader label="APPEARANCE" title="Theme & interface" />
            <div className="mt-6 space-y-6">
              <div>
                <div className="lbl">
                  <Palette size={11} className="me-1.5 inline" /> Colour mode
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["dark", "light", "system"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTheme(mode)}
                      className={`rounded-xl border px-4 py-3 text-xs font-semibold capitalize transition-all ${
                        theme === mode
                          ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-ink"
                          : "border-[var(--c-edge)] text-muted hover:border-[var(--c-edge-strong)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="lbl">Interface language / direction</div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "en", label: "English", sub: "Left-to-right" },
                      { value: "ar", label: "العربية", sub: "من اليمين إلى اليسار" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLocale(option.value as "en" | "ar")}
                      className={`rounded-xl border px-4 py-3 text-start transition-all ${
                        locale === option.value
                          ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-ink"
                          : "border-[var(--c-edge)] text-muted hover:border-[var(--c-edge-strong)]"
                      }`}
                    >
                      <div className="text-[12.5px] font-semibold">{option.label}</div>
                      <div className="mt-1 text-[10px]">{option.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="lbl">Accent palette</div>
                <div className="flex flex-wrap gap-2.5">
                  {["#7C4DFF", "#2E7BFF", "#22D3EE", "#FFB020", "#2EE6A8"].map((color) => (
                    <div
                      key={color}
                      className="h-9 w-9 rounded-full border border-[var(--c-edge)]"
                      style={{ background: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted">
                  The default FOX palette: violet instrumentation, electric blue data, cyan telemetry
                  and amber reserved for warnings.
                </p>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="ENVIRONMENT" title="Deployment information" />
            <div className="mt-5 space-y-3">
              {[
                { label: "Node environment", value: process.env.NODE_ENV ?? "production" },
                { label: "Application URL", value: "Configured via APP_URL" },
                { label: "Database", value: "PostgreSQL via Drizzle ORM" },
                { label: "Password hashing", value: "bcrypt (cost factor 12)" },
                { label: "Session token", value: "JWT (HS256) in httpOnly cookie" },
                { label: "Secret encryption", value: "AES-256-GCM at rest" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4">
                  <span className="text-[11.5px] text-muted">{row.label}</span>
                  <Badge tone="neutral">{row.value}</Badge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="MODULES" title="Extension readiness" />
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "Facebook adapter",
                "Instagram adapter",
                "Telegram adapter",
                "TikTok (extension point)",
                "LinkedIn (extension point)",
                "YouTube (extension point)",
                "WhatsApp (extension point)",
                "Email marketing (extension point)",
                "CRM (extension point)",
              ].map((module) => (
                <Badge key={module} tone={module.includes("extension") ? "neutral" : "success"}>
                  {module}
                </Badge>
              ))}
            </div>
          </Panel>

            <Panel>
              <PanelHeader label="ABOUT" />
              <div className="mt-4 flex items-center gap-3">
                <Settings size={18} className="text-[var(--c-accent)]" />
                <div>
                  <div className="text-[13px] font-semibold text-ink">FOX AI SOCIAL</div>
                  <div className="num text-[10.5px] text-muted">v1.0.0 · build channel: stable</div>
                </div>
              </div>
            </Panel>
        </div>
      </div>

      {toast.node}
    </div>
  );
}
