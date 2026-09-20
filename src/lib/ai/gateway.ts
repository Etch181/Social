import { db } from "@/db";
import { aiProviders } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// AI GATEWAY
// Provider-agnostic chat completion with automatic fallback.
// Agents never call a provider directly — they always go through this gateway
// so models/providers can be swapped without touching agent code.
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GatewayRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Restrict routing to specific provider keys (optional). */
  onlyProviders?: string[];
}

export interface ProviderAttempt {
  provider: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
}

export interface GatewayResult {
  ok: boolean;
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  attempts: ProviderAttempt[];
  error?: string;
}

export interface ProviderRuntime {
  id: string;
  key: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  priority: number;
  enabled: boolean;
}

function trimUrl(u: string) {
  return (u || "").trim().replace(/\/+$/, "");
}

/** Providers configured in the database (managed from Settings → AI Providers). */
export async function loadProviders(): Promise<ProviderRuntime[]> {
  const rows = await db.select().from(aiProviders).orderBy(asc(aiProviders.priority));
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    baseUrl: trimUrl(r.baseUrl),
    apiKey: decryptSecret(r.apiKeyEncrypted),
    model: r.model,
    timeoutMs: r.timeoutMs ?? 60000,
    maxRetries: r.maxRetries ?? 1,
    priority: r.priority ?? 10,
    enabled: r.enabled,
  }));
}

/** Providers defined purely through environment variables (VPS bootstrap). */
export function envProviders(): ProviderRuntime[] {
  const list: ProviderRuntime[] = [];
  if (process.env.OMNIROUTE_URL && process.env.OMNIROUTE_API_KEY) {
    list.push({
      id: "env-omniroute",
      key: "omniroute",
      name: "OmniRoute",
      baseUrl: trimUrl(process.env.OMNIROUTE_URL),
      apiKey: process.env.OMNIROUTE_API_KEY,
      model: process.env.OMNIROUTE_MODEL || "gpt-4o-mini",
      timeoutMs: Number(process.env.OMNIROUTE_TIMEOUT_MS || 60000),
      maxRetries: 1,
      priority: 1,
      enabled: true,
    });
  }
  if (process.env.ARENA_API_URL && process.env.ARENA_API_KEY) {
    list.push({
      id: "env-arena",
      key: "arena",
      name: "Arena.ai",
      baseUrl: trimUrl(process.env.ARENA_API_URL),
      apiKey: process.env.ARENA_API_KEY,
      model: process.env.ARENA_MODEL || "gpt-4o-mini",
      timeoutMs: Number(process.env.ARENA_TIMEOUT_MS || 60000),
      maxRetries: 1,
      priority: 2,
      enabled: true,
    });
  }
  if (process.env.OPENROUTER_URL && process.env.OPENROUTER_API_KEY) {
    list.push({
      id: "env-openrouter",
      key: "openrouter",
      name: "OpenRouter",
      baseUrl: trimUrl(process.env.OPENROUTER_URL),
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || 60000),
      maxRetries: 1,
      priority: 3,
      enabled: true,
    });
  }
  return list;
}

async function callOpenAICompatible(
  p: ProviderRuntime,
  req: GatewayRequest,
): Promise<{ content: string; latencyMs: number; inputTokens?: number; outputTokens?: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), p.timeoutMs);
  try {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model || p.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1200,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} — ${text.slice(0, 240) || res.statusText}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Provider returned an empty completion");

    return {
      content,
      latencyMs: Date.now() - started,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Route through every configured provider until one succeeds. */
export async function gatewayChat(req: GatewayRequest): Promise<GatewayResult> {
  const dbProviders = await loadProviders().catch(() => [] as ProviderRuntime[]);
  const configured = dbProviders.filter((p) => p.enabled && p.apiKey);
  const fallback = envProviders();
  const merged = [...configured, ...fallback].filter(
    (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
  );

  const ordered = merged
    .filter((p) => !req.onlyProviders?.length || req.onlyProviders.includes(p.key))
    .sort((a, b) => a.priority - b.priority);

  if (!ordered.length) {
    return {
      ok: false,
      content: "",
      provider: "none",
      model: "none",
      latencyMs: 0,
      attempts: [],
      error:
        "No AI provider is configured. Add an API key in Settings → AI Providers, or set OMNIROUTE_API_KEY / ARENA_API_KEY / OPENROUTER_API_KEY in .env.",
    };
  }

  const attempts: ProviderAttempt[] = [];

  for (const provider of ordered) {
    for (let tryIndex = 0; tryIndex <= provider.maxRetries; tryIndex++) {
      const started = Date.now();
      try {
        const result = await callOpenAICompatible(provider, req);
        attempts.push({
          provider: provider.name,
          model: req.model || provider.model,
          ok: true,
          latencyMs: result.latencyMs,
        });

        await db
          .update(aiProviders)
          .set({
            status: "OPERATIONAL",
            lastSuccessAt: new Date(),
            lastError: null,
            lastLatencyMs: result.latencyMs,
          })
          .where(eq(aiProviders.id, provider.id))
          .catch(() => undefined);

        return {
          ok: true,
          content: result.content,
          provider: provider.name,
          model: req.model || provider.model,
          latencyMs: result.latencyMs,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          attempts,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push({
          provider: provider.name,
          model: req.model || provider.model,
          ok: false,
          latencyMs: Date.now() - started,
          error: message,
        });

        await db
          .update(aiProviders)
          .set({ status: "ERROR", lastError: message.slice(0, 500) })
          .where(eq(aiProviders.id, provider.id))
          .catch(() => undefined);

        if (message.includes("aborted")) break; // timeout — don't retry same provider
      }
    }
  }

  return {
    ok: false,
    content: "",
    provider: attempts[attempts.length - 1]?.provider ?? "none",
    model: "none",
    latencyMs: 0,
    attempts,
    error: `All AI providers failed. Last error: ${attempts[attempts.length - 1]?.error ?? "unknown"}`,
  };
}

/** Live status snapshot used by System Health + AI Providers pages. */
export async function providerHealth() {
  const rows = await db.select().from(aiProviders).orderBy(asc(aiProviders.priority));
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    model: r.model,
    enabled: r.enabled,
    configured: Boolean(r.apiKeyEncrypted),
    status: r.apiKeyEncrypted ? r.status : "NOT_CONFIGURED",
    lastSuccessAt: r.lastSuccessAt,
    lastError: r.lastError,
    lastLatencyMs: r.lastLatencyMs,
    baseUrl: r.baseUrl,
  }));
}
