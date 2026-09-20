"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Loader2,
  Send,
  Clock,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn, useToast } from "@/components/ui";

const AGENTS = [
  { id: "social-media-manager", name: "Social Media Manager", ar: "مدير التواصل الاجتماعي" },
  { id: "marketing-strategist", name: "Marketing Strategist", ar: "استراتيجي التسويق" },
  { id: "copywriter", name: "Copywriter", ar: "كاتب المحتوى" },
  { id: "graphic-design", name: "Graphic Design Agent", ar: "وكيل التصميم" },
  { id: "motion-graphics", name: "Motion Graphics Agent", ar: "وكيل الرسوم المتحركة" },
  { id: "video-editor", name: "Video Editor Agent", ar: "وكيل المونتاج" },
  { id: "community-manager", name: "Community Manager", ar: "مدير المجتمع" },
  { id: "content-repurposing", name: "Content Repurposing Agent", ar: "وكيل إعادة التدوير" },
  { id: "analytics", name: "Analytics Agent", ar: "وكيل التحليلات" },
];

interface ClientOption {
  id: string;
  name: string;
}

interface GenerationResult {
  content: { id: string; title: string; body: string };
  generation: {
    provider: string;
    model: string;
    latencyMs: number;
    tokens: { input: number | null; output: number | null };
    attempts: { provider: string; model: string; ok: boolean; latencyMs: number; error?: string }[];
  };
}

export default function AgentLabPage() {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [agentId, setAgentId] = useState("copywriter");
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.clients)) {
          setClients(d.clients.map((c: ClientOption) => ({ id: c.id, name: c.name })));
          if (d.clients[0]) setClientId(d.clients[0].id);
        }
      })
      .catch(() => undefined);
  }, []);

  const run = async () => {
    if (!prompt.trim()) {
      toast.show("Describe what the agent should produce", "error");
      return;
    }
    if (!clientId) {
      toast.show("Create a client workspace first", "error");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          prompt,
          agentId,
          clientId,
          language,
          title: `${AGENTS.find((a) => a.id === agentId)?.name} output`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Generation failed");
        return;
      }
      setResult(data);
      toast.show("Content generated and saved to the studio");
    } catch {
      setError("Network error while contacting the AI gateway");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-8 bg-[var(--c-accent)]" />
            <span className="micro">AI OPERATIONS · REAL PROVIDER CALLS</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Agent Lab</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Run any agent manually against the AI gateway. Every execution is persisted with provider,
            model, latency, token usage and fallback attempts — and the output is saved as real content.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <Panel>
            <PanelHeader label="EXECUTION" title="Configure the run" />

            <div className="mt-6 space-y-5">
              <div>
                <label className="lbl">Agent</label>
                <select className="input" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  {AGENTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="lbl">Client workspace</label>
                <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  {clients.length === 0 && <option value="">No clients available</option>}
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="mt-2 text-xs text-muted">
                    <Link href="/clients" className="text-[var(--c-accent)] underline">
                      Create a client
                    </Link>{" "}
                    to give the agent brand context.
                  </p>
                )}
              </div>

              <div>
                <label className="lbl">Output language</label>
                <div className="flex gap-2">
                  {(["en", "ar"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                        language === l
                          ? "border-[var(--c-accent)] bg-[var(--c-accent-soft)] text-ink"
                          : "border-[var(--c-edge)] text-muted hover:border-[var(--c-edge-strong)]"
                      }`}
                    >
                      {l === "en" ? "English" : "العربية"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="lbl">Request</label>
                <textarea
                  className="input min-h-[150px]"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    language === "ar"
                      ? "اكتب طلبك هنا… مثال: أنشئ ٣ منشورات إنستغرام لحملة إطلاق منتج جديد."
                      : "Describe the task… e.g. “Write 3 Instagram posts for a product launch campaign, energetic tone.”"
                  }
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    "Write 5 Instagram captions for a product launch",
                    "Create a 7-day social media posting plan",
                    "Turn this blog intro into a Telegram post",
                  ].map((sample) => (
                    <button
                      key={sample}
                      onClick={() => setPrompt(sample)}
                      className="rounded-full border border-[var(--c-edge)] px-3 py-1.5 text-[11px] text-muted transition-colors hover:border-[var(--c-accent)] hover:text-ink"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={run} disabled={loading} className="btn btn-primary w-full disabled:opacity-70">
                {loading ? (
                  <>
                    <Loader2 size={16} className="spin" /> Running through AI gateway…
                  </>
                ) : (
                  <>
                    <Send size={16} /> Run agent
                  </>
                )}
              </button>
            </div>
          </Panel>

          {error && (
            <Panel className="border-[color-mix(in_srgb,var(--c-danger)_38%,transparent)]">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--c-danger)]" />
                <div>
                  <div className="text-sm font-semibold text-ink">Execution failed</div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{error}</p>
                  <Link href="/providers" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--c-accent)]">
                    Review AI providers <ArrowRight size={12} className="rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            </Panel>
          )}
        </div>

        <div className="space-y-6 lg:col-span-7">
          <Panel className="relative min-h-[420px] overflow-hidden">
            <div className="absolute inset-0 aurora opacity-40" />
            <div className="relative">
              <PanelHeader
                label="OUTPUT"
                title={result ? "Generation complete" : "Agent response"}
                action={
                  result && (
                    <Badge tone="success">
                      <CheckCircle2 size={12} /> saved to content studio
                    </Badge>
                  )
                }
              />

              {loading ? (
                <div className="mt-10 space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted">
                    <Loader2 size={16} className="spin text-[var(--c-accent)]" />
                    Routing through providers, generating…
                  </div>
                  <div className="skeleton h-3.5 w-[92%]" />
                  <div className="skeleton h-3.5 w-[86%]" />
                  <div className="skeleton h-3.5 w-[95%]" />
                  <div className="skeleton h-3.5 w-[72%]" />
                  <div className="skeleton h-3.5 w-[88%]" />
                </div>
              ) : result ? (
                <div className="mt-6 space-y-5">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "PROVIDER", value: result.generation.provider, icon: <Cpu size={13} /> },
                      { label: "MODEL", value: result.generation.model, icon: <Sparkles size={13} /> },
                      {
                        label: "LATENCY",
                        value: `${result.generation.latencyMs}ms`,
                        icon: <Clock size={13} />,
                      },
                      {
                        label: "TOKENS",
                        value: `${result.generation.tokens.input ?? "—"} / ${result.generation.tokens.output ?? "—"}`,
                        icon: <Sparkles size={13} />,
                      },
                    ].map((cell) => (
                      <div
                        key={cell.label}
                        className="rounded-xl border border-[var(--c-edge)] bg-[color-mix(in_srgb,var(--c-panel-2)_52%,transparent)] px-4 py-3"
                      >
                        <div className="flex items-center gap-1.5 text-[var(--c-muted)]">
                          {cell.icon}
                          <span className="micro text-[9px]">{cell.label}</span>
                        </div>
                        <div className="num mt-1.5 truncate text-[12px] font-semibold text-ink">
                          {cell.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[var(--c-edge)] bg-[color-mix(in_srgb,var(--c-panel-2)_42%,transparent)] p-5">
                    <div className="micro mb-3">GENERATED CONTENT</div>
                    <div className="max-h-[380px] overflow-y-auto whitespace-pre-wrap text-[13.5px] leading-[1.85] text-ink-soft">
                      {result.content.body}
                    </div>
                  </div>

                  {result.generation.attempts.length > 1 && (
                    <div>
                      <div className="micro mb-2">PROVIDER ATTEMPTS</div>
                      <div className="space-y-1.5">
                        {result.generation.attempts.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg border border-[var(--c-edge)] px-3.5 py-2 text-xs"
                          >
                            <span className="text-ink">
                              {a.provider} · <span className="num text-muted">{a.model}</span>
                            </span>
                            <Badge tone={a.ok ? "success" : "danger"}>
                              {a.ok ? `${a.latencyMs}ms` : (a.error ?? "failed")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Link href={`/content/${result.content.id}`} className="btn btn-primary">
                      Open in content studio <ArrowRight size={14} className="rtl:rotate-180" />
                    </Link>
                    <button onClick={run} className="btn btn-ghost">
                      <RotateCcw size={14} /> Regenerate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-16 flex flex-col items-center text-center">
                  <div className="relative grid h-20 w-20 place-items-center rounded-2xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] text-[var(--c-accent)]">
                    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_20%,var(--c-glow),transparent_70%)] opacity-70" />
                    <Sparkles size={28} className="relative" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-ink">Ready when you are</h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                    Configure an agent on the left and run it. Results show the exact provider, model and
                    latency used — never estimated or fabricated.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {toast.node}
    </div>
  );
}
