# Backup & Recovery

## What to back up

| Layer | Command / method | Frequency |
|---|---|---|
| PostgreSQL | `pg_dump $DATABASE_URL > fox-db-$(date +%F).sql` | Daily |
| Environment / secrets | Encrypted copy of `.env` in a password manager | On every change |
| Uploaded assets | `tar czf fox-assets-$(date +%F).tgz public/` | Weekly |
| Google Sheets | File → Download → CSV (operational snapshot) | Weekly |
| Configuration | `tar czf fox-config-$(date +%F).tgz docker-compose.yml Caddyfile` | On change |

## Automated database backup (cron)
```bash
0 2 * * * docker compose exec -T db pg_dump -U postgres fox_ai_social | gzip > /backups/fox-$(date +\%F).sql.gz
```
Copy `/backups` off the server (object storage, another VPS, encrypted archive).

## Restore
```bash
# 1. start the stack
docker compose up -d db
# 2. import the dump
gunzip < fox-2026-01-01.sql.gz | docker compose exec -T db psql -U postgres fox_ai_social
# 3. start the app
docker compose up -d app
```

## Full disaster recovery (new VPS)
1. Install Docker (`curl -fsSL https://get.docker.com | sh`).
2. Upload the project and your `.env`.
3. `docker compose up -d --build`.
4. Import the latest `pg_dump`.
5. Restore `public/` assets if any were uploaded.
6. Open `/health` and confirm every probe.
7. Re-register the Telegram webhook (`POST /api/system {"action":"telegram.webhook"}`).

## Google Sheets as a secondary copy
The Sheets export is intentionally redundant. Even without a database dump you can reconstruct the
client list, content inventory, calendar, leads and audit timeline from the spreadsheet — but it does
**not** contain secrets, so the `.env` backup is still mandatory.
