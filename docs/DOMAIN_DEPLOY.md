# Domain Deployment — sevagan.co.in

Moves the production stack off the bare EC2 IP (`https://54.208.201.48`) onto real
domains with Let's Encrypt TLS, and adds a one-page marketing site at the root
domain. Run from `/opt/sevagan` on the EC2 host unless noted otherwise.

Three domains are used:

| Domain | Purpose |
|---|---|
| `sevagan.co.in` | One-page marketing site (`infrastructure/site/index.html`), links to Admin Login |
| `admin.sevagan.co.in` | Admin dashboard (Next.js `web` service) |
| `api.sevagan.co.in` | Backend API + WhatsApp/Razorpay webhooks (`api` service) |

## 1. Buy & configure the domain (Hostinger)

- Buy `sevagan.co.in`.
- In Hostinger DNS, add three **A records** pointing at the EC2 Elastic IP (`54.208.201.48`):
  - `sevagan.co.in` → `54.208.201.48`
  - `api.sevagan.co.in` → `54.208.201.48`
  - `admin.sevagan.co.in` → `54.208.201.48`
- Confirm `54.208.201.48` is an **Elastic IP** in the EC2 console (not the ephemeral
  public IP) so it never changes on instance stop/start.

## 2. Wait for DNS propagation

Query a public resolver (e.g. `8.8.8.8`) rather than your local one — local
resolvers can cache a stale NXDOMAIN or lag behind:

```bash
nslookup sevagan.co.in 8.8.8.8
nslookup api.sevagan.co.in 8.8.8.8
nslookup admin.sevagan.co.in 8.8.8.8
```

All three must return `54.208.201.48` before continuing. If a record was
*edited* (not newly created — e.g. Hostinger's default parked-domain A record
on the apex `sevagan.co.in`), it can take longer to flush than a brand-new
record.

## 3. Build the one-page marketing site

Already committed at `infrastructure/site/index.html` — a static, self-contained
page (no build step) with a "How it works" summary and an **Admin Login** link
pointing to `https://admin.sevagan.co.in/login`. Nginx serves it directly from
that directory for the `SITE_DOMAIN` server block (see step 6), so there's
nothing to build or deploy separately — it ships with the repo checkout.

To change the copy or add branding, edit `infrastructure/site/index.html`
directly and redeploy (step 4/6).

## 4. Set domain env vars on the server

SSH into the box (adjust the key path to wherever your `.pem` lives locally):

```bash
ssh -i "/c/Users/selvakumar.rayappan/downloads/sevagan-prod-key.pem" ubuntu@54.208.201.48
```

Update `/etc/sevagan/.env` — this replaces any stale placeholder values
(e.g. leftover `*.sevagan.in` domains from earlier setup) and adds `SITE_DOMAIN`
if it isn't already present:

```bash
sudo sed -i 's/^API_DOMAIN=.*/API_DOMAIN=api.sevagan.co.in/' /etc/sevagan/.env
sudo sed -i 's/^ADMIN_DOMAIN=.*/ADMIN_DOMAIN=admin.sevagan.co.in/' /etc/sevagan/.env
sudo sed -i 's/^LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=sevagan.virudhunagar@gmail.com/' /etc/sevagan/.env
if grep -q '^SITE_DOMAIN=' /etc/sevagan/.env; then
  sudo sed -i 's/^SITE_DOMAIN=.*/SITE_DOMAIN=sevagan.co.in/' /etc/sevagan/.env
else
  echo 'SITE_DOMAIN=sevagan.co.in' | sudo tee -a /etc/sevagan/.env >/dev/null
fi
grep -E 'SITE_DOMAIN|API_DOMAIN|ADMIN_DOMAIN|LETSENCRYPT_EMAIL' /etc/sevagan/.env
```

Confirm the output shows all four vars with the correct `.co.in` values before
moving on.

## 5. Deploy with the HTTP-only bootstrap config

From `/opt/sevagan` on the EC2 host:

```bash
cd /opt/sevagan
./scripts/deploy.sh
```

No certs exist yet, so it auto-selects `nginx.bootstrap.conf.template` — nginx
serves plain HTTP on all three domains and can answer the ACME challenge.
`deploy.sh` reloads nginx itself after regenerating the config (a bind-mounted
file change doesn't trigger `docker compose up -d` to restart the container on
its own, so this step is required and is now built into the script).

## 6. Issue Let's Encrypt certificates

```bash
./scripts/init-ssl.sh
```

Issues three independent certificates (one per domain — each needs its own
`/etc/letsencrypt/live/<domain>/` lineage, since `nginx.prod.conf.template` has
a separate `server` block with its own cert path per domain).

## 7. Switch nginx to HTTPS

```bash
./scripts/deploy.sh
```

Detects that certs now exist for all three domains and switches to
`nginx.prod.conf.template`, which adds HSTS/security headers, HTTP→HTTPS
redirects, and the `sevagan.co.in` static-site server block.

## 8. Update app config for the new domains

- Rebuild the `web` image with `PUBLIC_API_URL=https://api.sevagan.co.in` — it's
  baked in at Next.js build time (`build.args` in `docker-compose.prod.yml`,
  already wired up; picked up automatically by `scripts/deploy.sh`'s build step).
- Update CORS allowed origins in `backend/src/config/app.config.ts` (or its env
  var) to `https://admin.sevagan.co.in`.

## 9. Update Meta WhatsApp webhook

In Meta's App dashboard, change the webhook Callback URL from the ngrok tunnel
to `https://api.sevagan.co.in/api/v1/whatsapp/webhook` and re-verify.

## 10. Update Razorpay webhook

In the Razorpay dashboard, change the webhook URL to
`https://api.sevagan.co.in/api/v1/webhooks/razorpay`.

## 11. Set up auto-renewal

Cron `scripts/renew-ssl.sh` (renews all three lineages and reloads nginx):

```bash
sudo crontab -e
```

Add:

```
0 3 * * * /opt/sevagan/scripts/renew-ssl.sh >> /var/log/sevagan-renew.log 2>&1
```

## 12. Verify end-to-end

```bash
curl -I https://sevagan.co.in
curl -I https://admin.sevagan.co.in/dashboard
curl -I https://api.sevagan.co.in/api/v1/health
```

- Load `https://sevagan.co.in` in a browser — confirm the marketing page
  renders with a valid cert (no browser warning), and the **Admin Login** link
  goes to `https://admin.sevagan.co.in/login`.
- Load `https://admin.sevagan.co.in/dashboard`, log in.
- Send a WhatsApp test message to confirm the webhook still fires on the new domain.
- Trigger a test invoice to confirm the PDF link (built from `PUBLIC_API_URL`)
  is reachable by Meta's servers.
