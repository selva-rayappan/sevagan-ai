# Deployment Guide — Sevagan

**Target:** AWS EC2 (Ubuntu 22.04), Docker Compose (`docker-compose.prod.yml`)
**Domain:** sevagan.in (or your domain — `api.<domain>` + `admin.<domain>`)

---

## 1. EC2 Setup

1. Launch **Ubuntu 22.04 LTS**, `t3.medium` minimum (2 vCPU / 4 GB — Ollama needs headroom).
2. Security Group: inbound `22` (your IP only), `80`, `443`; deny all other inbound.
3. Allocate and associate an **Elastic IP**.
4. Point DNS A records for `api.<domain>` and `admin.<domain>` at the Elastic IP.
5. Attach an IAM role with no permissions (nothing on this host calls AWS APIs directly) — avoids static credentials on the box.
6. Install Docker and prerequisites:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER
   sudo apt-get install -y docker-compose-plugin git gettext-base   # gettext-base -> envsubst
   ```
7. `git clone` the repo to `/opt/sevagan` and `cd` into it.

---

## 2. Environment Secrets

Create `/etc/sevagan/.env` (`chmod 600`):

```bash
POSTGRES_PASSWORD=<strong random>
REDIS_PASSWORD=<strong random>
MINIO_ROOT_USER=<strong random>
MINIO_ROOT_PASSWORD=<strong random>
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)   # must differ from JWT_SECRET
WA_PHONE_NUMBER_ID=<production phone number id>
WA_ACCESS_TOKEN=<permanent access token>
WA_APP_SECRET=<app secret>
WA_WEBHOOK_VERIFY_TOKEN=<custom verify token>
OPENAI_API_KEY=<openai key>
RAZORPAY_LINK_URL=<razorpay payment link base>
API_DOMAIN=api.sevagan.in
ADMIN_DOMAIN=admin.sevagan.in
LETSENCRYPT_EMAIL=selvakumar.rayappan@gmail.com
IMAGE_TAG=latest
```

`docker-compose.prod.yml` loads this via `env_file` for the `api` container; `scripts/*.sh` `source` it directly for the shell-level values (domains, image tag, cert email).

---

## 3. First Deploy (HTTP bootstrap → HTTPS)

```bash
sudo mkdir -p /etc/sevagan && sudo chown $USER:$USER /etc/sevagan && chmod 700 /etc/sevagan
# create /etc/sevagan/.env as above (owned by your deploy user, not root —
# scripts/deploy.sh runs as that user, not via sudo, so it needs read access)

./scripts/deploy.sh        # no cert yet -> nginx runs the HTTP-only bootstrap config
./scripts/init-ssl.sh      # issues Let's Encrypt certs via the one-off certbot service
./scripts/deploy.sh        # re-run -> detects certs -> switches nginx to the full TLS config
```

`scripts/deploy.sh` is the whole release process: pulls latest code, regenerates `infrastructure/nginx/nginx.conf.generated` from whichever template applies (bootstrap vs. full TLS, auto-detected by cert presence), rebuilds images, runs `prisma migrate deploy`, restarts the stack, prunes old images.

Seed data (categories, commission rules, default admin) is **not** run automatically. The production `api` image has `devDependencies` (including `ts-node`, which the seed script needs) pruned out, so seed via the `builder`-stage `seed` service instead:
```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```
Run this once, on first deploy only — it's not idempotent-safe to re-run against a populated database. Default admin login afterwards: `admin@sevagan.ai` / `Admin@123!` — **change this password immediately** via the database or a future admin-management endpoint.

---

## 4. SSL Renewal

Certs are valid 90 days; `certbot renew` no-ops unless within 30 days of expiry, so daily is safe:

```bash
sudo crontab -e
# add:
0 3 * * * /opt/sevagan/scripts/renew-ssl.sh >> /var/log/sevagan-renew.log 2>&1
```

---

## 5. Meta WhatsApp Webhook Configuration

1. Meta Developer Console → Your App → WhatsApp → Configuration.
2. Webhook URL: `https://api.sevagan.in/api/v1/webhooks/whatsapp`.
3. Verify Token: must match `WA_WEBHOOK_VERIFY_TOKEN` in `/etc/sevagan/.env`.
4. Subscribe to field: `messages`.
5. Confirm verification succeeds (Meta sends a GET with `hub.challenge`), then send a test WhatsApp message and check `docker compose -f docker-compose.prod.yml logs -f api`.

---

## 6. Backups

```bash
sudo crontab -e
# add:
0 2 * * * /opt/sevagan/scripts/backup-db.sh >> /var/log/sevagan-backup.log 2>&1
```

`scripts/backup-db.sh` dumps `pg_dump | gzip`, uploads to the `sevagan-backups` MinIO bucket (create it once: `docker compose -f docker-compose.prod.yml exec minio mc mb /data/sevagan-backups` or via the MinIO console), and prunes local copies older than 30 days.

**Restore test** (run once after the first backup, then periodically):

```bash
docker exec sevagan-postgres createdb -U sevagan sevagan_restore_test
gunzip -c /var/backups/sevagan/sevagan_<timestamp>.sql.gz | \
  docker exec -i sevagan-postgres psql -U sevagan -d sevagan_restore_test
docker exec sevagan-postgres psql -U sevagan -d sevagan_restore_test -c 'SELECT count(*) FROM "Job";'
# compare against the live database, then:
docker exec sevagan-postgres dropdb -U sevagan sevagan_restore_test
```

---

## 7. Redeploying After Code Changes

```bash
cd /opt/sevagan
./scripts/deploy.sh
```

## 8. Rollback

```bash
git checkout <previous-commit-or-tag>
./scripts/deploy.sh
# if a migration needs rollback, resolve it manually first:
docker compose -f docker-compose.prod.yml exec api npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 9. Monitoring

- Add `https://api.sevagan.in/api/v1/health` to UptimeRobot (free tier), 5-minute interval, alert to `selvakumar.rayappan@gmail.com`.
- `docker compose -f docker-compose.prod.yml ps` — the `api` service has a built-in Docker healthcheck.
- Logs: `docker compose -f docker-compose.prod.yml logs -f <service>`. All services use the `json-file` driver capped at 10 MB × 3 files.

---

## 10. Ollama Model Pull (First Run)

```bash
docker exec -it sevagan-ollama ollama pull qwen3
docker exec sevagan-ollama ollama list
```

Model data persists in the `ollama_data` volume.
