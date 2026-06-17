# Project Context — Sevagan (சேவகன்)

## What It Is
WhatsApp-first home services marketplace for Virudhunagar, Tamil Nadu.
Customers and technicians interact entirely through WhatsApp — no mobile apps.

**MVP scope:** Electrician, Plumber, AC Technician, Carpenter, Painter, Appliance Repair, RO Service, CCTV Installation.

## Business Model
- **Cash jobs:** Flat ₹20 commission per job (configurable)
- **UPI jobs:** 5% percentage commission (configurable)
- Admin dashboard for operations team (web, English-only for MVP)

## Monorepo Layout
```
sevagan-ai/
├── backend/          # NestJS 10 API (port 3001)
├── frontend/         # Next.js 15 admin dashboard (port 3000)
├── infrastructure/
│   └── nginx/        # Reverse proxy + SSL config
├── docs/             # BRD, FRD, architecture, API spec, execution plan
├── .claude/          # Claude knowledge base (this folder)
├── docker-compose.yml
├── package.json      # npm workspaces root
└── .env.example
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10, TypeScript 5.8 |
| ORM | Prisma 6 (PostgreSQL 16) |
| Cache | Redis 7 (ioredis) |
| Storage | MinIO (S3-compatible) |
| Auth | JWT (passport-jwt) |
| Messaging | Meta WhatsApp Cloud API |
| AI | Ollama (qwen3) + OpenAI fallback |
| Frontend | Next.js 15, React 19, TailwindCSS 3 |
| Tables | @tanstack/react-table |
| Infra | Docker Compose, Nginx, Let's Encrypt on EC2 |

## Local Dev Ports

| Service | Host Port | Notes |
|---------|-----------|-------|
| NestJS API | 3001 | `http://localhost:3001/api/v1` |
| Swagger docs | 3001 | `http://localhost:3001/api/docs` (dev only) |
| Next.js web | 3000 | `http://localhost:3000` |
| PostgreSQL | 5433 | Mapped from container :5432 |
| Redis | 6380 | Mapped from container :6379 |
| MinIO API | 9000 | S3-compatible endpoint |
| MinIO Console | 9001 | Web UI |
| Ollama | 11434 | Local LLM server |

## Backend Module Map
```
backend/src/
├── main.ts                         # Bootstrap: helmet, CORS, versioning, Swagger
├── app.module.ts
├── config/                         # Typed config + env validation
├── domain/
│   ├── entities/                   # Customer, Job, ServiceCategory
│   └── enums/                      # Language, JobStatus, PaymentMode, etc.
├── infrastructure/
│   ├── database/                   # PrismaModule + PrismaService
│   ├── cache/                      # RedisModule + RedisService
│   ├── i18n/                       # TranslationModule + TranslationService + locales/
│   ├── messaging/                  # MetaWhatsAppProvider (WhatsAppProvider interface)
│   └── storage/                    # MinioModule + MinioService
├── common/
│   ├── filters/                    # HttpExceptionFilter (global)
│   └── interceptors/               # TransformInterceptor (global response shape)
└── modules/
    ├── health/                     # GET /health
    ├── customers/                  # CustomerRepository
    ├── technicians/                # TechnicianRepository
    ├── jobs/                       # JobsService + JobsRepository
    ├── service-categories/
    ├── assignments/
    └── whatsapp/
        ├── webhook/                # POST /webhooks/whatsapp (HMAC-guarded)
        ├── guards/                 # WebhookHmacGuard
        ├── conversation/           # ConversationStateService (Redis session)
        ├── customer-bot/           # CustomerBotService
        └── technician-bot/         # TechnicianBotService + TechnicianSessionService
```

## Environment Variables
Copy `.env.example` → `.env` before running locally.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (default: localhost:5433) |
| `REDIS_URL` | Redis (default: localhost:6380) |
| `JWT_SECRET` | Generate: `openssl rand -hex 64` |
| `WA_PHONE_NUMBER_ID` | Meta WhatsApp phone number ID |
| `WA_ACCESS_TOKEN` | Meta permanent access token |
| `WA_APP_SECRET` | HMAC webhook signature secret |
| `WA_WEBHOOK_VERIFY_TOKEN` | Webhook verify handshake token |
| `MINIO_*` | MinIO credentials and bucket |
| `OLLAMA_BASE_URL` | Ollama server (default: localhost:11434) |
| `OLLAMA_MODEL` | Model name (default: qwen3) |
| `OPENAI_API_KEY` | Fallback when Ollama unavailable |
| `NEXT_PUBLIC_API_URL` | API base URL for frontend |

## WhatsApp Webhook Flow
```
POST /api/v1/webhooks/whatsapp
  └── WebhookHmacGuard       (verifies X-Hub-Signature-256)
      └── WebhookController
          ├── CustomerBotService    (if sender is a Customer)
          └── TechnicianBotService  (if sender is a Technician)
                └── ConversationStateService (Redis session per phone number)
```

## Database Model Relationships
```
Customer ──< Job >── ServiceCategory
                │
                └── Assignment ──> Technician ──< TechnicianSkill >── ServiceCategory
                ├── Invoice ──> Payment
                ├── JobCommission
                ├── Rating
                └── Dispute

AdminUser          (admin panel auth — separate)
CommissionRule     (FLAT/PERCENTAGE, configurable)
TechnicianSettlement
```

## Phase Progress Summary
| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Architecture & Skeleton | ✅ |
| 1 | Docker + PostgreSQL + Redis + MinIO | ✅ |
| 2 | Prisma Schema + Migrations | ✅ |
| 3 | WhatsApp Integration | ✅ |
| 4 | Customer WhatsApp Bot | ✅ |
| 5 | Technician WhatsApp Workflow | ❌ Next |
| 6–13 | Commission, Dashboard, AI, Deploy… | ❌ |

Full details: `docs/EXECUTION_PLAN.md` Section 18.
