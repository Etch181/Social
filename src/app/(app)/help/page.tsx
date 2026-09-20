import {
  BookOpen,
  Rocket,
  KeyRound,
  Table2,
  MessageCircle,
  Share2,
  Cpu,
  ShieldCheck,
  DatabaseBackup,
  LifeBuoy,
  ArrowUpRight,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn } from "@/components/ui";

const DOCS = [
  {
    icon: Rocket,
    title: "Deployment (VPS + Docker)",
    body: "Clone the project, copy .env.example to .env, fill the variables, then run `docker compose up -d --build`. The compose file includes a health check on /api/health and an optional Caddy reverse proxy for automatic HTTPS.",
    tags: ["docker-compose.yml", "Dockerfile", "deploy.sh"],
  },
  {
    icon: KeyRound,
    title: "Environment variables",
    body: "APP_URL, DATABASE_URL, AUTH_SECRET, ENCRYPTION_KEY, GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT, OMNIROUTE_*, ARENA_*, OPENROUTER_*, META_*, TELEGRAM_*. Only the variables for enabled integrations are required.",
    tags: [".env.example", "ENVIRONMENT.md"],
  },
  {
    icon: Table2,
    title: "Google Sheets setup",
    body: "Create a Google Cloud service account, enable the Sheets API, download the JSON key, share the target spreadsheet with the service account email, then put the spreadsheet ID and the whole JSON (single line) into .env.",
    tags: ["GOOGLE-SHEETS.md"],
  },
  {
    icon: Cpu,
    title: "AI providers",
    body: "The gateway speaks the OpenAI-compatible /chat/completions protocol. Configure providers in Settings → AI Providers (encrypted in the database) or via OMNIROUTE_URL / ARENA_API_URL / OPENROUTER_URL environment variables.",
    tags: ["AI-PROVIDERS.md"],
  },
  {
    icon: Share2,
    title: "Meta (Facebook & Instagram)",
    body: "Create a Meta app, add the Facebook Login + Instagram products, request pages_manage_posts, pages_read_engagement, instagram_basic and instagram_content_publish, then store the page/business token in Social Accounts.",
    tags: ["META-FACEBOOK-INTEGRATION.md", "INSTAGRAM-INTEGRATION.md"],
  },
  {
    icon: MessageCircle,
    title: "Telegram bot",
    body: "Create a bot with @BotFather, put the token into TELEGRAM_BOT_TOKEN, then press 'Register webhook' on the Integrations page. Commands /start /help /status /contact /agent are handled out of the box.",
    tags: ["TELEGRAM.md"],
  },
  {
    icon: ShieldCheck,
    title: "Security model",
    body: "bcrypt password hashing, HS256 JWT sessions in httpOnly cookies, AES-256-GCM encryption for stored tokens, per-route rate limiting, role-based authorisation and server-side tenant isolation on every query.",
    tags: ["SECURITY.md"],
  },
  {
    icon: DatabaseBackup,
    title: "Backup & recovery",
    body: "Dump the PostgreSQL database on a schedule, back up the .env file and uploaded assets separately, and use the Google Sheet export as an operational snapshot. Restore instructions are in BACKUP.md.",
    tags: ["BACKUP.md"],
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-8 bg-[var(--c-accent)]" />
            <span className="micro">DOCUMENTATION</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Help & Documentation</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Everything needed to deploy, configure and operate FOX AI SOCIAL on your own infrastructure
            — written for owners, not only for developers.
          </p>
        </div>
      </FadeIn>

      <Panel className="relative overflow-hidden">
        <div className="absolute inset-0 aurora opacity-50" />
        <div className="relative flex flex-col items-start gap-6 p-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
              <LifeBuoy size={20} />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">Quick start checklist</h3>
              <ol className="mt-3 space-y-1.5 text-[12.5px] text-muted">
                <li>1. Configure <code className="num">.env</code> from <code className="num">.env.example</code></li>
                <li>2. Run <code className="num">docker compose up -d --build</code></li>
                <li>3. Open your domain and complete the first-run admin setup</li>
                <li>4. Connect an AI provider in Settings → AI Providers</li>
                <li>5. Create your first client workspace</li>
                <li>6. Connect Google Sheets, Telegram and Meta when ready</li>
              </ol>
            </div>
          </div>
          <a href="/health" className="btn btn-primary">
            Check system health <ArrowUpRight size={15} />
          </a>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        {DOCS.map((doc) => (
          <Panel key={doc.title} hover>
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
                <doc.icon size={19} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-ink">{doc.title}</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{doc.body}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} tone="neutral">
                      <BookOpen size={9} /> {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader label="API SURFACE" title="Core REST endpoints" />
        <div className="mt-6 overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Method</th>
                <th>Endpoint</th>
                <th>Purpose</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["GET", "/api/health", "Liveness probe used by Docker & monitoring", "public"],
                ["GET", "/api/setup", "Whether first-run setup is required", "public"],
                ["POST", "/api/setup", "Create the first administrator", "public (once)"],
                ["POST", "/api/auth", "Login / logout / change password", "public / auth"],
                ["GET", "/api/clients", "List client workspaces (tenant filtered)", "auth"],
                ["POST", "/api/clients", "Create a client workspace", "admin, staff"],
                ["GET", "/api/content", "List content with filters", "auth"],
                ["POST", "/api/content", "Create content", "auth"],
                ["PATCH", "/api/content", "Approve / reject / schedule / publish / generate", "auth"],
                ["GET", "/api/data?type=…", "Generic tenant-guarded read endpoint", "auth"],
                ["POST", "/api/system", "Provider save/test, sheets sync, webhook, publish", "auth"],
                ["GET", "/api/system?scope=health", "Live health checks", "auth"],
                ["POST", "/api/telegram/webhook", "Incoming Telegram updates", "Telegram"],
              ].map(([method, path, purpose, access]) => (
                <tr key={`${method}-${path}`}>
                  <td>
                    <Badge tone={method === "GET" ? "info" : method === "POST" ? "success" : "warning"}>
                      {method}
                    </Badge>
                  </td>
                  <td className="num text-xs text-ink">{path}</td>
                  <td className="text-xs">{purpose}</td>
                  <td className="text-xs text-muted">{access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <PanelHeader label="PROJECT FILES" title="Documentation included in the repository" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            "README.md",
            "DEPLOYMENT.md",
            "ARCHITECTURE.md",
            "ENVIRONMENT.md",
            "GOOGLE-SHEETS.md",
            "META-FACEBOOK-INTEGRATION.md",
            "INSTAGRAM-INTEGRATION.md",
            "TELEGRAM.md",
            "AI-PROVIDERS.md",
            "AI-AGENTS.md",
            "SECURITY.md",
            "TROUBLESHOOTING.md",
            "BACKUP.md",
            ".env.example",
            "docker-compose.yml",
          ].map((file) => (
            <div
              key={file}
              className="flex items-center gap-2.5 rounded-xl border border-[var(--c-edge)] px-4 py-3"
            >
              <BookOpen size={13} className="text-[var(--c-accent)]" />
              <span className="num text-[11.5px] text-ink-soft">{file}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
