#!/usr/bin/env bash
# Pull latest code, rebuild images, run migrations, restart the stack.
# Usage: ./scripts/deploy.sh   (run from /opt/sevagan on the EC2 host)
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="/etc/sevagan/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — see docs/DEPLOYMENT.md" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Generating nginx.conf from template"
if sudo test -f "/etc/letsencrypt/live/${API_DOMAIN}/fullchain.pem" \
  && sudo test -f "/etc/letsencrypt/live/${ADMIN_DOMAIN}/fullchain.pem" \
  && sudo test -f "/etc/letsencrypt/live/${SITE_DOMAIN}/fullchain.pem"; then
  TEMPLATE="infrastructure/nginx/nginx.prod.conf.template"
else
  echo "    (missing a cert for one of ${API_DOMAIN}/${ADMIN_DOMAIN}/${SITE_DOMAIN} — using HTTP-only bootstrap config; run scripts/init-ssl.sh after this deploy)"
  TEMPLATE="infrastructure/nginx/nginx.bootstrap.conf.template"
fi
envsubst '${API_DOMAIN} ${ADMIN_DOMAIN} ${SITE_DOMAIN}' \
  < "$TEMPLATE" \
  > infrastructure/nginx/nginx.conf.generated

echo "==> Building images"
docker compose -f docker-compose.prod.yml build

echo "==> Starting infrastructure services"
docker compose -f docker-compose.prod.yml up -d postgres redis minio ollama

echo "==> Waiting for postgres"
until docker exec sevagan-postgres pg_isready -U sevagan -d sevagan >/dev/null 2>&1; do
  sleep 2
done

echo "==> Running migrations"
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy

echo "==> Starting application services"
docker compose -f docker-compose.prod.yml up -d api web nginx

echo "==> Reloading nginx config"
# `up -d` only recreates a container when its service definition changes, not
# when a bind-mounted file's contents change — nginx.conf.generated is
# rewritten above on every run, so it needs an explicit reload to take effect.
docker compose -f docker-compose.prod.yml exec nginx nginx -t
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "==> Pruning old images"
docker image prune -f

echo "==> Deploy complete"
docker compose -f docker-compose.prod.yml ps
