# Sevagan — Claude Setup Reference

WhatsApp-first home services marketplace for Virudhunagar, Tamil Nadu.
MVP target: 6–8 weeks. All customer and technician interactions happen via WhatsApp.

---

## Monorepo Layout

```
sevagan-ai/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # Next.js 15 admin dashboard (port 3000)
├── nginx/            # Reverse proxy config
├── docker-compose.yml
├── package.json      # Root — npm workspaces
├── CLAUDE.md         # Project rules (mandatory reading)
├── SEVAGAN_DEV_INSTRUCTIONS.MD  # Master spec + Section 18 phase tracker
└── TASK_PROGRESS.MD  # Task-level progress (mirrors Section 18)
```

---

## Tech Stack

### Backend — `apps/api`

| Layer | Tech |
|-------|------|
| Framework | NestJS 10 |
| Language | TypeScript 5.8 |
| ORM | Prisma 6 (PostgreSQL 16) |
| Cache | Redis 7 via ioredis |
| Storage | MinIO (S3-compatible) |
| Auth | JWT (passport-jwt, @nestjs/jwt) |
| Messaging | Meta WhatsApp Cloud API |
| AI | Ollama (local, qwen3) + OpenAI fallback |
| Validation | class-validator + class-transformer |
| API docs | Swagger (@nestjs/swagger) — dev only |
| Rate limiting | @nestjs/throttler (30 req/min default) |

### Frontend — `apps/web`

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5.8 |
| UI | React 19, TailwindCSS 3, lucide-react |
| Data tables | @tanstack/react-table |
| HTTP client | axios |
| Utilities | clsx, tailwind-merge, class-variance-authority |

---

## Local Dev Ports

| Service | Host Port | Notes |
|---------|-----------|-------|
| NestJS API | 3001 | `http://localhost:3001/api/v1` |
| Next.js web | 3000 | `http://localhost:3000` |
| Swagger docs | 3001 | `http://localhost:3001/api/docs` |
| PostgreSQL | 5433 | Mapped from container :5432 |
| Redis | 6380 | Mapped from container :6379 |
| MinIO API | 9000 | S3-compatible endpoint |
| MinIO Console | 9001 | Web UI |
| Ollama | 11434 | Local LLM server |

---

## Common Commands

```bash
# Start all infra (PostgreSQL, Redis, MinIO, Ollama)
npm run docker:up

# Dev servers
npm run dev:api    # NestJS watch mode
npm run dev:web    # Next.js with Turbopack

# Tests
npm run test:api        # Jest unit tests
npm run test:api:cov    # With coverage (80% threshold enforced)

# Prisma
npm run prisma:generate   # Regenerate Prisma client
npm run prisma:migrate    # Run pending migrations (dev)
npm run prisma:seed       # Seed initial data

# Lint
npm run lint        # All workspaces

# Docker
npm run docker:down    # Stop containers
npm run docker:logs    # Follow logs
```

---

## Environment Variables

Copy `.env.example` → `.env` in the repo root before running locally.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (default: localhost:5433) |
| `REDIS_URL` | Redis connection (default: localhost:6380) |
| `JWT_SECRET` | Generate with `openssl rand -hex 64` |
| `WA_PHONE_NUMBER_ID` | Meta WhatsApp phone number ID |
| `WA_ACCESS_TOKEN` | Meta permanent access token |
| `WA_APP_SECRET` | HMAC webhook signature secret |
| `WA_WEBHOOK_VERIFY_TOKEN` | Webhook verify handshake token |
| `MINIO_*` | MinIO credentials and bucket |
| `OLLAMA_BASE_URL` | Ollama server URL |
| `OLLAMA_MODEL` | Model name (default: qwen3) |
| `OPENAI_API_KEY` | Fallback when Ollama is unavailable |
| `NEXT_PUBLIC_API_URL` | API base URL for the web frontend |

---

## API Module Structure

```
apps/api/src/
├── main.ts                     # Bootstrap: helmet, CORS, versioning, Swagger
├── app.module.ts               # Root module — imports all below
├── config/
│   ├── app.config.ts           # Typed config factory
│   └── env.validation.ts       # Startup env validation (class-validator)
├── domain/
│   ├── entities/               # Plain domain entity types (Customer, Job, etc.)
│   └── enums/                  # Language, JobStatus, PaymentMode, etc.
├── infrastructure/
│   ├── database/               # PrismaModule + PrismaService
│   ├── cache/                  # RedisModule + RedisService
│   ├── i18n/                   # TranslationModule + TranslationService
│   ├── messaging/              # MessagingModule, MetaWhatsAppProvider
│   └── storage/                # MinioModule + MinioService
├── common/
│   ├── filters/                # HttpExceptionFilter (global)
│   └── interceptors/           # TransformInterceptor (global response shape)
└── modules/
    ├── health/                 # GET /health
    ├── customers/              # CustomerRepository
    ├── technicians/            # TechnicianRepository
    ├── jobs/                   # JobsService, JobsRepository
    ├── service-categories/     # ServiceCategoriesRepository
    ├── assignments/            # AssignmentsRepository
    └── whatsapp/
        ├── webhook/            # POST /webhooks/whatsapp (HMAC-guarded)
        ├── guards/             # WebhookHmacGuard
        ├── conversation/       # ConversationStateService (Redis-backed)
        ├── customer-bot/       # CustomerBotService
        └── technician-bot/     # TechnicianBotService + TechnicianSessionService
```

---

## Database Schema (Prisma)

Key models and their relationships:

```
Customer ──< Job >── ServiceCategory
                │
                └── Assignment ──> Technician ──< TechnicianSkill >── ServiceCategory
                │
                ├── Invoice ──> Payment
                ├── JobCommission
                ├── Rating
                └── Dispute

AdminUser          (separate — admin panel auth)
CommissionRule     (configurable FLAT/PERCENTAGE rates)
TechnicianSettlement
```

**Enums in use:**
- `Language`: EN | TA
- `JobStatus`: NEW → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED | CANCELLED
- `PaymentMode`: CASH | UPI
- `TechnicianStatus`: AVAILABLE | BUSY | OFFLINE
- `CommissionType`: FLAT | PERCENTAGE

---

## Multilingual Rules (MANDATORY)

Per `CLAUDE.md` — every customer/technician-facing message MUST:

1. Pass through `TranslationService.translate(key, language, params?)`
2. Use dot-notation keys from `src/infrastructure/i18n/locales/en.json` and `ta.json`
3. Never contain hardcoded strings in business services
4. Detect and persist the user's language preference on `Customer.language` / `Technician.language`

---

## WhatsApp Webhook Flow

```
POST /api/v1/webhooks/whatsapp
  └── WebhookHmacGuard       (verifies X-Hub-Signature-256)
      └── WebhookController
          ├── CustomerBotService   (if sender is a Customer)
          └── TechnicianBotService (if sender is a Technician)
                └── ConversationStateService (Redis session state)
```

Meta API base: `https://graph.facebook.com/v19.0/{phoneNumberId}/messages`

---

## Phase Progress (as of 2026-06-14)

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Architecture & Project Skeleton | ✅ COMPLETE |
| 1 | Infrastructure: Docker, PostgreSQL, Redis, MinIO | ✅ COMPLETE |
| 2 | Database: Prisma Schema & Migrations | ✅ COMPLETE |
| 3 | WhatsApp Integration | ✅ COMPLETE |
| 4 | Customer WhatsApp Bot | ✅ COMPLETE |
| 5 | Technician WhatsApp Workflow | ❌ NOT STARTED |
| 6 | Commission, Trust Score & Settlement Engines | ❌ NOT STARTED |
| 7 | Assignment Engine | ❌ NOT STARTED |
| 8 | Admin Dashboard (Frontend + Backend APIs) | ❌ NOT STARTED |
| 9 | Invoice & Payments | ❌ NOT STARTED |
| 10 | AI Dispatcher | ❌ NOT STARTED |
| 11 | Reports | ❌ NOT STARTED |
| 12 | Security | ❌ NOT STARTED |
| 13 | Production Deployment | ❌ NOT STARTED |

**Always update `SEVAGAN_DEV_INSTRUCTIONS.MD Section 18` and `TASK_PROGRESS.MD` when completing any task.**

---

## Testing Conventions

- Test files co-located with source: `*.spec.ts`
- E2E tests: `apps/api/test/`
- Coverage threshold: 80% (branches, functions, lines, statements)
- Excluded from coverage: `*.module.ts`, `main.ts`, enums, infrastructure modules, config, prisma
- Run a specific test: `cd apps/api && npx jest path/to/file.spec.ts`

---

## Key Architectural Decisions

- **WhatsApp-only MVP**: No mobile apps. All interactions via WhatsApp Cloud API.
- **Conversation state in Redis**: Session per phone number, TTL-managed.
- **Language detection at entry**: Persisted on the `Customer`/`Technician` record.
- **TranslationService as the single message gateway**: No hardcoded strings anywhere.
- **Prisma migrations**: Use `prisma migrate dev` for dev, `prisma migrate deploy` for production.
- **MinIO for invoices/images**: S3-compatible, self-hosted in Docker.
- **Ollama first, OpenAI fallback**: AI Dispatcher (Phase 10) uses local LLM to reduce cost.
- **URI versioning**: All routes under `/api/v1/`.
- **rawBody: true** in NestFactory: Required for HMAC webhook signature verification.
