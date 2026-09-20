# FOX AI SOCIAL

**AI-Powered Social Media Marketing Operating System**

FOX AI SOCIAL is a multi-tenant SaaS platform for marketing agencies. It manages client workspaces,
AI-generated content, human approvals, scheduling, universal social publishing, analytics, a unified
inbox, Google Sheets synchronisation, structured logging and system health monitoring.

---

## Implemented vs. external credentials vs. future extension

### Implemented and working out of the box
* First-run administrator setup (no default password is shipped).
* Login / logout / password change with bcrypt hashing and HS256 JWT sessions in httpOnly cookies.
* Role-based access control (`ADMIN`, `STAFF`, `CLIENT`) **and server-side tenant isolation** on every query.
* Client workspaces, brand kits, campaigns, content studio, content calendar, approvals workflow.
* AI Agent team (9 agents) executed through a real **AI provider gateway** with priority routing,
  timeouts, retries, automatic fallback and full attempt logging.
* Universal publishing layer (`publish(platform, account, content)`) with a working
  **Telegram Bot API** adapter, **Facebook Graph API** adapter and **Instagram Graph API** adapter.
* Telegram webhook (`/api/telegram/webhook`) with command handling and AI-assisted replies.
* Google Sheets synchronisation through the Sheets REST API with a Google service account
  (JWT/RS256 signed in-process — no heavy SDK).
* System health probes, audit trail, notifications, global search, analytics dashboard, settings,
  user management, backup documentation.
* Full dark / light / system theming and English (LTR) / Arabic (RTL) localisation.

### Requires external credentials (implemented, just add keys)
| Integration | Environment variables | Where to get it |
|---|---|---|
| AI provider | `OMNIROUTE_*`, `ARENA_*`, `OPENROUTER_*` | Your model provider dashboard |
| Google Sheets | `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT` | Google Cloud Console (service account) |
| Facebook | `META_APP_ID`, `META_APP_SECRET`, page access token | Meta for Developers |
| Instagram | `META_APP_ID`, `META_APP_SECRET`, IG business token | Meta for Developers |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_URL` | @BotFather |

### Future extension points (interfaces exist, not implemented)
TikTok, LinkedIn, YouTube, X, WhatsApp and Email adapters · CRM module · ads management ·
billing/subscriptions · AI image & video generation · RAG knowledge base · white-labelling.

---

## Quick start (VPS)

```bash
git clone <your-repo> fox-ai-social && cd fox-ai-social
cp .env.example .env          # then edit the values
docker compose up -d --build
```

Open `https://your-domain` → the first-run setup screen appears → create the administrator.

Without Docker:

```bash
npm ci
cp .env.example .env
npx drizzle-kit push          # create the database tables
npm run build && npm start
```

---

## Documentation

| File | Contents |
|---|---|
| `DEPLOYMENT.md` | VPS, Docker, reverse proxy, HTTPS, domain |
| `ARCHITECTURE.md` | Layers, modules, data model, extension points |
| `ENVIRONMENT.md` | Every environment variable explained |
| `GOOGLE-SHEETS.md` | Service account setup + worksheet structure |
| `META-FACEBOOK-INSTACK.md` → `META-FACEBOOK-INTEGRATION.md` | Meta app setup |
| `INSTAGRAM-INTEGRATION.md` | Instagram Business account setup |
| `TELEGRAM.md` | Bot creation, webhook, commands |
| `AI-PROVIDERS.md` | Gateway, fallback, provider configuration |
| `AI-AGENTS.md` | Agent registry and how to add one |
| `SECURITY.md` | Threat model and controls |
| `TROUBLESHOOTING.md` | Common problems and fixes |
| `BACKUP.md` | Backup and restore procedures |

---

## Tech stack

* **Next.js 16** (App Router, Route Handlers, Server Components)
* **React 19**, **Tailwind CSS v4**, **Framer Motion**, **Recharts**, **Lucide**
* **PostgreSQL 16** + **Drizzle ORM**
* **jose** (JWT signing/verification, Google service-account assertions)
* **bcryptjs** (password hashing), **zod** (input validation), **vitest** (tests)

## Licence

Proprietary — all rights reserved by the agency owner.
