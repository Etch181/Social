# Troubleshooting

## The app doesn't start
* **`DATABASE_URL is required`** — copy `.env.example` to `.env` and set the variable.
* **Database connection refused** — with Docker, make sure the `db` service is healthy:
  `docker compose ps` and `docker compose logs db`.
* **Port 3000 already in use** — change the host mapping in `docker-compose.yml`.

## Login problems
* **“Invalid email or password”** — confirm the account exists (`SELECT email FROM users;`).
* **Session expires immediately** — `AUTH_SECRET` changed between requests, which invalidates all JWTs.
* **Forgot the admin password** — reset it from the server:
  ```sql
  UPDATE users SET password_hash = '<bcrypt hash>' WHERE email = 'you@domain.com';
  ```
  (generate the hash with `node -e "console.log(require('bcryptjs').hashSync('new-password',12))"`).

## AI generation fails
* Open **Settings → AI Providers → Test connectivity**.
* `ECONNREFUSED` / timeout → the base URL is wrong or the provider is unreachable from the VPS.
* `401 Unauthorized` → the API key is invalid or lacks credits.
* `No AI provider is configured` → add a provider in the UI or set the `*_API_KEY` environment
  variables and restart.

## Google Sheets sync fails
* `Google OAuth failed (401)` → the service-account JSON is malformed or the private key was truncated.
* `Sheets API 404` → `GOOGLE_SHEETS_ID` is wrong.
* `Sheets API 403` → the spreadsheet was not shared with the service-account `client_email`.

## Telegram bot doesn't answer
* Confirm the token: `curl https://api.telegram.org/bot<TOKEN>/getMe`.
* Confirm the webhook: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`.
* `409 Conflict` → delete the old webhook first (`deleteWebhook`) and re-register from Integrations.
* The domain must be reachable over **HTTPS** — Telegram rejects plain HTTP.

## Facebook / Instagram publishing fails
See `META-FACEBOOK-INTEGRATION.md` and `INSTAGRAM-INTEGRATION.md` error tables. The exact Graph error
message is stored on the content item (`publishResult`) and in the audit log.

## Slow pages / layout issues
* Run `npm run build` locally to surface compilation errors.
* Hard-refresh to invalidate the old CSS bundle (`Ctrl/Cmd + Shift + R`).
* Check the browser console for network errors on `/api/*` calls.

## Getting help
Collect the following before asking for support:
1. `docker compose logs app --tail=200`
2. The output of `curl https://your-domain/api/health`
3. The relevant entries from **Audit Logs** in the UI.
