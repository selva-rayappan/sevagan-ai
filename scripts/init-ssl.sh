#!/usr/bin/env bash
# One-time Let's Encrypt certificate issuance for API_DOMAIN, ADMIN_DOMAIN and SITE_DOMAIN.
# Run after `scripts/deploy.sh` has nginx serving the HTTP bootstrap config
# (port 80 reachable, DNS A records for all three domains pointing at this host).
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE="/etc/sevagan/.env"
set -a
source "$ENV_FILE"
set +a

docker compose -f docker-compose.prod.yml --profile ssl run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d "$API_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --non-interactive

docker compose -f docker-compose.prod.yml --profile ssl run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d "$ADMIN_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --non-interactive

docker compose -f docker-compose.prod.yml --profile ssl run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d "$SITE_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --non-interactive

echo "Certificates issued. Re-run scripts/deploy.sh to switch nginx to the HTTPS config."
