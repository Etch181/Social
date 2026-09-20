#!/usr/bin/env bash
# FOX AI SOCIAL — one-shot VPS deployment helper.
set -euo pipefail

echo "▶ FOX AI SOCIAL deployment"

if [ ! -f .env ]; then
  echo "✗ .env not found. Copy .env.example to .env and fill in the values first."
  exit 1
fi

echo "▶ Building and starting containers…"
docker compose up -d --build

echo "▶ Waiting for the application health check…"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    echo "✓ Application is healthy."
    exit 0
  fi
  sleep 3
done

echo "✗ Health check did not pass within 90 seconds. Inspect logs with:"
echo "  docker compose logs -f app"
exit 1
