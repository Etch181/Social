# Deployment

## Requirements
* A VPS with **2 GB RAM** or more (4 GB recommended)
* Docker + Docker Compose plugin
* A domain pointed at the server (A record)

## 1. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```

## 2. Upload the project
```bash
scp -r ./fox-ai-social root@your-server:/opt/fox-ai-social
ssh root@your-server
cd /opt/fox-ai-social
```

## 3. Configure environment
```bash
cp .env.example .env
nano .env
```
Minimum required values:
* `AUTH_SECRET`, `JWT_SECRET`, `ENCRYPTION_KEY` — generate with `openssl rand -base64 48`
* `POSTGRES_PASSWORD`
* `APP_URL` — your public domain, e.g. `https://social.foxaiagency.online`

Everything else (AI providers, Google Sheets, Meta, Telegram) can be added later.

## 4. Start
```bash
./deploy.sh
# or manually:
docker compose up -d --build
```

## 5. Open the platform
Visit `https://your-domain`. The first-run setup screen appears only while the database has no
users — create the administrator account there.

## Reverse proxy & HTTPS
`docker-compose.yml` already ships a **Caddy** service (`Caddyfile`) that:
* terminates TLS automatically (Let's Encrypt),
* proxies to the app container,
* sets security headers (HSTS, X-Frame-Options, Referrer-Policy…).

If you prefer **nginx**, remove the `caddy` service and use:

```nginx
server {
  listen 443 ssl;
  server_name social.foxaiagency.online;
  ssl_certificate     /etc/letsencrypt/live/social.foxaiagency.online/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/social.foxaiagency.online/privkey.pem;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
  }
}
```

## Database migrations
The container runs `drizzle-kit push` on start, which syncs `src/db/schema.ts` to PostgreSQL.
For manual control:
```bash
docker compose exec app npx drizzle-kit push
```

## Health checks
* `GET /api/health` — used by Docker, Caddy and monitoring.
* `GET /api/system?scope=health` — detailed dependency probes (auth required).

## Updating
```bash
git pull
docker compose up -d --build
```

## Logs
```bash
docker compose logs -f app
docker compose logs -f db
```
