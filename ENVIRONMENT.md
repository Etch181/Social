# Environment Variables

Copy `.env.example` → `.env`. Variables are grouped by integration; you only need to fill in the
sections for the services you actually enable.

## Core
| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | yes | `production` on a server |
| `PORT` | yes | Internal port (default `3000`) |
| `APP_URL` | yes | Public URL, no trailing slash. Used for webhooks, OAuth redirects and emails. |
| `DATABASE_URL` | yes | PostgreSQL connection string |

## Security
| Variable | Required | Description |
|---|---|---|
| `AUTH_SECRET` | yes | Signs session JWTs. `openssl rand -base64 48` |
| `JWT_SECRET` | recommended | Extra signing key for future token flows |
| `ENCRYPTION_KEY` | yes | AES-256-GCM key for social tokens & provider API keys |

## AI providers
| Variable | Description |
|---|---|
| `OMNIROUTE_URL` / `OMNIROUTE_API_KEY` / `OMNIROUTE_MODEL` | First-choice provider |
| `ARENA_API_URL` / `ARENA_API_KEY` / `ARENA_MODEL` | Second provider |
| `OPENROUTER_URL` / `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | Third provider |

Base URLs must point to the API root (the gateway appends `/chat/completions`).

## Google Sheets
| Variable | Description |
|---|---|
| `GOOGLE_SHEETS_ID` | Spreadsheet ID from the URL |
| `GOOGLE_SERVICE_ACCOUNT` | The full service-account JSON on one line |
| `GOOGLE_SHEETS_SYNC_INTERVAL_MINUTES` | Background sync cadence |

## Meta (Facebook / Instagram)
| Variable | Description |
|---|---|
| `META_APP_ID` / `META_APP_SECRET` | Meta app credentials |
| `META_REDIRECT_URI` | Must match the redirect configured in the Meta app |
| `META_GRAPH_VERSION` | Graph API version (default `v21.0`) |

## Telegram
| Variable | Description |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |
| `TELEGRAM_WEBHOOK_URL` | Public webhook URL |
| `TELEGRAM_WEBHOOK_SECRET` | Optional secret token validated on incoming updates |

## Optional automation
| Variable | Description |
|---|---|
| `N8N_WEBHOOK_URL` | Optional orchestration webhook |
| `ENABLE_BACKGROUND_JOBS` | Enables the scheduler tick |
| `SCHEDULER_TICK_SECONDS` | Publishing/sync tick interval |

> **Never commit `.env`.** It is ignored by `.gitignore` and excluded from the Docker build context.
