# System Architecture — Sevagan

---

## High-Level Architecture

```
Customer (WhatsApp)              Technician (WhatsApp)
        │                                │
        └──────────────┬─────────────────┘
                       │
               Meta WhatsApp Cloud API
                       │
                       ▼
               Nginx (SSL + Rate Limiting)
                  :80 / :443
                       │
              ┌────────┴────────┐
              │                 │
        NestJS API          Next.js Admin
           :3001                :3000
              │
     ┌────────┼────────┐
     │        │        │
  Prisma   Redis    MinIO
     │        │        │
PostgreSQL  Session  Invoices/
           State    Photos
              │
           Ollama (AI)
           :11434
```

---

## Component Descriptions

### Nginx (infrastructure/nginx/)
- Terminates SSL (Let's Encrypt)
- Proxies `/api/*` → NestJS :3001
- Proxies `/` → Next.js :3000
- Rate limits WhatsApp webhook endpoint

### NestJS API (backend/)
- Entry point: `backend/src/main.ts`
- URI versioning: all routes under `/api/v1/`
- Swagger docs: `/api/docs` (dev only)
- Global: ValidationPipe, HttpExceptionFilter, TransformInterceptor
- Rate limiting: 30 req/min default (ThrottlerModule)
- HMAC webhook verification for all WhatsApp events

### Next.js Admin (frontend/)
- App Router (no pages/ directory)
- Server components by default
- Communicates with NestJS via `frontend/src/lib/api.ts`
- Admin-only — no public routes in MVP

### PostgreSQL (Docker)
- Primary data store
- All schema changes via Prisma migrations
- Port: 5433 (host) → 5432 (container)

### Redis (Docker)
- WhatsApp conversation session state (TTL per session)
- Rate limiting state (ThrottlerModule)
- Port: 6380 (host) → 6379 (container)
- `appendonly yes` — survives container restarts

### MinIO (Docker)
- Invoice PDFs, technician photo uploads
- S3-compatible API (can swap to AWS S3 via env var)
- Port: 9000 (API), 9001 (Console)

### Ollama (Docker)
- Local LLM server (qwen3 default)
- Used by AI Dispatcher (Phase 10)
- Port: 11434

---

## Backend Layer Architecture

```
┌─────────────────────────────────────────┐
│              HTTP / Webhook             │  ← Controllers, Guards
├─────────────────────────────────────────┤
│             Business Logic              │  ← Services
├─────────────────────────────────────────┤
│             Data Access                 │  ← Repositories (Prisma)
├─────────────────────────────────────────┤
│             Domain                      │  ← Entities, Enums (no deps)
├─────────────────────────────────────────┤
│             Infrastructure              │  ← DB, Cache, Storage, i18n, Messaging
└─────────────────────────────────────────┘
```

Rules:
- Each layer depends only on layers below it
- Domain layer has zero external dependencies
- Infrastructure modules are `@Global()` — no re-importing needed in feature modules
- Controllers return raw objects — `TransformInterceptor` wraps them

---

## WhatsApp Message Flow

```
1. Meta Cloud API sends POST to /api/v1/webhooks/whatsapp
2. WebhookHmacGuard verifies X-Hub-Signature-256 header
3. WebhookController extracts sender phone and message body
4. Router checks: is phone registered as Customer or Technician?
   ├── Customer → CustomerBotService
   └── Technician → TechnicianBotService
5. Bot service reads conversation state from Redis
6. Bot service executes state machine transition
7. Bot service writes new state to Redis
8. Bot service calls IWhatsAppProvider.sendText/sendInteractive
9. MetaWhatsAppProvider calls Meta Graph API
10. Response sent to sender's WhatsApp
```

---

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| WhatsApp webhook | HMAC-SHA256 signature (WebhookHmacGuard) |
| Admin API | JWT Bearer (passport-jwt) |
| Input validation | ValidationPipe (whitelist + forbidNonWhitelisted) |
| HTTP security | helmet (HSTS, CSP, X-Frame-Options, etc.) |
| Rate limiting | ThrottlerModule (30 req/min default) |
| CORS | Production: `https://admin.sevagan.ai` only |

---

## Deployment Architecture (Phase 13)

```
EC2 Instance (single server for MVP)
├── docker-compose up
│   ├── nginx (ports 80, 443) ← Let's Encrypt SSL
│   ├── api (port 3001, internal only)
│   ├── web (port 3000, internal only)
│   ├── postgres (port 5432, internal only)
│   ├── redis (port 6379, internal only)
│   ├── minio (ports 9000, 9001, internal only)
│   └── ollama (port 11434, internal only)
└── Volumes: postgres_data, redis_data, minio_data, ollama_data
```

Only ports 80 and 443 are exposed to the internet. All other services communicate on the internal `sevagan-network` Docker network.

---

## Data Flow: Job Lifecycle

```
NEW
 │  Customer sends service request
 ▼
NEW → Assignment Engine runs
 │  Finds top-ranked available technician
 ▼
ASSIGNED
 │  Technician receives WhatsApp notification
 │  Technician replies "1" to accept
 ▼
ACCEPTED
 │  Technician sends "START"
 ▼
IN_PROGRESS
 │  Technician sends "COMPLETE 1200 CASH"
 ▼
COMPLETED (pending customer confirmation)
 │  Customer confirms amount
 │  Commission calculated
 │  Invoice generated
 │  Rating requested
 ▼
COMPLETED (final)
```
