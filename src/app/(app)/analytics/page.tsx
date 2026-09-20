"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { BarChart3, TrendingUp, Layers, CalendarRange, Sparkles } from "lucide-react";
import { Panel, PanelHeader, Stat, Badge, EmptyState, FadeIn, useToast, Skeleton } from "@/components/ui";

interface AnalyticsPayload {
  rangeDays: number;
  totals: { content: number; published: number; scheduled: number; failed: number };
  byPlatform: { platform: string; total: number }[];
  byDay: { day: string; total: number; published: number }[];
}

const COLORS = ["#7C4DFF", "#2E7BFF", "#22D3EE", "#FFB020", "#2EE6A8", "#FF5C7A"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  // Re-arm the spinner while `days` changes. Adjusting state during render is
  // React's supported way to react to a changed value; doing it in the effect
  // would cause a cascading render.
  const [loadingFor, setLoadingFor] = useState(days);
  if (loadingFor !== days) {
    setLoadingFor(days);
    setLoading(true);
  }
  const toast = useToast();

  useEffect(() => {
    let active = true;
    fetch(`/api/data?type=analytics&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (active && d.ok) setData(d);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [days]);

  const platformData = useMemo(
    () => (data?.byPlatform ?? []).map((p) => ({ name: p.platform, value: p.total })),
    [data],
  );

  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">PERFORMANCE TELEMETRY</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Metrics below are computed from real platform data in PostgreSQL. When a social account
              is connected, its engagement data is merged in through the same adapter layer — nothing
              here is fabricated.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-[var(--c-edge)] p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  days === d ? "bg-[var(--c-accent)] text-white" : "text-muted hover:text-ink"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {loading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel p-6">
              <Skeleton lines={4} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Content produced"
              value={data.totals.content.toLocaleString()}
              hint={`Last ${data.rangeDays} days`}
              icon={<Layers size={18} />}
              tone="accent"
            />
            <Stat
              label="Published"
              value={data.totals.published.toLocaleString()}
              hint="Successfully delivered to channels"
              icon={<TrendingUp size={18} />}
              tone="success"
            />
            <Stat
              label="Scheduled"
              value={data.totals.scheduled.toLocaleString()}
              hint="Queued in the publishing pipeline"
              icon={<CalendarRange size={18} />}
              tone="cyan"
            />
            <Stat
              label="Failed"
              value={data.totals.failed.toLocaleString()}
              hint="Retryable from the content studio"
              icon={<BarChart3 size={18} />}
              tone="danger"
            />
          </div>

          {data.byDay.length === 0 ? (
            <Panel>
              <EmptyState
                icon={<BarChart3 size={26} />}
                title="No analytics data yet"
                body="Analytics appear as soon as content is created and published through the platform."
                actionLabel="Create content"
                onAction={() => {
                  window.location.href = "/agent-lab";
                }}
              />
            </Panel>
          ) : (
            <div className="grid gap-6 lg:grid-cols-12">
              <Panel className="lg:col-span-8">
                <PanelHeader
                  label="CONTENT VOLUME"
                  title="Production & publishing over time"
                  action={<Badge tone="info">daily</Badge>}
                />
                <div className="mt-7 h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.byDay} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C4DFF" stopOpacity={0.55} />
                          <stop offset="100%" stopColor="#7C4DFF" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradPublished" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#22D3EE" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--c-edge)" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: "var(--c-muted)", fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={22}
                      />
                      <YAxis tick={{ fill: "var(--c-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--c-panel-solid)",
                          border: "1px solid var(--c-edge)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--c-ink)",
                        }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#7C4DFF" strokeWidth={2} fill="url(#gradTotal)" />
                      <Area
                        type="monotone"
                        dataKey="published"
                        stroke="#22D3EE"
                        strokeWidth={2}
                        fill="url(#gradPublished)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel className="lg:col-span-4">
                <PanelHeader label="CHANNEL MIX" title="Content by platform" />
                <div className="mt-6 h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={98}
                        paddingAngle={3}
                        stroke="none"
                      >
                        {platformData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "var(--c-muted)" }}
                        iconType="circle"
                        iconSize={8}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--c-panel-solid)",
                          border: "1px solid var(--c-edge)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--c-ink)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel className="lg:col-span-12">
                <PanelHeader label="PLATFORM BREAKDOWN" title="Volume per channel" />
                <div className="mt-7 h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--c-edge)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "var(--c-muted)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fill: "var(--c-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "var(--c-accent-soft)" }}
                        contentStyle={{
                          background: "var(--c-panel-solid)",
                          border: "1px solid var(--c-edge)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "var(--c-ink)",
                        }}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#7C4DFF" maxBarSize={56} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          )}

          <Panel className="relative overflow-hidden">
            <div className="absolute inset-0 aurora opacity-50" />
            <div className="relative flex flex-col items-start gap-5 p-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">AI-generated analysis</h3>
                  <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
                    Connect an AI provider and the Analytics Agent will produce an executive summary,
                    winning themes, underperforming patterns and a prioritised optimisation plan from
                    exactly this data — without inventing metrics.
                  </p>
                </div>
              </div>
              <a href="/agent-lab" className="btn btn-primary">
                Run Analytics Agent
              </a>
            </div>
          </Panel>
        </>
      )}

      {toast.node}
    </div>
  );
}
