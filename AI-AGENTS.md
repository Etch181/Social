# AI Agents

All agents live in `src/lib/ai/agents.ts` as data — identity, capabilities, system prompt, schemas and
tools — and always execute through the model gateway.

| Agent ID | Name | Responsibilities |
|---|---|---|
| `social-media-manager` | Social Media Manager | Posting plans, cadence, platform adaptation, daily operations |
| `marketing-strategist` | Marketing Strategist | Positioning, audience segmentation, goals, KPI frameworks |
| `copywriter` | Copywriter | Captions, hooks, CTAs, scripts, ad copy, bilingual variations |
| `graphic-design` | Graphic Design Agent | Creative briefs, layouts, image-generation prompts |
| `motion-graphics` | Motion Graphics Agent | Reel concepts, animation scripts, transitions, timing |
| `video-editor` | Video Editor Agent | Scripts, shot lists, edit plans, subtitles, export settings |
| `community-manager` | Community Manager | Reply suggestions, sentiment, complaints, escalation |
| `content-repurposing` | Content Repurposing Agent | One asset → Instagram/Facebook/Telegram/reel/story/email |
| `analytics` | Analytics Agent | Performance analysis, trends, optimisation actions |

## Running an agent
**Agent Lab** (UI) or:

```bash
curl -X PATCH https://your-domain/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "action": "generate",
    "agentId": "copywriter",
    "clientId": "<uuid>",
    "language": "en",
    "prompt": "Write 3 Instagram captions for a product launch"
  }'
```

The response includes the generated content record plus `generation.provider`, `generation.model`,
`generation.latencyMs`, `generation.tokens` and `generation.attempts`.

Every execution is persisted in the `agent_runs` table (agent, provider, model, duration, tokens,
status, error) and visible in the dashboard.

## Adding a new agent
1. Add one object to `AGENTS` in `src/lib/ai/agents.ts`.
2. Nothing else is required — the Agent Lab, the API and the dashboard read the registry dynamically.

## Guardrails
* Agents receive the client's brand kit (tone, audience, prohibited phrases) as context when available.
* Arabic requests instruct the model to answer entirely in modern standard Arabic — languages are never
  mixed inside one sentence.
* Agents are instructed never to invent performance metrics or market statistics.
