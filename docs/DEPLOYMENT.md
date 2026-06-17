# Deployment Guide — Sevagan

**Target:** AWS EC2 (Ubuntu 22.04), Docker Compose  
**Domain:** sevagan.ai (or sub-domains)

---

## Prerequisites

- EC2 instance (t3.medium minimum — Ollama needs ≥4 GB RAM)
- Docker + Docker Compose installed
- Domain pointed to EC2 IP
- Meta WhatsApp Business Account (Production tier)

---

## 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

---

## 2. Deploy Application

```bash
# Clone repo
git clone https://github.com/your-org/sevagan-ai.git
cd sevagan-ai

# Configure environment
cp .env.example .env
nano .env   # Fill in production values (see section 4)

# Start all services
docker compose up -d

# Run database migrations
docker compose exec api npx prisma migrate deploy

# Seed initial data
docker compose exec api npm run prisma:seed

# Verify health
curl http://localhost:3001/api/v1/health
```

---

## 3. Nginx + SSL (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot -y

# Obtain certificate (stop nginx first)
docker compose stop nginx
sudo certbot certonly --standalone -d admin.sevagan.ai -d api.sevagan.ai

# Certificates at: /etc/letsencrypt/live/admin.sevagan.ai/

# Update nginx volume in docker-compose.yml:
# - /etc/letsencrypt:/etc/letsencrypt:ro

# Start nginx
docker compose up -d nginx

# Auto-renew (cron)
echo "0 12 * * * root certbot renew --quiet --deploy-hook 'docker compose -f /path/to/sevagan-ai/docker-compose.yml restart nginx'" | sudo tee /etc/cron.d/certbot-renew
```

---

## 4. Environment Variables (Production)

```bash
NODE_ENV=production
API_PORT=3001

# Database — use strong passwords
DATABASE_URL=postgresql://sevagan:STRONG_PASS@postgres:5432/sevagan

# Redis
REDIS_URL=redis://redis:6379

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=<generated-secret>
JWT_EXPIRES_IN=7d

# WhatsApp (Meta Production credentials)
WA_PHONE_NUMBER_ID=<production-phone-number-id>
WA_ACCESS_TOKEN=<permanent-access-token>
WA_APP_SECRET=<app-secret>
WA_WEBHOOK_VERIFY_TOKEN=<custom-verify-token>

# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=sevagan
MINIO_SECRET_KEY=<strong-minio-password>
MINIO_BUCKET_NAME=sevagan-uploads

# AI
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen3
OPENAI_API_KEY=<openai-key>

# Admin Dashboard
NEXT_PUBLIC_API_URL=https://api.sevagan.ai
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://admin.sevagan.ai
```

---

## 5. Meta WhatsApp Webhook Configuration

1. Go to Meta Developer Console → Your App → WhatsApp → Configuration
2. Set Webhook URL: `https://api.sevagan.ai/api/v1/webhooks/whatsapp`
3. Set Verify Token: value of `WA_WEBHOOK_VERIFY_TOKEN` in `.env`
4. Subscribe to: `messages`
5. Verify the webhook (Meta sends GET with `hub.challenge`)

---

## 6. Backups

### PostgreSQL
```bash
# Daily backup cron
echo "0 2 * * * docker exec sevagan-postgres pg_dump -U sevagan sevagan | gzip > /backups/sevagan-\$(date +\%Y\%m\%d).sql.gz" | sudo tee /etc/cron.d/pg-backup

# Restore
gunzip < backup.sql.gz | docker exec -i sevagan-postgres psql -U sevagan sevagan
```

### MinIO
```bash
# Sync MinIO data to S3 (optional)
mc mirror minio/sevagan-uploads s3/sevagan-uploads-backup
```

---

## 7. Updates / Redeployment

```bash
cd sevagan-ai

# Pull latest code
git pull origin master

# Rebuild images
docker compose build api web

# Apply migrations (zero-downtime)
docker compose exec api npx prisma migrate deploy

# Restart services (rolling)
docker compose up -d --no-deps api
docker compose up -d --no-deps web
```

---

## 8. Monitoring

**Uptime Robot** (free tier):
- Monitor: `https://api.sevagan.ai/api/v1/health`
- Alert: SMS/email on downtime

**Docker logs:**
```bash
docker compose logs -f api        # API logs
docker compose logs -f web        # Frontend logs
docker compose logs -f postgres   # DB logs
```

---

## 9. Rollback

```bash
# Roll back to previous image tag
docker compose down
git checkout <previous-commit-or-tag>
docker compose up -d

# If migration needs rollback, apply manually:
docker compose exec api npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 10. Ollama Model Pull (First Run)

```bash
# After `docker compose up -d`:
docker exec -it sevagan-ollama ollama pull qwen3

# Verify model loaded
docker exec sevagan-ollama ollama list
```

Ollama model data is persisted in `ollama_data` Docker volume.
