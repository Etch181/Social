# Architecture

## Layered overview

```
┌──────────────────────────────────────────────────────────────┐
│  UI (Next.js App Router, React 19, Tailwind v4, Framer)     │
│  server components + client components + i18n/RTL + theming  │
├──────────────────────────────────────────────────────────────┤
│  Route handlers (/api/*) — validation, authz, rate limiting  │
├──────────────────────────────────────────────────────────────┤
│  Domain services                                             │
│   lib/auth        sessions, RBAC, tenant guards              │
│   lib/ai/gateway  provider routing + fallback                │
│   lib/ai/agents   agent registry + execution                 │
│   lib/publishing  universal adapter layer                    │
│   lib/sheets      Google Sheets client + sync engine         │
│   lib/audit       audit trail, notifications, sync runs      │
│   lib/crypto      AES-256-GCM secret encryption              │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL (Drizzle ORM)                                    │
└──────────────────────────────────────────────────────────────┘
```

## Multi-tenancy
Every tenant-scoped table carries a `clientId`. Route handlers resolve the current user, then apply
`assertClientAccess()` **before** touching data. `CLIENT` role users are hard-locked to their own
workspace inside `getCurrentUser()` / `visibleClientIds()`. Access tokens are encrypted and stripped
from every API response (`socialAccounts` responses expose `hasToken`, never the token).

## AI gateway
Agents build `{ messages }` and call `gatewayChat()`. The gateway:
1. loads DB-configured providers (encrypted keys) and merges env-configured providers,
2. sorts by priority,
3. calls the OpenAI-compatible `/chat/completions` endpoint with a per-provider timeout,
4. on failure records the attempt and falls through to the next provider,
5. persists provider status, latency and last error for the UI.

## Publishing
`lib/publishing/index.ts` exposes `publishContentItem(id)`:
* refuses to publish anything whose `approvalStatus !== "APPROVED"`,
* resolves the client's connected account for the platform,
* delegates to the platform adapter,
* writes the result (success or failure) back to the content row and the audit log.

The scheduler (`runDuePublishJobs()`) uses the exact same function.

## Google Sheets
`lib/sheets/google.ts` implements the Sheets REST API with an RS256 service-account assertion signed
by `jose` (no heavy SDK). `lib/sheets/sync.ts` writes idempotent whole-tab exports and creates a
dedicated worksheet per client with sanitised, collision-free names.

## Extension points
| Goal | Where to extend |
|---|---|
| New social channel | Add an adapter in `lib/publishing/`, register in `adapters` + `PLATFORM_CATALOG` |
| New AI provider | Nothing — any OpenAI-compatible endpoint works via Settings or env |
| New AI agent | Add one entry to `AGENTS` in `lib/ai/agents.ts` |
| New notification channel | Add a delivery adapter next to `notify()` in `lib/audit.ts` |
| New data mirrored to Sheets | Add one `writeTab()` call in `runSheetsSync()` |
| New API resource | Add a route handler, reuse `requireAuth()` + `assertClientAccess()` |

## Data model
`agencies`, `users`, `sessions`, `clients`, `brandKits`, `socialAccounts`, `campaigns`,
`contentItems`, `approvals`, `aiProviders`, `agentRuns`, `conversations`, `messages`, `leads`,
`notifications`, `auditLogs`, `syncRuns`, `systemSettings`.
