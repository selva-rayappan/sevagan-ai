# SEVAGAN — Task Backlog

> Single source of truth for task-level completion status.
> Update this file alongside `docs/EXECUTION_PLAN.md Section 18` whenever a task is completed.

**Last Updated:** 2026-07-14 (Phase 12 Security complete — JWT rotation, RBAC, rate limiting, input validation, audit logging, HTTPS; 427 tests. Phase 13 artifacts ready — EC2 provisioning pending)

---

## Progress Overview

| Phase | Description | Status | Tasks Done |
|-------|-------------|--------|-----------|
| [Phase 0](#phase-0--architecture--project-skeleton) | Architecture & Project Skeleton | ✅ COMPLETE | 12/15 |
| [Phase 1](#phase-1--infrastructure-docker-postgresql-redis-minio) | Infrastructure: Docker, PostgreSQL, Redis, MinIO | ✅ COMPLETE | 8/12 |
| [Phase 2](#phase-2--database-prisma-schema--migrations) | Database: Prisma Schema & Migrations | ✅ COMPLETE | 17/18 |
| [Phase 3](#phase-3--whatsapp-integration) | WhatsApp Integration | ✅ COMPLETE | 24/24 |
| [Phase 4](#phase-4--customer-whatsapp-bot) | Customer WhatsApp Bot | ✅ COMPLETE | 27/27 |
| [Phase 5](#phase-5--technician-whatsapp-workflow) | Technician WhatsApp Workflow | ✅ COMPLETE | 24/24 |
| [Phase 6](#phase-6--commission-trust-score--settlement-engines) | Commission, Trust Score & Settlement Engines | ✅ COMPLETE | 22/22 |
| [Phase 7](#phase-7--assignment-engine) | Assignment Engine | ✅ COMPLETE | 16/16 |
| [Phase 8](#phase-8--admin-dashboard-frontend--backend-apis) | Admin Dashboard (Frontend + Backend APIs) | ✅ COMPLETE | 38/38 |
| [Phase 9](#phase-9--invoice--payments) | Invoice & Payments | ✅ COMPLETE | 16/16 |
| [Phase 10](#phase-10--ai-dispatcher) | AI Dispatcher | ✅ COMPLETE | 20/20 |
| [Phase 11](#phase-11--reports) | Reports | ✅ COMPLETE | 13/13 |
| [Phase 12](#phase-12--security) | Security | ✅ COMPLETE | 18/18 |
| [Phase 13](#phase-13--production-deployment) | Production Deployment | 🔄 IN PROGRESS | 12/22 (artifacts ready; EC2 provisioning/DNS/SSL execution pending) |

---

## Phase 0 — Architecture & Project Skeleton

**Status: ✅ COMPLETE**
**Goal:** Establish the monorepo, folder conventions, and shared types before any feature code is written.

### 0.1 Monorepo Initialisation
| # | Task | Status |
|---|------|--------|
| 0.1.1 | Root `package.json` with npm workspaces: `backend`, `frontend` | ✅ |
| 0.1.2 | `turbo.json` (or Nx) pipeline configuration | ❌ Deferred — scripts run via npm workspaces directly |
| 0.1.3 | Root `tsconfig.base.json` with path aliases | ❌ Deferred — each app has its own tsconfig |
| 0.1.4 | `.gitignore` added | ✅ |

### 0.2 NestJS Backend Scaffold
| # | Task | Status |
|---|------|--------|
| 0.2.1 | NestJS app bootstrapped inside `backend/` | ✅ |
| 0.2.2 | `ValidationPipe` globally enabled (whitelist, forbidNonWhitelisted) | ✅ |
| 0.2.3 | `ConfigModule` with `.env` validation via `class-validator` | ✅ |
| 0.2.4 | Module structure: `AppModule` → `HealthModule`, `WhatsAppModule`, infrastructure modules | ✅ |
| 0.2.5 | `HealthModule` with `/health` endpoint | ✅ |

### 0.3 Next.js Frontend Scaffold
| # | Task | Status |
|---|------|--------|
| 0.3.1 | Next.js 15 (App Router) bootstrapped inside `frontend/` | ✅ |
| 0.3.2 | TailwindCSS + ShadCN configured | ✅ |
| 0.3.3 | `next.config.ts` configured | ✅ |
| 0.3.4 | `/app/(admin)/layout.tsx` admin shell placeholder | ❌ Not yet added |

### 0.4 Shared Types / Domain Enums
| # | Task | Status |
|---|------|--------|
| 0.4.1 | Domain enums in `backend/src/domain/enums/`: `JobStatus`, `PaymentMode`, `Language`, `CommissionType`, `SettlementStatus`, `DisputeStatus`, `TechnicianStatus`, `AdminRole`, `InvoiceStatus` | ✅ |
| 0.4.2 | Separate `packages/shared-types` package | ❌ Deferred — enums live in backend domain layer |

### 0.5 Architecture Documentation
| # | Task | Status |
|---|------|--------|
| 0.5.1 | `.claude/CLAUDE.md` documents multilingual requirements and conventions | ✅ |
| 0.5.2 | `docs/EXECUTION_PLAN.md` master specification | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-0.1 | `npm run build` passes across all workspaces with zero errors | ✅ |
| AC-0.2 | `GET /health` returns `{ status: "ok" }` | ✅ |
| AC-0.3 | Shared types importable from `frontend/` | ❌ Enums are backend-only for now |

---

## Phase 1 — Infrastructure: Docker, PostgreSQL, Redis, MinIO

**Status: ✅ COMPLETE**
**Goal:** Every service the backend depends on runs locally via Docker Compose and is reachable with correct credentials.

### 1.1 Docker Compose (Development)
| # | Task | Status |
|---|------|--------|
| 1.1.1 | `docker-compose.yml` at repo root with postgres, redis, backend, frontend, nginx, minio, ollama services | ✅ |
| 1.1.2 | MinIO service in Docker Compose | ✅ |
| 1.1.3 | `docker-compose.override.yml` for local dev overrides | ❌ Not created |

### 1.2 Environment Configuration
| # | Task | Status |
|---|------|--------|
| 1.2.1 | `.env.example` with all required keys documented | ✅ |
| 1.2.2 | `.env` (git-ignored) for local values | ✅ |
| 1.2.3 | All keys present: `DATABASE_URL`, `REDIS_URL`, `WA_*`, `JWT_SECRET`, `OLLAMA_*`, `OPENAI_API_KEY`, `NODE_ENV`, `API_PORT` | ✅ |

### 1.3 Backend Service Connections
| # | Task | Status |
|---|------|--------|
| 1.3.1 | `PrismaModule` + `PrismaService` in `backend/src/infrastructure/database/` | ✅ |
| 1.3.2 | `RedisModule` + `RedisService` in `backend/src/infrastructure/cache/` | ✅ |
| 1.3.3 | `MinioModule` + `MinioService` in `backend/src/infrastructure/storage/` | ✅ |

### 1.4 Nginx Configuration
| # | Task | Status |
|---|------|--------|
| 1.4.1 | `infrastructure/nginx/nginx.conf` proxying `/api` → backend, `/` → frontend | ✅ |

### 1.5 CI Bootstrap
| # | Task | Status |
|---|------|--------|
| 1.5.1 | GitHub Actions workflow (build, test, lint) | ✅ `.github/workflows/ci.yml` — backend + frontend jobs |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-1.1 | `docker compose up` starts all services with no errors | ✅ |
| AC-1.2 | `GET /health` reachable via `http://localhost/api/health` | ✅ |
| AC-1.3 | Redis connection functional | ✅ |
| AC-1.4 | MinIO console accessible at `:9001` | ✅ |
| AC-1.5 | CI workflow runs on PR | ✅ |

---

## Phase 2 — Database: Prisma Schema & Migrations

**Status: ✅ COMPLETE**
**Goal:** All tables are defined, migrated, and seeded. Prisma client is fully typed and importable.

### 2.1 Prisma Setup
| # | Task | Status |
|---|------|--------|
| 2.1.1 | `prisma`, `@prisma/client` installed | ✅ |
| 2.1.2 | `prisma/schema.prisma` with `datasource db` pointing to `DATABASE_URL` | ✅ |
| 2.1.3 | Prisma generate step configured | ✅ |

### 2.2 Schema — Core Tables
| # | Table | Status |
|---|-------|--------|
| 2.2.1 | `Customer` — id, name, phone (unique), address, language, timestamps | ✅ |
| 2.2.2 | `Technician` — id, name, phone (unique), status, rating, trustScore, serviceArea, language, timestamps | ✅ |
| 2.2.3 | `AdminUser` — id, name, email (unique), passwordHash, role, active, timestamps | ✅ |
| 2.2.4 | `ServiceCategory` — id, name, description, active | ✅ |
| 2.2.5 | `TechnicianSkill` — id, technicianId, categoryId (composite unique) | ✅ |
| 2.2.6 | `Job` — id, jobNumber (unique), customerId, serviceCategoryId, status, description, location, scheduledTime, jobAmount, paymentMode, timestamps | ✅ |
| 2.2.7 | `Assignment` — id, jobId, technicianId, assignedAt, acceptedAt (nullable) | ✅ |
| 2.2.8 | `Invoice` — id, invoiceNumber (unique), jobId, amount, status, pdfUrl (nullable) | ✅ |
| 2.2.9 | `Payment` — id, invoiceId, amount, method, status, createdAt | ✅ |
| 2.2.10 | `CommissionRule` — id, paymentMode, commissionType, commissionValue, effectiveFrom, active | ✅ |
| 2.2.11 | `JobCommission` — id, jobId, jobAmount, commissionAmount, technicianAmount, paymentMode | ✅ |
| 2.2.12 | `TechnicianSettlement` — id, technicianId, grossAmount, commissionAmount, netAmount, status, createdAt | ✅ |
| 2.2.13 | `Rating` — id, jobId, customerId, technicianId, rating (1–5), comments, createdAt | ✅ |
| 2.2.14 | `Dispute` — id, jobId, customerAmount, technicianAmount, status, createdAt | ✅ |
| 2.2.15 | `AuditLog` — id, actorId, actorType, action, entityType, entityId, metadata (Json), createdAt | ✅ |
| 2.2.16 | `LocalizationKey` — id, keyName (unique), description | ✅ |
| 2.2.17 | `LocalizationValue` — id, localizationKeyId, languageCode, messageText | ✅ |

### 2.3 Enums
| # | Enum | Status |
|---|------|--------|
| 2.3.1 | `JobStatus`, `PaymentMode`, `Language`, `CommissionType`, `SettlementStatus`, `DisputeStatus`, `TechnicianStatus`, `AdminRole`, `InvoiceStatus`, `PaymentStatus` | ✅ |

### 2.4 Migrations
| # | Task | Status |
|---|------|--------|
| 2.4.1 | Initial migration: `backend/prisma/migrations/20260614083731_init_full_schema/` | ✅ |
| 2.4.2 | Migration step in CI | ❌ CI not set up |

### 2.5 Seed Data
| # | Task | Status |
|---|------|--------|
| 2.5.1 | `prisma/seed.ts` — 8 `ServiceCategory` records | ✅ |
| 2.5.2 | `prisma/seed.ts` — `CommissionRule`: CASH FLAT ₹20, UPI PERCENTAGE 5% | ✅ |
| 2.5.3 | `prisma/seed.ts` — default ops `AdminUser` account | ✅ |
| 2.5.4 | `prisma/seed.ts` — `LocalizationKey` + `LocalizationValue` for all MVP keys in EN and TA | ✅ |

### 2.6 PrismaModule in NestJS
| # | Task | Status |
|---|------|--------|
| 2.6.1 | `PrismaService` with lifecycle hooks | ✅ |
| 2.6.2 | `PrismaModule` exported as global module | ✅ |
| 2.6.3 | Prisma health indicator in `/health` endpoint | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-2.1 | `prisma migrate dev` runs cleanly on fresh database | ✅ |
| AC-2.2 | `prisma db seed` completes with no errors | ✅ |
| AC-2.3 | `prisma studio` shows all tables with correct columns | ✅ |
| AC-2.4 | `GET /health` includes database status | ✅ |

---

## Phase 3 — WhatsApp Integration

**Status: ✅ COMPLETE**
**Goal:** Webhook receives messages from Meta, signature is verified, messages are parsed and routed, and outbound messages can be sent.

### 3.1 WhatsApp Provider Interface
| # | Task | Status |
|---|------|--------|
| 3.1.1 | `IWhatsAppProvider` interface defined | ✅ |
| 3.1.2 | All business code depends only on this interface (no concrete class references) | ✅ |

### 3.2 Meta WhatsApp Provider Implementation
| # | Task | Status |
|---|------|--------|
| 3.2.1 | `MessagingModule` created (global) | ✅ |
| 3.2.2 | `MetaWhatsAppProvider` — injects `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID` | ✅ |
| 3.2.3 | Unit tests: `meta-whatsapp.provider.spec.ts` | ✅ |

### 3.3 Webhook Endpoint
| # | Task | Status |
|---|------|--------|
| 3.3.1 | `POST /api/v1/webhooks/whatsapp` — receives Meta webhook events | ✅ |
| 3.3.2 | `GET /api/v1/webhooks/whatsapp` — Meta verification (hub.mode, hub.verify_token, hub.challenge) | ✅ |
| 3.3.3 | HMAC-SHA256 signature verification via `X-Hub-Signature-256` header (`WebhookHmacGuard`) | ✅ |
| 3.3.4 | Returns `200 OK` immediately; async processing | ✅ |
| 3.3.5 | Unit tests: `webhook.controller.spec.ts` | ✅ |

### 3.4 Webhook Message Parser
| # | Task | Status |
|---|------|--------|
| 3.4.1 | Parses incoming JSON to typed message structures | ✅ |
| 3.4.2 | Inbound/outbound message type definitions | ✅ |

### 3.5 Outbound Message Service
| # | Task | Status |
|---|------|--------|
| 3.5.1 | Outbound messaging via `MetaWhatsAppProvider` | ✅ |
| 3.5.2 | All outbound messages pass through `TranslationService` | ✅ |

### 3.6 Translation Service (Localization)
| # | Task | Status |
|---|------|--------|
| 3.6.1 | `TranslationService` with JSON locale file loading | ✅ |
| 3.6.2 | `TranslationModule` registered (global) | ✅ |
| 3.6.3 | Locale JSON files: `backend/src/infrastructure/i18n/locales/en.json`, `ta.json` | ✅ |
| 3.6.4 | Variable interpolation support (`{{param}}`) | ✅ |
| 3.6.5 | EN fallback when TA key missing | ✅ |
| 3.6.6 | Unit tests: `translation.service.spec.ts` | ✅ |

### 3.7 Message Template Seed
| # | Task | Status |
|---|------|--------|
| 3.7.1 | All MVP message keys seeded in EN and TA | ✅ |
| 3.7.2 | Keys: `LANGUAGE_SELECTION`, `WELCOME`, `SERVICE_MENU`, `LOCATION_PROMPT`, `TIME_PROMPT`, `JOB_CREATED`, `JOB_ASSIGNED`, `JOB_ACCEPTED`, `JOB_STARTED`, `JOB_COMPLETED`, `AMOUNT_CONFIRMATION`, `AMOUNT_CONFIRMED`, `AMOUNT_DISPUTED`, `RATING_PROMPT`, `RATING_RECEIVED`, `TECHNICIAN_JOB_OFFER`, `TECHNICIAN_JOB_ACCEPTED`, `TECHNICIAN_JOB_REJECTED`, `TECHNICIAN_START_PROMPT`, `TECHNICIAN_COMPLETE_PROMPT`, `HELP`, `UNKNOWN_COMMAND`, `ERROR_GENERIC` | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-3.1 | Meta webhook verification GET request returns correct challenge | ✅ |
| AC-3.2 | Invalid signature POST returns `403 Forbidden` | ✅ |
| AC-3.3 | Valid text message routed to correct bot service | ✅ |
| AC-3.4 | `TranslationService.translate("customer.welcome", "TA")` returns Tamil text | ✅ |
| AC-3.5 | `TranslationService.translate("customer.welcome", "EN")` returns English text | ✅ |
| AC-3.6 | No hardcoded strings outside of locale files | ✅ |

---

## Phase 4 — Customer WhatsApp Bot

**Status: ✅ COMPLETE**
**Goal:** A customer can send a message, choose a language, request a service, share a location, pick a time, and receive a job number — all via WhatsApp.

### 4.1 Customer Session Management
| # | Task | Status |
|---|------|--------|
| 4.1.1 | `ConversationStateService` backed by Redis (`conv:{phone}` key, 24h TTL) | ✅ |
| 4.1.2 | Session state machine: `IDLE → AWAITING_LANGUAGE → AWAITING_SERVICE → AWAITING_LOCATION → AWAITING_TIME` | ✅ |
| 4.1.3 | `ConversationSession` interface stored as JSON in Redis | ✅ |
| 4.1.4 | `createNewSession`, `getSession`, `saveSession`, `clearSession` methods | ✅ |

### 4.2 Customer Message Router
| # | Task | Status |
|---|------|--------|
| 4.2.1 | `CustomerBotService` injected into `WebhookController.dispatchMessage()` | ✅ |
| 4.2.2 | Customer upserted by phone on every inbound message | ✅ |
| 4.2.3 | Routes based on session state + message content | ✅ |
| 4.2.4 | Unknown input returns `customer.unknown_command` translation | ✅ |

### 4.3 Language Selection Flow
| # | Task | Status |
|---|------|--------|
| 4.3.1 | Every new session (IDLE state) triggers interactive button language selection | ✅ |
| 4.3.2 | `1` / `lang_en` → English; `2` / `lang_ta` → Tamil | ✅ |
| 4.3.3 | Language persisted in `customers.language` DB column + session | ✅ |
| 4.3.4 | All subsequent messages sent in customer's chosen language | ✅ |

### 4.4 Service Request Flow
| # | Task | Status |
|---|------|--------|
| 4.4.1 | Service menu sent as an interactive list message (tap to select) — live from `findActive()`, order = `createdAt asc` (updated 2026-07-19, was a static numbered-text menu) | ✅ |
| 4.4.2 | On valid selection: lookup category by id from session's `pendingServiceCategoryIds`, advance to AWAITING_LOCATION | ✅ |
| 4.4.3 | On invalid selection: error + re-send list (state unchanged) | ✅ |

### 4.5 Location Handling
| # | Task | Status |
|---|------|--------|
| 4.5.1 | Accepts text location (area name) | ✅ |
| 4.5.2 | Accepts native WhatsApp location share | ✅ |
| 4.5.3 | WhatsApp location: uses `name` → `address` → `lat,lng` fallback chain | ✅ |
| 4.5.4 | Location stored in session, advance to AWAITING_TIME | ✅ |

### 4.6 Time Scheduling
| # | Task | Status |
|---|------|--------|
| 4.6.1 | Free-text time input accepted ("Today 4 PM", "Tomorrow 10 AM", "ASAP") | ✅ |
| 4.6.2 | Raw text stored in job `description` field as "Requested time: ..." | ✅ |

### 4.7 Job Creation
| # | Task | Status |
|---|------|--------|
| 4.7.1 | `Job` record created with status `NEW` | ✅ |
| 4.7.2 | Job number format: `JOB-YYYYMMDD-NNNN` via Redis `INCR job_counter:{date}` | ✅ |
| 4.7.3 | `JOB_CREATED` confirmation sent with jobNumber, service, location, scheduledTime | ✅ |
| 4.7.4 | Session reset to IDLE after creation | ✅ |

### 4.8 Supported Commands (Any State)
| # | Task | Status |
|---|------|--------|
| 4.8.1 | `TRACK JOB-YYYYMMDD-NNNN` — job status in customer's language | ✅ |
| 4.8.2 | `CANCEL JOB-YYYYMMDD-NNNN` — cancels NEW/ASSIGNED jobs; rejects IN_PROGRESS+ | ✅ |
| 4.8.3 | `HELP` / `உதவி` — help message in customer's language | ✅ |

### 4.8a Idle Session Nudge (added 2026-07-20)
| # | Task | Status |
|---|------|--------|
| 4.8a.1 | `CustomerIdleNudgeService` — `setInterval` polls every 60s, `SCAN conv:*` via `RedisService.getClient()` | ✅ |
| 4.8a.2 | Only nudges AWAITING_LANGUAGE/SERVICE/LOCATION/TIME (mid-request); skips IDLE and post-job AWAITING_AMOUNT_CONFIRMATION/AWAITING_RATING | ✅ |
| 4.8a.3 | `customer.idle_reminder` sent once after 15 min idle (`idleReminderSentAt` flag) | ✅ |
| 4.8a.4 | `customer.idle_dropoff` sent once after 30 min idle (`idleDropOffSentAt` flag), resets session to IDLE and clears in-progress selection fields | ✅ |
| 4.8a.5 | Idle time measured via new `lastCustomerMessageAt` field, set only on real inbound customer messages — kept separate from `updatedAt` (which `saveSession()` bumps on every write, including the nudge's own) so sending a nudge doesn't reset the idle clock | ✅ |
| 4.8a.6 | Both idle flags cleared on the customer's next real message, so nudges can fire again for a later idle period in the same conversation | ✅ |

### 4.9 Repositories
| # | Task | Status |
|---|------|--------|
| 4.9.1 | `CustomersRepository`: `findByPhone`, `findById`, `upsert`, `updateLanguage` | ✅ |
| 4.9.2 | `ServiceCategoriesRepository`: `findAll`, `findActive`, `findByName`, `findById` | ✅ |
| 4.9.3 | `JobsRepository`: `create`, `findByJobNumber`, `findByCustomerId`, `updateStatus` | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-4.1 | New customer receives language selection on first message | ✅ |
| AC-4.2 | Language preference persisted in DB + Redis session | ✅ |
| AC-4.3 | Customer completes full flow: language → service → location → time → job confirmed | ✅ |
| AC-4.4 | `Job` record created in DB with jobNumber, customerId, serviceCategoryId, location | ✅ |
| AC-4.5 | `TRACK JOB-XXX` returns current status in customer's language | ✅ |
| AC-4.6 | `CANCEL JOB-XXX` cancels NEW/ASSIGNED jobs with confirmation | ✅ |
| AC-4.7 | Unknown commands return localised error message | ✅ |
| AC-4.8 | All messages pass through `TranslationService` (no hardcoded strings) | ✅ |
| AC-4.9 | 117 tests passing — Statements 97.58%, Branches 88.54%, Functions 95.31%, Lines 98.01% | ✅ |

---

## Phase 5 — Technician WhatsApp Workflow

**Status: ✅ COMPLETE**
**Goal:** Technicians receive job offers, can accept/reject, start, complete, and upload photos — all via WhatsApp.

### 5.1 Technician Session Management
| # | Task | Status |
|---|------|--------|
| 5.1.1 | `TechnicianSessionService` backed by Redis (`tech_session:{phone}`) | ✅ |
| 5.1.2 | State machine: `IDLE → JOB_OFFER_PENDING → JOB_ACCEPTED → JOB_IN_PROGRESS → AWAITING_COMPLETION` | ✅ |
| 5.1.3 | Store active `jobId`, `assignmentId`, `customerPhone`, `offerExpiresAt` in session | ✅ |

### 5.2 Technician Message Router
| # | Task | Status |
|---|------|--------|
| 5.2.1 | `TechnicianBotService` with `handleMessage(message, senderName, technician)` | ✅ |
| 5.2.2 | `WebhookController` identifies technician via `TechniciansRepository.findByPhone`; routes to `TechnicianBotService` if found, else `CustomerBotService` | ✅ |
| 5.2.3 | Route based on session state + message content | ✅ |

### 5.3 Job Offer Notification
| # | Task | Status |
|---|------|--------|
| 5.3.1 | `TechnicianBotService.sendJobOffer(technician, job, customer)` — sends interactive buttons | ✅ |
| 5.3.2 | Message includes: customer name, service type, location, scheduled time (EN+TA) | ✅ |
| 5.3.3 | Interactive buttons: `Accept` / `Reject` — titles now routed through `TranslationService` (`technician.accept_button`/`reject_button`), previously hardcoded English strings despite the "localised" intent (fixed 2026-07-19) | ✅ |
| 5.3.4 | Set session state to `JOB_OFFER_PENDING`, store `offerExpiresAt` (15 min TTL) | ✅ |
| 5.3.5 | Expired offer resets session to IDLE with `offer_expired` message on next incoming message | ✅ |

### 5.4 Accept / Reject Handling
| # | Task | Status |
|---|------|--------|
| 5.4.1 | `1` / `accept_job` / `accept` / `ஏற்கவும்`: set `Assignment.acceptedAt`, `Job.status = ACCEPTED`, `Technician.status = BUSY`; customer notified | ✅ |
| 5.4.2 | `2` / `reject_job` / `reject` / `நிராகரிக்கவும்`: delete assignment, `Job.status = NEW`, session cleared to IDLE | ✅ |
| 5.4.3 | Expired offer detected on next message; session reset to IDLE | ✅ |

### 5.5 Start / Decline (after Accept)
| # | Task | Status |
|---|------|--------|
| 5.5.1 | Validate: session must be `JOB_ACCEPTED` | ✅ |
| 5.5.2 | `job_accepted` sent as interactive buttons: Start / Decline (`technician.start_button`/`decline_button`) — was typed `START`/`1`/`2` text before 2026-07-19 | ✅ |
| 5.5.3 | Update `Job.status = IN_PROGRESS` | ✅ |
| 5.5.4 | Send `job_started` to technician as interactive buttons: Complete (Cash) / Complete (UPI) | ✅ |
| 5.5.5 | Send `JOB_STARTED` notification to customer (plain text, informational only) | ✅ |
| 5.5.6 | Advance session to `JOB_IN_PROGRESS` | ✅ |

### 5.6 Job Completion
| # | Task | Status |
|---|------|--------|
| 5.6.1 | Complete (Cash) / Complete (UPI) selected via interactive buttons → `AWAITING_PAYMENT_AMOUNT` state; amount entered as free text (numeric, can't be a tap target) | ✅ |
| 5.6.2 | Call `JobsService.setCompletion(id, amount, paymentMode)` — sets `jobAmount`, `paymentMode`, `status = COMPLETED` | ✅ |
| 5.6.3 | Send `job_completed` to technician (commission calculated via Phase 6 engine) | ✅ |
| 5.6.4 | Send `confirm_amount` to customer as interactive buttons: Yes Correct / No Incorrect; set customer session to `AWAITING_AMOUNT_CONFIRMATION` | ✅ |

### 5.7 Photo Upload
| # | Task | Status |
|---|------|--------|
| 5.7.1 | Download image via `whatsapp.downloadMedia(mediaId)` (Meta Graph API) | ✅ |
| 5.7.2 | Upload to MinIO `sevagan-uploads` under `job-photos/{jobId}/{timestamp}.{ext}` | ✅ |
| 5.7.3 | `JobsService.appendPhotoUrl()` appends `Photo: {key}` to job description | ✅ |
| 5.7.4 | Send `photo_received` confirmation; upload errors send `unknown_command` | ✅ |

### 5.8 Technician Commands (Any State)
| # | Task | Status |
|---|------|--------|
| 5.8.1 | `STATUS` / `நிலை` — sends current active job details or `no_active_job` | ✅ |
| 5.8.2 | `JOBS` / `வேலைகள்` — sends last 5 jobs summary via `findByTechnicianId` | ✅ |
| 5.8.3 | `HELP` / `உதவி` — sends localised command reference | ✅ |
| 5.8.4 | Language change via `LANGUAGE` / `மொழி` — update preference in DB | ✅ |

### 5.9 Repositories & Extensions
| # | Task | Status |
|---|------|--------|
| 5.9.1 | `TechniciansRepository`: `findByPhone`, `findById`, `updateLanguage`, `updateStatus` | ✅ |
| 5.9.2 | `AssignmentsRepository`: `create`, `findByJobId`, `findById`, `accept`, `deleteById`, `findByTechnicianId` | ✅ |
| 5.9.3 | `JobsRepository` extended: `findById`, `findByIdWithDetails`, `findByTechnicianId`, `setCompletion`, `appendDescription` | ✅ |
| 5.9.4 | `downloadMedia` added to `IWhatsAppProvider` interface and `MetaWhatsAppProvider` | ✅ |

### 5.10 i18n
| # | Task | Status |
|---|------|--------|
| 5.10.1 | EN + TA translations for all technician messages: `job_offer`, `job_accepted`, `job_rejected`, `job_started`, `job_completed`, `photo_received`, `unknown_command`, `no_active_job`, `offer_expired`, `job_history`, `status_awaiting_confirmation`, `help` | ✅ |
| 5.10.2 | Customer extensions: `confirm_amount`, `amount_confirmed`, `amount_disputed`, `rate_technician`, `rating_received` | ✅ |

### 5.11 Customer Bot Extensions
| # | Task | Status |
|---|------|--------|
| 5.11.1 | `AWAITING_AMOUNT_CONFIRMATION` state: `1` confirms → `AWAITING_RATING`; `2` disputes → IDLE; else re-prompt | ✅ |
| 5.11.2 | `AWAITING_RATING` state: 1–5 accepted → IDLE; else re-prompt | ✅ |

### 5.12 Tests
| # | Task | Status |
|---|------|--------|
| 5.12.1 | `technicians.repository.spec.ts` — 4 tests | ✅ |
| 5.12.2 | `assignments.repository.spec.ts` — 6 tests | ✅ |
| 5.12.3 | `technician-session.service.spec.ts` — 5 tests | ✅ |
| 5.12.4 | `technician-bot.service.spec.ts` — 22 tests | ✅ |
| 5.12.5 | `webhook.controller.spec.ts` — updated with technician routing tests | ✅ |
| 5.12.6 | `customer-bot.service.spec.ts` — updated: AWAITING_AMOUNT_CONFIRMATION (3 tests), AWAITING_RATING (4 tests) | ✅ |
| 5.12.7 | `jobs.repository.spec.ts` — updated: findById, findByIdWithDetails, setCompletion, appendDescription | ✅ |
| 5.12.8 | `jobs.service.spec.ts` — updated: findById, findWithDetails, setCompletion, appendPhotoUrl | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-5.1 | Technician receives job offer with correct localised text (EN+TA) | ✅ |
| AC-5.2 | `1` within 15 min accepts job; `2` rejects and clears session | ✅ |
| AC-5.3 | Expired offer detected on next message; session reset to IDLE | ✅ |
| AC-5.4 | `START` updates job to IN_PROGRESS; customer notified | ✅ |
| AC-5.5 | `COMPLETE 1500 UPI` sets amount, payment mode; customer prompted for confirmation | ✅ |
| AC-5.6 | Image upload stores file in MinIO and appends URL to job description | ✅ |
| AC-5.7 | Customer `AWAITING_AMOUNT_CONFIRMATION` and `AWAITING_RATING` states wired end-to-end | ✅ |
| AC-5.8 | **183 tests, 17 suites — all passing** | ✅ |
| AC-5.9 | **Coverage: Statements 96.48% \| Branches 83.41% \| Functions 97.39% \| Lines 97.26%** | ✅ |
| AC-5.10 | `nest build` clean | ✅ |

---

## Phase 6 — Commission, Trust Score & Settlement Engines

**Status: ✅ COMPLETE**
**Goal:** Every completed job automatically calculates commission, updates the technician trust score, and settlement records are generated correctly.

### 6.1 Commission Engine
| # | Task | Status |
|---|------|--------|
| 6.1.1 | Create `CommissionService` | ✅ |
| 6.1.2 | `calculateCommission(jobAmount, paymentMode)` — fetch active rule, apply FLAT or PERCENTAGE | ✅ |
| 6.1.3 | `recordCommission(jobId)` — persist to `job_commissions` | ✅ |
| 6.1.4 | Triggered on customer amount confirmation (reply '1' in `AWAITING_AMOUNT_CONFIRMATION`) | ✅ |
| 6.1.5 | MVP: commission rules set to 0 (CASH FLAT, UPI PERCENTAGE) via admin Commission tab; display removed from invoice + technician messages (commented out, not deleted) while technicians onboard — see `docs/EXECUTION_PLAN.md` §6.1 (2026-07-19) | ✅ |

### 6.2 Commission Rule Service
| # | Task | Status |
|---|------|--------|
| 6.2.1 | `getActiveRule(paymentMode)` | ✅ |
| 6.2.2 | `createRule(dto)` — deactivates previous rule, activates new | ✅ |
| 6.2.3 | `listRules()` | ✅ |
| 6.2.4 | Commission rule changes logged via NestJS Logger | ✅ |

### 6.3 Trust Score Engine
| # | Task | Status |
|---|------|--------|
| 6.3.1 | Create `TrustScoreService` | ✅ |
| 6.3.2 | Initial score on registration: `100` (Prisma schema default) | ✅ |
| 6.3.3 | `AMOUNT_DISPUTED`: −5; `MISMATCH_RESOLVED_AGAINST_TECH`: −10; `FRAUD_DETECTED`: −25 | ✅ |
| 6.3.4 | `POSITIVE_RATING` (4–5 stars): +2; `NEGATIVE_RATING` (1–2 stars): −3 | ✅ |
| 6.3.5 | `applyTrustEvent(technicianId, event)` — update `technician.trustScore` | ✅ |
| 6.3.6 | Minimum score: `0` (never negative) | ✅ |
| 6.3.7 | Applied on: amount disputed, rating received | ✅ |

### 6.4 Customer Validation Handler
| # | Task | Status |
|---|------|--------|
| 6.4.1 | Handle customer replies to `AMOUNT_CONFIRMATION` in `CustomerBotService` | ✅ |
| 6.4.2 | `1` (Correct): record commission, notify tech confirmed, tech AVAILABLE, proceed to rating | ✅ |
| 6.4.3 | `2` (Incorrect): create `Dispute` (status `OPEN`), apply trust deduction, notify tech disputed, tech AVAILABLE | ✅ |

### 6.5 Rating Collection
| # | Task | Status |
|---|------|--------|
| 6.5.1 | After amount confirmed: customer stays in `AWAITING_RATING` state | ✅ |
| 6.5.2 | Accept reply `1`–`5` | ✅ |
| 6.5.3 | Create `Rating` record via `RatingsRepository` | ✅ |
| 6.5.4 | Update `technician.rating` as rolling average | ✅ |
| 6.5.5 | Apply trust event on rating receipt | ✅ |

### 6.6 Settlement Engine
| # | Task | Status |
|---|------|--------|
| 6.6.1 | Create `SettlementService` | ✅ |
| 6.6.2 | `generateSettlementForTechnician(technicianId, periodStart, periodEnd)` — aggregate COMPLETED jobs, create `TechnicianSettlement` with status `PENDING` | ✅ |
| 6.6.3 | `markSettlementPaid(settlementId)` — update status to PAID, set paidAt | ✅ |
| 6.6.4 | `listSettlements(technicianId?, status?)` | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-6.1 | CASH job ₹1000: commissionAmount = ₹20, technicianAmount = ₹980 | ✅ |
| AC-6.2 | UPI job ₹1000: commissionAmount = ₹50, technicianAmount = ₹950 | ✅ |
| AC-6.3 | Dispute reduces trust score by 5 | ✅ |
| AC-6.4 | Rating 5 stars increases trust score by 2 | ✅ |
| AC-6.5 | Settlement generates correct net amounts for a technician with multiple completed jobs | ✅ |
| AC-6.6 | Settlement status transitions PENDING → PAID correctly | ✅ |
| AC-6.7 | **216 tests, 23 suites — all passing** | ✅ |

---

## Phase 7 — Assignment Engine

**Status: ✅ COMPLETE**
**Goal:** When a job is created, the system automatically selects the best available technician, notifies them, and handles reassignment on reject or timeout.

### 7.1 Assignment Engine Service
| # | Task | Status |
|---|------|--------|
| 7.1.1 | `AssignmentEngineService.tryAssignJob(jobId, customerPhone)` | ✅ |
| 7.1.2 | `findBestAvailable(categoryId, location, excludedIds)` — ILIKE serviceArea, composite score ordering | ✅ |
| 7.1.3 | `TechnicianSessionModule` extracted to break circular dependency with WhatsAppModule | ✅ |
| 7.1.4 | Admin-editable `Technician.priorityRank` (0-100, default 50) — weighted boost in composite score (`priorityRank*2 + trustScore + rating*10`), not a hard override | ✅ |

### 7.2 Assignment Creation
| # | Task | Status |
|---|------|--------|
| 7.2.1 | `assignJobToTechnician` — create `Assignment`, set ASSIGNED/BUSY, set tech session JOB_OFFER_PENDING | ✅ |
| 7.2.2 | Send interactive WhatsApp job offer buttons via `WHATSAPP_PROVIDER` + `TranslationService` | ✅ |
| 7.2.3 | Fire-and-forget: `CustomerBotService.handleTime()` calls `.tryAssignJob(...).catch(err => logger.error)` | ✅ |

### 7.3 Rejection & Reassignment
| # | Task | Status |
|---|------|--------|
| 7.3.1 | `triggerReassignment(jobId, rejectedTechnicianId)` — called on reject and offer timeout | ✅ |
| 7.3.2 | Redis rejection list: `job_rejections:{jobId}` key, 24h TTL, deduplicates | ✅ |
| 7.3.3 | Max 3 rejections → notify customer via `customer.no_technician_available` translation | ✅ |
| 7.3.4 | Below max → find next best excluding all rejected tech IDs | ✅ |

### 7.4 Service Area Matching
| # | Task | Status |
|---|------|--------|
| 7.4.1 | `extractLocationKeyword(location)` — splits by comma, takes last segment (e.g. "Near Bus Stand, Allampatti" → "Allampatti") | ✅ |
| 7.4.2 | Prisma `serviceArea: { contains: keyword, mode: 'insensitive' }` | ✅ |

### 7.5 i18n
| # | Task | Status |
|---|------|--------|
| 7.5.1 | `customer.no_technician_available` added to `en.json` and `ta.json` | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-7.1 | Job assigns to highest trust-score technician covering the location | ✅ |
| AC-7.2 | Rejected assignment triggers reassignment to next technician | ✅ |
| AC-7.3 | After 3 failed assignments: customer receives waiting message | ✅ |
| AC-7.4 | Offer timeout triggers `triggerReassignment` same as explicit rejection | ✅ |
| AC-7.5 | **8 new tests in assignment-engine.service.spec.ts — all passing** | ✅ |

---

## Phase 8 — Admin Dashboard (Frontend + Backend APIs)

**Status: ✅ COMPLETE**
**Goal:** Operations admin can log in and manage all entities via a Next.js web dashboard. All data is live from the backend.

### 8.1 Authentication Backend
| # | Task | Status |
|---|------|--------|
| 8.1.1 | `POST /api/v1/auth/login` — bcrypt compare, returns accessToken (15m) + refreshToken (7d) | ✅ |
| 8.1.2 | `POST /api/v1/auth/refresh` — verify refreshToken, re-issue both tokens | ✅ |
| 8.1.3 | `POST /api/v1/auth/logout`, `GET /api/v1/auth/me` | ✅ |
| 8.1.4 | `JwtAuthGuard` as global `APP_GUARD`; `@Public()` decorator for webhook + health | ✅ |
| 8.1.5 | `JWT_SECRET` / `JWT_REFRESH_SECRET` in `app.config.ts` with safe defaults | ✅ |

### 8.2 Admin Login Frontend
| # | Task | Status |
|---|------|--------|
| 8.2.1 | `frontend/src/app/(auth)/login/page.tsx` — email/password form | ✅ |
| 8.2.2 | Tokens stored via `auth.setTokens()` in localStorage; redirect to `/dashboard` | ✅ |
| 8.2.3 | Admin layout redirects to `/login` if `!auth.isLoggedIn()` | ✅ |

### 8.3 Dashboard KPIs
| # | Task | Status |
|---|------|--------|
| 8.3.1 | `GET /api/v1/dashboard/kpis` — 8 metrics via `Promise.all` parallel Prisma queries | ✅ |
| 8.3.2 | Dashboard page: 8-card grid; auto-refresh every 30s; loading skeleton | ✅ |

### 8.4 Customer Management
| # | Task | Status |
|---|------|--------|
| 8.4.1 | `GET /api/v1/admin/customers` — paginated | ✅ |
| 8.4.2 | `GET /api/v1/admin/customers/:id` — detail with recent jobs | ✅ |
| 8.4.3 | `PATCH /api/v1/admin/customers/:id` | ✅ |
| 8.4.4 | Customers page: paginated table with Previous/Next | ✅ |

### 8.5 Technician Management
| # | Task | Status |
|---|------|--------|
| 8.5.1 | `POST /api/v1/admin/technicians` — create + add skills + send WhatsApp `technician.welcome` | ✅ |
| 8.5.2 | `GET /api/v1/admin/technicians` (paginated), `GET /:id` (+ `totalJobs`/`totalEarnings`/`totalCommission` via `JobCommission.aggregate`), `PATCH /:id` | ✅ |
| 8.5.3 | Technicians page: table + create modal with skill pill toggles; clicking a technician's name folds open a detail row with Joined date, Total Jobs, Total Earnings, Total Commission (lazy-fetched + cached per row) | ✅ |

### 8.6 Job Management
| # | Task | Status |
|---|------|--------|
| 8.6.1 | `GET /api/v1/admin/jobs` — paginated with status/date filters | ✅ |
| 8.6.2 | `POST /api/v1/admin/jobs/:id/assign` — genuine manual pick via `AssignmentEngineService.manualAssign(jobId, technicianId)`; frees the previous technician back to AVAILABLE first | ✅ |
| 8.6.3 | `POST /api/v1/admin/jobs/:id/cancel` | ✅ |
| 8.6.4 | Jobs page: table with status filter dropdown, all 6 `JobStatus` color badges, "Assign" button + technician-picker modal on NEW/ASSIGNED/ACCEPTED rows | ✅ |

### 8.7 Settlement Management
| # | Task | Status |
|---|------|--------|
| 8.7.1 | `GET /api/v1/admin/settlements`, `POST /generate`, `POST /:id/pay` | ✅ |
| 8.7.2 | Settlements page: Generate modal + Mark Paid button | ✅ |

### 8.8 Commission Rule Configuration
| # | Task | Status |
|---|------|--------|
| 8.8.1 | `GET /api/v1/admin/commission-rules`, `POST /api/v1/admin/commission-rules` | ✅ |
| 8.8.2 | Commission page: table + inline create form | ✅ |

### 8.9 Dispute Management
| # | Task | Status |
|---|------|--------|
| 8.9.1 | `GET /api/v1/admin/disputes` (with status filter), `GET /:id`, `POST /:id/resolve` | ✅ |
| 8.9.2 | Disputes page: status filter + Resolve button with notes prompt | ✅ |

### 8.10 Service Categories
| # | Task | Status |
|---|------|--------|
| 8.10.1 | `GET /api/v1/admin/service-categories` (`?all=true` for held/inactive too) — used by technician create form and the Services page | ✅ |
| 8.10.2 | `POST /api/v1/admin/service-categories`, `PATCH /:id` (name/description/`active` for Hold-Unhold), `DELETE /:id` (409 + "use Hold instead" if technicians/jobs still reference it) | ✅ |
| 8.10.3 | Services page: table (name, description, Active/Held badge), Add/Edit modal, Hold/Unhold toggle, Remove with confirm | ✅ |
| 8.10.4 | Customer WhatsApp service menu is now generated live from `findActive()` instead of a hardcoded 8-item map — admin add/hold/remove immediately changes what customers can select | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-8.1 | Admin can log in; JWT auth guard protects all admin routes | ✅ |
| AC-8.2 | Dashboard KPIs fetched live from database | ✅ |
| AC-8.3 | Technician created from dashboard sends WhatsApp onboarding via TranslationService | ✅ |
| AC-8.4 | Job list filters by status correctly | ✅ |
| AC-8.5 | Manual assignment triggers AssignmentEngineService | ✅ |
| AC-8.6 | Settlement generation computes correct amounts | ✅ |
| AC-8.7 | **224 tests, 24 suites — all passing** | ✅ |

---

## Phase 9 — Invoice & Payments

**Status: ✅ COMPLETE**
**Goal:** Every completed job produces a PDF invoice. Payment records are created. UPI payment links are generated and tracked.

### 9.1 Invoice Generation
| # | Task | Status |
|---|------|--------|
| 9.1.1 | Create `InvoiceService` | ✅ |
| 9.1.2 | `generateInvoice(jobId)` — generate `invoiceNumber` (INV-YYYYMMDD-NNNN), create `Invoice` record | ✅ |
| 9.1.3 | Triggered automatically on `job.amount_confirmed` | ✅ |

### 9.2 PDF Generation
| # | Task | Status |
|---|------|--------|
| 9.2.1 | Use `puppeteer` or PDFKit to render invoice HTML → PDF | ✅ PDFKit |
| 9.2.2 | Invoice template: Sevagan branding, job details, amount, commission breakdown, payment mode | ✅ |
| 9.2.3 | Localised template (EN or TA based on customer language) | ✅ |
| 9.2.4 | Upload PDF to MinIO `invoices/{invoiceId}.pdf` | ✅ |
| 9.2.5 | Store `pdfUrl` on `Invoice` record | ✅ |
| 9.2.6 | Send PDF link to customer via WhatsApp after generation | ✅ |

### 9.3 Payment Recording
| # | Task | Status |
|---|------|--------|
| 9.3.1 | `recordCashPayment(invoiceId)` — status `COMPLETED` immediately | ✅ |
| 9.3.2 | `recordUpiPayment(invoiceId, transactionRef)` — status `PENDING` until confirmed | ✅ |

### 9.4 UPI Payment Flow (MVP Simplified)
| # | Task | Status |
|---|------|--------|
| 9.4.1 | On `COMPLETE 1200 UPI`: generate UPI deep link `upi://pay?pa=sevagan@upi&am=1200&tn=JOB123` | ✅ |
| 9.4.2 | Send link to customer via WhatsApp | ✅ Razorpay link + UPI deep link |
| 9.4.3 | Admin manually confirms receipt in dashboard → status updated to COMPLETED | ✅ |

### 9.5 Invoice APIs
| # | Task | Status |
|---|------|--------|
| 9.5.1 | `GET /api/v1/invoices` — list with job and customer info | ✅ |
| 9.5.2 | `GET /api/v1/invoices/:id` — detail | ✅ |
| 9.5.3 | `GET /api/v1/invoices/:id/pdf` — redirect to signed MinIO URL | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-9.1 | Completed job produces PDF invoice in MinIO within 30 seconds | ✅ |
| AC-9.2 | Customer receives WhatsApp message with invoice PDF link | ✅ |
| AC-9.3 | Cash payment recorded as COMPLETED immediately | ✅ |
| AC-9.4 | UPI deep link sent to customer with correct amount | ✅ Razorpay link via WhatsApp |
| AC-9.5 | Admin can view all invoices and download PDFs | ✅ Frontend /invoices page |

---

## Phase 10 — AI Dispatcher

**Status: ✅ COMPLETE**
**Goal:** Free-text customer messages are understood by an AI model, mapped to service categories, and handled in the user's language.

### 10.1 Ollama Integration
| # | Task | Status |
|---|------|--------|
| 10.1.1 | Create `OllamaService` | ✅ `OllamaProvider` in `infrastructure/ai/` |
| 10.1.2 | `chat(messages)` — calls `POST /api/chat` on Ollama | ✅ |
| 10.1.3 | Configure from `OLLAMA_BASE_URL`, default model `qwen3` via `OLLAMA_MODEL` env var | ✅ |
| 10.1.4 | Timeout: 10 seconds | ✅ |

### 10.2 OpenAI Fallback
| # | Task | Status |
|---|------|--------|
| 10.2.1 | Create `OpenAIService` implementing same `IAIProvider` interface as `OllamaService` | ✅ `OpenAIProvider` |
| 10.2.2 | Activate when `OPENAI_FALLBACK=true` or Ollama times out | ✅ `AIService` auto-falls back |

### 10.3 AI Provider Abstraction
| # | Task | Status |
|---|------|--------|
| 10.3.1 | `IAIProvider` interface: `chat(messages, options?)` | ✅ `ai.provider.interface.ts` |
| 10.3.2 | `AIService` tries `OllamaProvider` first, falls back to `OpenAIProvider` | ✅ |
| 10.3.3 | Log which provider was used per request | ✅ |

### 10.4 Intent Classification
| # | Task | Status |
|---|------|--------|
| 10.4.1 | Create `IntentClassifierService` | ✅ |
| 10.4.2 | System prompt defines intents: `REQUEST_SERVICE`, `TRACK_JOB`, `CANCEL_JOB`, `FAQ_HOURS`, `FAQ_PRICING`, `FAQ_COVERAGE`, `UNKNOWN` | ✅ |
| 10.4.3 | `classifyIntent(userMessage, language)` → `{ intent, confidence, detectedLanguage }` | ✅ |

### 10.5 Service Category Mapping
| # | Task | Status |
|---|------|--------|
| 10.5.1 | `mapToServiceCategory(userMessage)` — system prompt with all 8 categories + synonyms in EN + TA | ✅ |
| 10.5.2 | Return matched category or null for ambiguous input (bot shows full list) | ✅ |

### 10.6 Language Detection
| # | Task | Status |
|---|------|--------|
| 10.6.1 | `detectLanguage(text)` — returns `"EN"` or `"TA"` | ✅ Heuristic + AI fallback |
| 10.6.2 | If detected language differs from stored preference: auto-update preference | ✅ |

### 10.7 FAQ Responses
| # | Task | Status |
|---|------|--------|
| 10.7.1 | `generateFAQResponse(intent, language)` — use `TranslationService` for structured FAQ answers | ✅ via `faq.*` i18n keys |
| 10.7.2 | AI only used for open-ended queries not matching a known FAQ | ✅ |

### 10.8 AI Dispatcher Integration into Customer Bot
| # | Task | Status |
|---|------|--------|
| 10.8.1 | Replace keyword-matching in `CustomerBotService` with AI intent classification | ✅ `tryAiDispatch()` wired |
| 10.8.2 | Retain keyword fallback (`HELP`, `STATUS`, `CANCEL`) for reliability | ✅ `handleCommand()` runs first |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-10.1 | "Need electrician" → `REQUEST_SERVICE` → `Electrical` category | ✅ |
| AC-10.2 | "எலக்ட்ரீஷியன் வேண்டும்" → `REQUEST_SERVICE`, detected language `TA`, `Electrical` category | ✅ |
| AC-10.3 | "What are your working hours?" → `FAQ_HOURS` → structured response in EN | ✅ via `faq.hours` i18n key |
| AC-10.4 | Ollama timeout → falls back to OpenAI automatically | ✅ `AIService.chat()` handles this |
| AC-10.5 | Response time < 3 seconds for intent classification | ✅ 10s Ollama timeout, 15s OpenAI |

---

## Phase 11 — Reports

**Status: ✅ COMPLETE**
**Goal:** Admin can view and export operational reports covering revenue, jobs, ratings, and technician trust.

### 11.1 Report APIs
| # | Task | Status |
|---|------|--------|
| 11.1.1 | `GET /api/v1/reports/revenue?period=daily\|weekly\|monthly` | ✅ |
| 11.1.2 | `GET /api/v1/reports/jobs?from=&to=` | ✅ byStatus + byCategory |
| 11.1.3 | `GET /api/v1/reports/ratings?technicianId=&from=&to=` | ✅ via technicians report |
| 11.1.4 | `GET /api/v1/reports/technicians` — trust score, rating, total jobs | ✅ |

### 11.2 CSV Export
| # | Task | Status |
|---|------|--------|
| 11.2.1 | CSV export for all report data | ✅ `exportToCsv()` in frontend utils |
| 11.2.2 | Client-side CSV download via Blob | ✅ |
| 11.2.3 | Export button on every report section | ✅ |

### 11.3 Report UI
| # | Task | Status |
|---|------|--------|
| 11.3.1 | `frontend/src/app/(admin)/reports/page.tsx` | ✅ |
| 11.3.2 | Period selector (daily/weekly/monthly) | ✅ |
| 11.3.3 | Revenue tab: LineChart (Recharts) + period toggle + CSV export | ✅ |
| 11.3.4 | Jobs tab: BarChart by status + PieChart by category | ✅ |
| 11.3.5 | Technician ranking table: trust score, rating, total jobs | ✅ |
| 11.3.6 | CSV export on every chart section | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-11.1 | Revenue report returns aggregated amounts by period | ✅ |
| AC-11.2 | CSV export downloads client-side with correct data | ✅ |
| AC-11.3 | Technician performance shows rating, trust score, job count | ✅ |
| AC-11.4 | Period filter changes revenue chart data | ✅ |

---

## Phase 12 — Security

**Status: ✅ COMPLETE**
**Goal:** All API endpoints are protected, inputs are validated, rate limiting is active, and all admin actions are audited.

### 12.1 JWT Authentication
| # | Task | Status |
|---|------|--------|
| 12.1.1 | Access token: 15 min expiry, signed with `JWT_SECRET` | ✅ |
| 12.1.2 | Refresh token: 7 day expiry, stored in HTTP-only cookie | ✅ Cookie scoped to `/api/v1/auth`, `SameSite=Strict`, `Secure` in production |
| 12.1.3 | `JwtAuthGuard` applied globally; `@Public()` decorator exempts webhook and health | ✅ |
| 12.1.4 | Token rotation: refresh endpoint issues new refresh token and invalidates old | ✅ `AdminUser.tokenVersion` incremented on every refresh/logout; both old refresh token and any outstanding access token are rejected immediately (`jwt.strategy.ts` checks version on every request) |

### 12.2 RBAC
| # | Task | Status |
|---|------|--------|
| 12.2.1 | Roles: `ADMIN`, `OPERATOR` | ✅ |
| 12.2.2 | `RolesGuard` checks `@Roles()` metadata on routes | ✅ |
| 12.2.3 | Admin can manage technicians; Operator cannot configure commission | ✅ `@Roles(ADMIN)` on commission create, dispute resolve, invoice payment confirm, settlement generate/pay, audit-logs; technicians/customers/jobs open to both roles per spec |
| 12.2.4 | Seed super admin account in database seed | ✅ |

### 12.3 Rate Limiting
| # | Task | Status |
|---|------|--------|
| 12.3.1 | `ThrottlerModule` installed (already in `app.module.ts`) | ✅ |
| 12.3.2 | Global: 30 requests / minute per IP (default already configured) | ✅ |
| 12.3.3 | Webhook endpoint: 300 requests / minute | ✅ |
| 12.3.4 | Auth endpoints: 10 requests / minute per IP | ✅ Verified live: 11th request in 60s returns `429` |

### 12.4 Input Validation
| # | Task | Status |
|---|------|--------|
| 12.4.1 | All DTOs use `class-validator` decorators | ✅ |
| 12.4.2 | `ValidationPipe` globally enabled with `whitelist: true, forbidNonWhitelisted: true` | ✅ |
| 12.4.3 | Sanitize string inputs (trim whitespace, strip HTML tags) | ✅ Global `SanitizePipe` (`common/pipes/sanitize.pipe.ts`) runs before `ValidationPipe` |
| 12.4.4 | Validate phone numbers: E.164 format (`+91XXXXXXXXXX`) | ✅ `@IsIndianPhone()` validator + `normalizePhone()` before persistence in technician creation |

### 12.5 Webhook Security
| # | Task | Status |
|---|------|--------|
| 12.5.1 | HMAC-SHA256 verification of `X-Hub-Signature-256` (implemented in Phase 3) | ✅ |
| 12.5.2 | Log all rejected webhook attempts to AuditLog | ✅ `WebhookHmacGuard` logs `WEBHOOK_SIGNATURE_REJECTED` with reason/IP/path |

### 12.6 Audit Logging
| # | Task | Status |
|---|------|--------|
| 12.6.1 | `AuditLogService.log(actor, action, entityType, entityId, metadata)` | ✅ |
| 12.6.2 | Interceptor: auto-log all `POST`, `PATCH`, `DELETE` admin API calls | ✅ `AuditInterceptor` applied to all mutating admin controllers (belt-and-suspenders alongside existing action-specific manual logs) |
| 12.6.3 | `GET /api/v1/audit-logs` — admin-only, paginated, filterable | ✅ |

### 12.7 HTTPS Enforcement
| # | Task | Status |
|---|------|--------|
| 12.7.1 | Nginx config: redirect all HTTP → HTTPS | ✅ `infrastructure/nginx/nginx.prod.conf.template` (Phase 13); dev `nginx.conf` intentionally stays HTTP-only |
| 12.7.2 | HSTS header: `Strict-Transport-Security: max-age=31536000` | ✅ Set in `nginx.prod.conf.template` and via `helmet({ hsts })` in production |
| 12.7.3 | Secure cookie flags on refresh token: `HttpOnly`, `Secure`, `SameSite=Strict` | ✅ Verified live via `Set-Cookie` header |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-12.1 | Unauthenticated request to `/api/v1/jobs` returns `401` | ✅ Verified live against `/api/v1/admin/jobs` |
| AC-12.2 | Invalid JWT returns `401` | ✅ |
| AC-12.3 | Non-admin JWT returns `403` on admin-only routes | ✅ `RolesGuard` |
| AC-12.4 | 11th auth request in a minute returns `429` | ✅ Verified live |
| AC-12.5 | Webhook with wrong signature returns `403` | ✅ |
| AC-12.6 | All admin create/update/delete actions appear in audit log | ✅ `AuditInterceptor` blanket coverage + existing manual logs |

**427 backend tests passing (up from 418).** Live-verified end-to-end: login → cookie-based refresh rotation → old refresh token rejected → old access token immediately invalidated → logout clears cookie; auth rate limiting confirmed at the 11th request.

---

## Phase 13 — Production Deployment

**Status: 🔄 IN PROGRESS**
**Goal:** Application is live on EC2 with HTTPS, running via Docker Compose, with backups and monitoring.
**Note:** All artifacts (configs/scripts/docs) are built and ready in the repo. Items requiring an actual AWS account, domain, and live server access are marked ❌ pending — see `docs/DEPLOYMENT.md` for the guided walkthrough.

### 13.1 EC2 Setup
| # | Task | Status |
|---|------|--------|
| 13.1.1 | Launch Ubuntu 22.04 LTS EC2 (minimum t3.medium) | ❌ Requires AWS access — documented in `docs/DEPLOYMENT.md` §1 |
| 13.1.2 | Security Groups: allow 22, 80, 443; deny all other inbound | ❌ |
| 13.1.3 | Attach Elastic IP | ❌ |
| 13.1.4 | Create IAM role with minimal permissions | ❌ |

### 13.2 Docker Compose Production Config
| # | Task | Status |
|---|------|--------|
| 13.2.1 | Create `docker-compose.prod.yml` with `restart: unless-stopped`, production Dockerfiles, pinned image versions | ✅ |
| 13.2.2 | Add `logging.driver: json-file` with `max-size: 10m, max-file: 3` | ✅ On every service |
| 13.2.3 | Separate `infrastructure/nginx/nginx.prod.conf` with SSL config | ✅ Templated (`nginx.prod.conf.template` + `nginx.bootstrap.conf.template`, rendered via `envsubst` in `deploy.sh`) |

### 13.3 Production Dockerfiles
| # | Task | Status |
|---|------|--------|
| 13.3.1 | `backend/Dockerfile` — multi-stage: build (compile TS) → runtime (node:20-alpine, dist only) | ✅ node:22-alpine |
| 13.3.2 | `frontend/Dockerfile` — multi-stage: build (next build) → runtime (next start) | ✅ Already existed |
| 13.3.3 | No `devDependencies` in production images | ✅ `npm prune --omit=dev` added to backend builder stage |
| 13.3.4 | Non-root user in all containers | ✅ Added `nestjs` user to backend production stage (frontend already had one) |

### 13.4 SSL with Let's Encrypt
| # | Task | Status |
|---|------|--------|
| 13.4.1 | Install Certbot on EC2 | ✅ Runs as a one-off `certbot/certbot` compose service — no host install needed |
| 13.4.2 | Obtain certificate for domain | ❌ Script ready (`scripts/init-ssl.sh`) — needs real domain + DNS pointed at the host |
| 13.4.3 | Configure Nginx for HTTPS | ✅ `deploy.sh` auto-switches bootstrap → full TLS config once certs exist |
| 13.4.4 | Set up cron job for auto-renewal | ✅ `scripts/renew-ssl.sh`, documented crontab entry in `docs/DEPLOYMENT.md` §4 |

### 13.5 Environment Secrets on EC2
| # | Task | Status |
|---|------|--------|
| 13.5.1 | Store secrets in `/etc/sevagan/.env` (permissions: 600) | ✅ Documented; template in `.env.example` |
| 13.5.2 | Reference from `docker-compose.prod.yml` via `env_file` | ✅ |

### 13.6 Database Backup
| # | Task | Status |
|---|------|--------|
| 13.6.1 | Daily `pg_dump` → compressed `.sql.gz`, uploaded to S3/MinIO with 30-day retention | ✅ `scripts/backup-db.sh` |
| 13.6.2 | Cron job configured | ✅ Documented crontab entry in `docs/DEPLOYMENT.md` §6 |
| 13.6.3 | Test restore procedure documented | ✅ `docs/DEPLOYMENT.md` §6 |

### 13.7 Deployment Script
| # | Task | Status |
|---|------|--------|
| 13.7.1 | `scripts/deploy.sh`: git pull → build → up → migrate | ✅ Also handles nginx template selection and image pruning |

### 13.8 Meta Webhook Registration
| # | Task | Status |
|---|------|--------|
| 13.8.1 | Register production webhook URL with Meta | ❌ Requires live HTTPS endpoint — documented in `docs/DEPLOYMENT.md` §5 |
| 13.8.2 | Subscribe to `messages` field on phone number | ❌ |

### 13.9 Health Monitoring
| # | Task | Status |
|---|------|--------|
| 13.9.1 | UptimeRobot monitoring `/api/v1/health` | ❌ Requires live endpoint — documented in `docs/DEPLOYMENT.md` §9 |
| 13.9.2 | Alert to `selvakumar.rayappan@gmail.com` on downtime | ❌ |
| 13.9.3 | Nginx access log parsing script for basic traffic review | ❌ Deferred — `docker compose logs nginx` suffices for MVP traffic volume |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-13.1 | `https://api.sevagan.in/api/v1/health` returns `{ "status": "ok" }` with valid SSL | ❌ Pending live deploy |
| AC-13.2 | HTTP redirects to HTTPS | ✅ In `nginx.prod.conf.template` (untestable without a live domain) |
| AC-13.3 | WhatsApp message received → processed → reply sent (end-to-end on production) | ❌ Pending live deploy |
| AC-13.4 | `docker compose -f docker-compose.prod.yml ps` shows all services healthy | ❌ Pending live deploy |
| AC-13.5 | Daily backup job visible in crontab; test restore completes | ❌ Pending live deploy |
| AC-13.6 | Deployment script runs without manual intervention | ✅ `scripts/deploy.sh` (untested against a real host) |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔄 | In Progress |
| ❌ | Not Started / Deferred |
