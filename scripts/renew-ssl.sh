#!/usr/bin/env bash
# Renew Let's Encrypt certs and reload nginx if anything changed.
# Cron: 0 3 * * * /opt/sevagan/scripts/renew-ssl.sh >> /var/log/sevagan-renew.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="/etc/sevagan/.env"
set -a
source "$ENV_FILE"
set +a

docker compose -f docker-compose.prod.yml --profile ssl run --rm certbot renew --quiet
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
