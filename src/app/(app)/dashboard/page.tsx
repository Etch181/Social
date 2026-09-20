import Link from "next/link";
import {
  Users,
  Megaphone,
  CalendarClock,
  CheckCircle2,
  Send,
  AlertTriangle,
  Bot,
  Activity,
  ArrowRight,
  Plus,
  Sparkles,
  BarChart3,
  Share2,
  Cpu,
  Table2,
} from "lucide-react";
import { db } from "@/db";
import {
  agencies,
  agentRuns,
  approvals,
  auditLogs,
  campaigns,
  clients,
  contentItems,
  conversations,
  leads,
  socialAccounts,
} from "@/db/schema";
import { desc, count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { providerHealth } from "@/lib/ai/gateway";
import { sheetsHealth } from "@/lib/sheets/sync";
import { listPlatformStatus } from "@/lib/publishing";
import { Panel, PanelHeader, Stat, Counter, Badge, EmptyState, FadeIn } from "@/components/ui";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  PUBLISHED: "success",
  SCHEDULED: "info",
  FAILED: "danger",
  DRAFT: "neutral",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  AI_REVIEW: "accent",
  CHANGES_REQUESTED: "warning",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [agency] = await db.select().from(agencies).limit(1);

  const [totalClients] = await db.select({ value: count() }).from(clients);
  const [totalContent] = await db.select({ value: count() }).from(contentItems);
  const [scheduled] = await db.select({ value: count() }).from(contentItems).where(eq(contentItems.status, "SCHEDULED"));
  const [published] = await db.select({ value: count() }).from(contentItems).where(eq(contentItems.status, "PUBLISHED"));
  const [failed] = await db.select({ value: count() }).from(contentItems).where(eq(contentItems.status, "FAILED"));
  const [pendingApprovals] = await db.select({ value: count() }).from(approvals).where(eq(approvals.status, "PENDING"));
  const [activeCampaigns] = await db.select({ value: count() }).from(campaigns).where(eq(campaigns.status, "ACTIVE"));
  const [totalCampaigns] = await db.select({ value: count() }).from(campaigns);
  const [aiRunsCount] = await db.select({ value: count() }).from(agentRuns);
  const [socialCount] = await db.select({ value: count() }).from(socialAccounts);
  const [conversationsCount] = await db.select({ value: count() }).from(conversations);
  const [leadsCount] = await db.select({ value: count() }).from(leads);

  const recentContent = await db
    .select()
    .from(contentItems)
    .orderBy(desc(contentItems.updatedAt))
    .limit(5);

  const recentActivity = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(10);

  const providers = await providerHealth().catch(() => []);
  const sheets = await sheetsHealth().catch(() => ({ ok: false, message: "Unavailable" }));
  const platforms = await listPlatformStatus().catch(() => []);

  return (
    <div className="space-y-8">
      {/* ============================== MISSION BAND ============================== */}
      <FadeIn>
        <section className="relative overflow-hidden rounded-[22px] border border-[var(--c-edge)]">
          <div className="absolute inset-0">
            <img
              src="/images/observatory.jpg"
              alt=""
              aria-hidden
              className="h-full w-full object-cover object-center opacity-[0.38]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--c-bg)] via-[color-mix(in_srgb,var(--c-bg)_78%,transparent)] to-[color-mix(in_srgb,var(--c-accent)_26%,transparent)]" />
            <div className="absolute inset-0 grid-field opacity-50" />
            {/* telemetry arcs */}
            <svg className="absolute inset-y-0 end-0 h-full w-[46%] opacity-60" viewBox="0 0 400 300" fill="none" aria-hidden>
              <circle cx="260" cy="150" r="118" stroke="var(--c-cyan)" strokeOpacity="0.24" />
              <circle cx="260" cy="150" r="86" stroke="var(--c-accent)" strokeOpacity="0.32" strokeDasharray="3 9" />
              <circle cx="260" cy="150" r="52" stroke="var(--c-accent-2)" strokeOpacity="0.42" />
              <path d="M120 250 C190 190 210 120 260 32" stroke="var(--c-cyan)" strokeOpacity="0.32" strokeWidth="1.5" />
              <circle cx="260" cy="150" r="7" fill="var(--c-cyan)" fillOpacity="0.7" />
            </svg>
          </div>

          <div className="relative px-6 py-10 sm:px-10 sm:py-12">
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">MISSION BAND · {agency?.name ?? "FOX AI SOCIAL"}</span>
            </div>

            <h1 className="mt-4 max-w-2xl text-[34px] font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[46px]">
              {user ? `Welcome back, ${user.name.split(" ")[0]}.` : "Agency Command Center"}
              <br />
              <span className="text-grad">Every workspace, live.</span>
            </h1>

            <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-muted">
              Real-time operational telemetry across content, approvals, publishing, AI agents and
              integrations — measured, not mocked.
            </p>

            {/* horizontal KPI rule */}
            <div className="mt-9 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-[var(--c-edge-strong)] pt-7 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "CLIENTS", value: totalClients.value, icon: <Users size={15} /> },
                { label: "SCHEDULED", value: scheduled.value, icon: <CalendarClock size={15} /> },
                { label: "PUBLISHED", value: published.value, icon: <Send size={15} /> },
                { label: "PENDING", value: pendingApprovals.value, icon: <CheckCircle2 size={15} /> },
                { label: "AI RUNS", value: aiRunsCount.value, icon: <Bot size={15} /> },
                { label: "FAILED", value: failed.value, icon: <AlertTriangle size={15} /> },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <div className="flex items-center gap-1.5 text-[var(--c-muted)]">
                    <span className="text-[var(--c-accent)]">{kpi.icon}</span>
                    <span className="micro text-[9px]">{kpi.label}</span>
                  </div>
                  <div className="num mt-2 text-[30px] font-semibold leading-none text-ink">
                    <Counter to={kpi.value} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/clients" className="btn btn-primary">
                <Plus size={16} /> Add client
              </Link>
              <Link href="/agent-lab" className="btn btn-ghost">
                <Sparkles size={16} /> Generate content with AI
              </Link>
              <Link href="/approvals" className="btn btn-ghost">
                Review approvals <ArrowRight size={15} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ============================== STATS GRID ============================== */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total clients" value={<Counter to={totalClients.value} />} icon={<Users size={18} />} tone="accent" />
        <Stat
          label="Content pieces"
          value={<Counter to={totalContent.value} />}
          icon={<Sparkles size={18} />}
          tone="cyan"
        />
        <Stat
          label="Active campaigns"
          value={<Counter to={activeCampaigns.value} />}
          hint={`${totalCampaigns.value} total`}
          icon={<Megaphone size={18} />}
          tone="success"
        />
        <Stat
          label="Connected accounts"
          value={<Counter to={socialCount.value} />}
          hint={`${conversationsCount.value} conversations · ${leadsCount.value} leads`}
          icon={<Share2 size={18} />}
          tone="amber"
        />
      </section>

      {/* ============================== ASYMMETRIC 8/4 ============================== */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* main column */}
        <div className="space-y-6 lg:col-span-8">
          <Panel>
            <PanelHeader
              label="CONTENT PIPELINE"
              title="Recently updated content"
              action={
                <Link href="/content" className="btn btn-ghost !py-2 !text-xs">
                  View all <ArrowRight size={13} className="rtl:rotate-180" />
                </Link>
              }
            />

            {recentContent.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={26} />}
                title="No content yet"
                body="Generate your first post with an AI agent, then route it through approval and scheduling."
                actionLabel="Open Agent Lab"
                onAction={() => {
                  window.location.href = "/agent-lab";
                }}
              />
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Platform</th>
                      <th>Status</th>
                      <th>Approval</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentContent.map((item) => (
                      <tr key={item.id}>
                        <td className="max-w-[260px]">
                          <Link href={`/content/${item.id}`} className="font-medium text-ink hover:text-[var(--c-accent)]">
                            {item.title}
                          </Link>
                          <div className="mt-1 truncate text-xs text-muted">{item.body.slice(0, 68)}</div>
                        </td>
                        <td>
                          <Badge tone="info">{item.platform}</Badge>
                        </td>
                        <td>
                          <Badge tone={statusTone[item.status] ?? "neutral"}>{item.status.replace(/_/g, " ")}</Badge>
                        </td>
                        <td>
                          <Badge tone={statusTone[item.approvalStatus] ?? "neutral"}>
                            {item.approvalStatus.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="num text-xs">{new Date(item.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader label="ACTIVITY FEED" title="Latest system events" />
            <div className="mt-5 space-y-1">
              {recentActivity.length === 0 ? (
                <p className="py-6 text-sm text-muted">
                  No events recorded yet. Activity will appear here as soon as the platform is used.
                </p>
              ) : (
                recentActivity.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--c-panel-2)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--c-accent)]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-ink">
                        {event.action.replace(/[._]/g, " ")}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {event.entityType ?? "system"} · {event.ip ?? "internal"}
                      </div>
                    </div>
                    <div className="num shrink-0 text-[11px] text-muted">
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>

        {/* telemetry strip */}
        <div className="space-y-6 lg:col-span-4">
          <Panel className="relative overflow-hidden">
            <div className="absolute inset-0 aurora opacity-60" />
            <div className="relative">
              <PanelHeader label="LIVE TELEMETRY" title="System health" />

              <div className="mt-5 space-y-3">
                {[
                  {
                    label: "Database",
                    ok: true,
                    message: "PostgreSQL connection pool healthy",
                  },
                  {
                    label: "AI Gateway",
                    ok: providers.some((p) => p.status === "OPERATIONAL"),
                    message: providers.length
                      ? `${providers.filter((p) => p.enabled).length} provider(s) configured`
                      : "No provider configured",
                  },
                  {
                    label: "Google Sheets",
                    ok: sheets.ok,
                    message: sheets.message,
                  },
                  {
                    label: "Telegram",
                    ok: platforms.find((p) => p.id === "telegram")?.connected ?? false,
                    message:
                      platforms.find((p) => p.id === "telegram")?.connected
                        ? "Bot channel connected"
                        : "Not connected — requires TELEGRAM_BOT_TOKEN",
                  },
                  {
                    label: "Meta (FB / IG)",
                    ok:
                      (platforms.find((p) => p.id === "facebook")?.connected ??
                        false) ||
                      (platforms.find((p) => p.id === "instagram")?.connected ?? false),
                    message:
                      platforms.find((p) => p.id === "facebook")?.connected
                        ? "Facebook page connected"
                        : "Requires Meta credentials",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-start gap-3 rounded-xl border border-[var(--c-edge)] bg-[color-mix(in_srgb,var(--c-panel-2)_52%,transparent)] px-4 py-3"
                  >
                    <span
                      className={`pulse-dot mt-1.5 shrink-0 ${
                        row.ok ? "text-[var(--c-success)]" : "text-[var(--c-amber)]"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-ink">{row.label}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted">{row.message}</div>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/health" className="btn btn-ghost mt-5 w-full !py-2.5 !text-xs">
                Open system health <ArrowRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="QUICK ACTIONS" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { href: "/clients", label: "Add client", icon: <Plus size={16} /> },
                { href: "/agent-lab", label: "Run AI agent", icon: <Bot size={16} /> },
                { href: "/calendar", label: "Calendar", icon: <CalendarClock size={16} /> },
                { href: "/analytics", label: "Analytics", icon: <BarChart3 size={16} /> },
                { href: "/providers", label: "AI providers", icon: <Cpu size={16} /> },
                { href: "/sheets", label: "Sheets sync", icon: <Table2 size={16} /> },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex items-center gap-2.5 rounded-xl border border-[var(--c-edge)] px-3.5 py-3 text-[12px] font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--c-accent)] hover:bg-[var(--c-accent-soft)]"
                >
                  <span className="text-[var(--c-accent)]">{action.icon}</span>
                  <span className="truncate">{action.label}</span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="AI PROVIDER STATUS" />
            <div className="mt-4 space-y-2.5">
              {providers.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted">
                  No AI provider is configured yet. Connect OmniRoute, Arena.ai or OpenRouter to unlock
                  real content generation.
                </p>
              ) : (
                providers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--c-edge)] px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold text-ink">{p.name}</div>
                      <div className="num truncate text-[10.5px] text-muted">{p.model}</div>
                    </div>
                    <Badge
                      tone={
                        p.status === "OPERATIONAL" ? "success" : p.status === "ERROR" ? "danger" : "neutral"
                      }
                    >
                      {p.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))
              )}
            </div>
            <Link href="/providers" className="btn btn-ghost mt-4 w-full !py-2.5 !text-xs">
              <Activity size={13} /> Manage providers
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
