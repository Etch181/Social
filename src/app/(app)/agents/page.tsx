import Link from "next/link";
import {
  Bot,
  ArrowRight,
  Megaphone,
  Target,
  PenTool,
  Palette,
  Clapperboard,
  Film,
  MessagesSquare,
  Recycle,
  BarChart3,
} from "lucide-react";
import { AGENTS } from "@/lib/ai/agents";
import { Panel, PanelHeader, Badge, FadeIn } from "@/components/ui";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  megaphone: Megaphone,
  target: Target,
  pen: PenTool,
  palette: Palette,
  clapperboard: Clapperboard,
  film: Film,
  messages: MessagesSquare,
  recycle: Recycle,
  chart: BarChart3,
};

export default function AgentsPage() {
  return (
    <div className="space-y-7">
      <FadeIn>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-px w-8 bg-[var(--c-accent)]" />
              <span className="micro">MODULAR AGENT ARCHITECTURE</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">AI Agent Team</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Each agent is defined as data — bilingual identity, capabilities, system prompt, input and
              output schemas and allowed tools — and always executes through the provider gateway, so
              models can be swapped without touching agent logic.
            </p>
          </div>
          <Link href="/agent-lab" className="btn btn-primary">
            Open Agent Lab <ArrowRight size={15} className="rtl:rotate-180" />
          </Link>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((agent, index) => {
          const Icon = ICONS[agent.icon] ?? Bot;
          return (
            <FadeIn key={agent.id} delay={index * 0.04}>
              <Panel hover className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                    <Icon size={19} />
                  </div>
                  <Badge tone="success">enabled</Badge>
                </div>

                <h3 className="mt-5 text-[15px] font-semibold text-ink">{agent.name}</h3>
                <div className="mt-1 text-[12px] text-[var(--c-accent)]">{agent.nameAr}</div>

                <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted">{agent.description}</p>

                <div className="mt-5">
                  <div className="micro text-[9px]">CAPABILITIES</div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {agent.capabilities.map((cap) => (
                      <Badge key={cap} tone="neutral">
                        {cap.replace(/-/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="hairline my-5" />

                <div className="space-y-2 text-[10.5px] text-muted">
                  <div className="flex items-center justify-between gap-3">
                    <span>Input schema</span>
                    <span className="num">{agent.inputSchema.length} fields</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Output schema</span>
                    <span className="num">{agent.outputSchema.length} fields</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Allowed tools</span>
                    <span className="num truncate">{agent.tools.join(", ")}</span>
                  </div>
                </div>
              </Panel>
            </FadeIn>
          );
        })}
      </div>

      <Panel>
        <PanelHeader label="ARCHITECTURE" title="Adding a new agent" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: "01",
              title: "Define the agent",
              body: "Add one entry to src/lib/ai/agents.ts with its identity, capabilities and system prompt.",
            },
            {
              step: "02",
              title: "Route through the gateway",
              body: "Call runAgent() — provider selection, timeouts, retries and fallback are handled centrally.",
            },
            {
              step: "03",
              title: "Persist the run",
              body: "Every execution is stored in agent_runs with provider, model, latency, tokens and errors.",
            },
            {
              step: "04",
              title: "Expose it in the UI",
              body: "The Agent Lab picks up new agents automatically from the registry — no extra UI work.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-2xl border border-[var(--c-edge)] p-5">
              <div className="num text-[22px] font-semibold text-[var(--c-accent)]">{item.step}</div>
              <div className="mt-3 text-[13px] font-semibold text-ink">{item.title}</div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
