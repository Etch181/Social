"use client";

import {
  DatabaseBackup,
  HardDriveDownload,
  ShieldCheck,
  FileJson,
  Server,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { Panel, PanelHeader, Badge, FadeIn } from "@/components/ui";

export default function BackupPage() {
  return (
    <div className="space-y-7">
      <FadeIn>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-px w-8 bg-[var(--c-accent)]" />
            <span className="micro">RESILIENCE</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">Backup & Recovery</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            The platform keeps all durable state in PostgreSQL, secrets in the environment, and an
            operational mirror in Google Sheets. Back up each layer separately and you can restore the
            whole agency onto a fresh VPS in minutes.
          </p>
        </div>
      </FadeIn>

      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--c-amber)_34%,transparent)] bg-[color-mix(in_srgb,var(--c-amber)_10%,transparent)] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
          <div className="text-[12.5px] leading-relaxed text-ink-soft">
            <strong className="text-ink">Never commit secrets.</strong> The <code className="num">.env</code>{" "}
            file, service-account JSON, Meta tokens and Telegram tokens must be stored in a secure
            password manager or encrypted vault — never in Git, never in Google Sheets, never in the
            frontend bundle.
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Server,
            title: "PostgreSQL database",
            body: "All users, clients, content, approvals, campaigns, conversations, audit logs and encrypted tokens.",
            command: "pg_dump $DATABASE_URL > fox-db-$(date +%F).sql",
          },
          {
            icon: HardDriveDownload,
            title: "Environment & secrets",
            body: "The .env file (or your secret manager export). Store it encrypted, separate from the database dump.",
            command: "cp .env ~/secure-backup/fox-env-$(date +%F).enc",
          },
          {
            icon: FileJson,
            title: "Google Sheets mirror",
            body: "File → Download → Excel/CSV for each worksheet. This is an operational snapshot, not the primary store.",
            command: "Manual export from Google Sheets UI",
          },
          {
            icon: DatabaseBackup,
            title: "Uploaded assets",
            body: "Any logos, images or media stored on the server filesystem under /public or a mounted volume.",
            command: "tar czf fox-assets-$(date +%F).tgz public/",
          },
          {
            icon: ShieldCheck,
            title: "Configuration",
            body: "docker-compose.yml, Caddy/nginx configuration and any deployment scripts you customised.",
            command: "tar czf fox-config-$(date +%F).tgz *.yml Caddyfile",
          },
          {
            icon: Terminal,
            title: "Restore",
            body: "Start the stack, restore the database dump, copy the .env file back and restart the container.",
            command: "psql $DATABASE_URL < fox-db-YYYY-MM-DD.sql",
          },
        ].map((item) => (
          <Panel key={item.title} hover>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--c-accent-soft)] text-[var(--c-accent)]">
              <item.icon size={17} />
            </div>
            <h3 className="mt-4 text-[13.5px] font-semibold text-ink">{item.title}</h3>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">{item.body}</p>
            <div className="mt-4 rounded-xl border border-[var(--c-edge)] bg-[var(--c-panel-2)] px-3.5 py-2.5">
              <code className="num block text-[10px] leading-relaxed text-[var(--c-cyan)]" dir="ltr">
                {item.command}
              </code>
            </div>
          </Panel>
        ))}
      </div>

      <Panel>
        <PanelHeader label="RECOMMENDED SCHEDULE" title="Backup cadence for an agency deployment" />
        <div className="mt-6 overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Layer</th>
                <th>Frequency</th>
                <th>Retention</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["PostgreSQL", "Daily (02:00)", "30 days", "cron + pg_dump + off-site copy"],
                ["Environment / secrets", "On every change", "Forever (encrypted)", "password manager / vault"],
                ["Google Sheets", "Weekly", "12 versions", "manual CSV export"],
                ["Uploaded assets", "Weekly", "8 weeks", "tar.gz to object storage"],
                ["Full system image", "Monthly", "6 months", "VPS snapshot"],
              ].map(([layer, freq, retention, method]) => (
                <tr key={layer}>
                  <td className="font-medium text-ink">{layer}</td>
                  <td>
                    <Badge tone="info">{freq}</Badge>
                  </td>
                  <td className="text-xs">{retention}</td>
                  <td className="num text-xs text-muted">{method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <PanelHeader label="DISASTER RECOVERY" title="Restoring onto a fresh VPS" />
        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { step: "01", title: "Provision", body: "Install Docker + Docker Compose on the new server." },
            { step: "02", title: "Deploy", body: "Upload the project, copy .env, run docker compose up -d --build." },
            { step: "03", title: "Restore data", body: "Import the pg_dump file and re-mount the assets archive." },
            { step: "04", title: "Verify", body: "Open /health, confirm every probe, then re-register webhooks." },
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
