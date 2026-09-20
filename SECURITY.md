# Security

## Authentication & sessions
* Passwords hashed with **bcrypt (cost factor 12)** — never stored, logged or returned in plaintext.
* Sessions are **HS256 JWTs** stored in an `httpOnly`, `SameSite=Lax`, `Secure` cookie.
* Expiration: 12 hours (30 days with “keep me signed in”).
* Password changes revoke all other sessions (`sessions` table + cookie re-issue).
* Login, failed login, logout and password changes are written to the audit log.

## Authorisation & tenancy
* Roles: `ADMIN`, `STAFF`, `CLIENT`.
* `requireAuth(roles)` guards every route handler.
* `assertClientAccess(user, clientId)` runs **before** any tenant-scoped read or write.
* `CLIENT` users are hard-locked to their own `clientId` inside the data layer, not by hiding UI.

## Secrets
* `ENCRYPTION_KEY` derives an AES-256-GCM key used for social access tokens and provider API keys.
* Ciphertext is versioned (`v1.<iv>.<tag>.<payload>`) so the scheme can be rotated later.
* Secrets are read only on the server (`process.env`), never prefixed with `NEXT_PUBLIC_`.
* `.env` is git-ignored and Docker-build-context-ignored.

## Transport & headers
* Production runs behind Caddy/nginx with TLS, HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` and `Permissions-Policy` (see `Caddyfile`).

## Input validation & output encoding
* Every mutating endpoint validates its payload with **zod** before touching the database.
* React escapes all rendered values by default; no `dangerouslySetInnerHTML` is used.
* SQL is composed exclusively through Drizzle's parameterised query builder.

## Rate limiting
* In-process sliding window per IP / per user:
  * login: 20 requests / minute / IP
  * setup: 10 / minute / IP
  * content creation: 60 / minute / user
  * AI generation: 20 / minute / user
* For multi-instance deployments, replace `rateLimit()` in `src/lib/auth.ts` with a Redis-backed store.

## Logging
* Structured audit records (`audit_logs`) with action, entity, actor, IP and safe details.
* Secrets are never written to logs; tokens are masked before being recorded.

## Google Sheets
* Sheets receive operational metadata only — no passwords, hashes, tokens or keys (enforced in
  `src/lib/sheets/sync.ts`).

## Recommended production checklist
- [ ] Strong unique values for `AUTH_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY`
- [ ] Database not exposed publicly (firewall / private network)
- [ ] HTTPS enforced at the proxy
- [ ] Automated PostgreSQL backups stored off-server
- [ ] OS security updates enabled
- [ ] Fail2ban or equivalent on SSH
