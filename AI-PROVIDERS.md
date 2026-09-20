# AI Providers & the Model Gateway

## How routing works
Agents never call a provider directly. They submit `{ messages }` to `gatewayChat()` in
`src/lib/ai/gateway.ts`, which:

1. loads providers configured in **Settings → AI Providers** (API keys encrypted with AES-256-GCM),
2. merges providers defined purely through environment variables,
3. sorts by **priority** (1 is tried first),
4. calls the OpenAI-compatible endpoint `POST {baseUrl}/chat/completions`,
5. enforces a per-provider timeout (`AbortController`),
6. on failure, records the attempt (provider, model, latency, error) and falls through to the next,
7. persists provider status, last success timestamp, last error and latency for the UI.

## Supported providers
Anything that speaks the OpenAI chat-completions protocol:
* **OmniRoute** — `OMNIROUTE_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL`
* **Arena.ai** — `ARENA_API_URL`, `ARENA_API_KEY`, `ARENA_MODEL`
* **OpenRouter** — `OPENROUTER_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
* OpenAI, Azure OpenAI (via a compatible proxy), Groq, Together, DeepSeek, local vLLM/Ollama gateways

> The base URL must **not** include `/chat/completions` — the gateway appends it.

## Configuring through the UI
**Settings → AI Providers → Add provider**

| Field | Meaning |
|---|---|
| Provider key | Unique identifier, e.g. `omniroute` |
| Base URL | API root, e.g. `https://api.omniroute.ai/v1` |
| Model | e.g. `gpt-4o-mini` |
| API key | Stored encrypted, never returned to the browser |
| Timeout | Milliseconds before the attempt is aborted |
| Max retries | Attempts per provider before falling back |
| Priority | Routing order |

Use **Test connectivity** to perform a real 8-token completion and see the measured latency.

## Usage transparency
The platform displays, per execution:
* the provider and model actually used,
* latency in milliseconds,
* input/output token counts when the provider returns `usage`,
* every fallback attempt with its error.

It **never** claims “unlimited AI” — usage is whatever your provider account allows.

## When no provider is configured
Generation requests fail with an explicit, actionable message:

> *No AI provider is configured. Add an API key in Settings → AI Providers, or set
> `OMNIROUTE_API_KEY` / `ARENA_API_KEY` / `OPENROUTER_API_KEY` in `.env`.*

No placeholder or fabricated content is ever displayed instead.
