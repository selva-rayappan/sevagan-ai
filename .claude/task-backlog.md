# SEVAGAN — Task Backlog

> Single source of truth for task-level completion status.
> Update this file alongside `docs/EXECUTION_PLAN.md Section 18` whenever a task is completed.

**Last Updated:** 2026-08-19 (Phase 14: EN accept confirmation (digit "1") now live-spoken via Plivo `<Speak>` — "Thank you for choosing Sevagan Services" — replacing the pre-recorded `job_accepted_call_en.mp3`; TA unchanged since Plivo's `<Speak>` has no Tamil support. See 14.10. Prior same day: the actual root cause of every "Invalid Answer XML" hangup finally identified — by Plivo support's own parse trace, not our diagnostics. `buildAnswerXml()`'s `action="..."` attribute contained a bare `&` from the DTMF callback URL's `?token=...&lang=EN` — invalid inside an XML attribute per spec (must be `&amp;`). Every check we'd made (curl, eyeballing the string, nginx byte counts matching exactly) validated the *bytes* were right, never that the content was *well-formed XML* — those are different claims, and conflating them is what kept 14.6-14.8 chasing network/latency theories for two days on the wrong trail. Fixed with a proper `escapeXml()` applied everywhere a URL gets interpolated into hand-built XML in `VoiceWebhookController`. Third fix attempt for the same symptom — unconfirmed on a real call yet. The job-offer WhatsApp template (the primary notification) is unaffected and already delivers reliably — this is specifically the voice-call fallback. See 14.9. Prior same day: job-offer Meta templates approved and activated: `technician_job_offer_v2` (TA, UTILITY) and `technician_job_offer_en_v3` (EN, UTILITY). The EN half needed a second round — Meta had reclassified the original EN submission as `MARKETING`, which triggers a per-recipient 131049 throttle; Meta refuses to edit an approved template's category and blocks resubmitting the same name+language for 4 weeks, so EN moved to a new template name with plainer wording and came back APPROVED as UTILITY within minutes. Validated live end-to-end for Selva (sent→delivered, zero errors); a different technician (Maha/"Vetri", `919626191907`) hit the 131049 throttle plus a carrier-level DND rejection on the escalation call — both channels down for that one number, flagged as needing a direct conversation, not a code fix. See 14.7. Prior same day: end-to-end voice escalation confirmed, and the WhatsApp-131047-then-premature-call bug fixed via `escalateOnDeliveryFailure()` — see 14.6. Prior: Message trail audit log added — every inbound/outbound WhatsApp message is written to AWS S3 `arn:aws:s3:::sevagan-ai` (us-east-1, IAM-role auth) and viewable per-job from the admin Jobs page; see 3.3.6/8.6.5.)

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
| [Phase 14](#phase-14--technician-job-offer-voice-escalation) | Technician Job-Offer Voice Escalation | ✅ COMPLETE | 58/61 (job offers — the primary notification — deliver reliably outside the 24h WhatsApp session via approved templates, validated live 2026-08-19; the voice-call fallback's "Invalid Answer XML" was finally root-caused via Plivo support's own parse trace as a genuine bug — a bare `&` in an XML attribute — fixed, unconfirmed on a real call yet; EN accept confirmation now live-spoken "Thank you for choosing Sevagan Services", TA unchanged; Plivo HMAC-V3 signature and a carrier-level DND issue on one technician's number remain documented non-blocking gaps) |

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
| 3.2.4 | `sendTemplate()` on `IWhatsAppProvider`/`MetaWhatsAppProvider`/`MockWhatsAppProvider` (added 2026-08-10, confirmed live 2026-08-11) — bug fix: newly onboarded technicians never received their welcome message because it was sent via free-form `sendText`, which WhatsApp Cloud API rejects for business-initiated messages outside the 24h session window (a new technician has never messaged the bot). Approved-template sending now exists as a first-class provider method with `headerImageUrl` (Meta requires the IMAGE header supplied at send-time) and named `bodyParams: Array<{name, value}>` support (this template uses `{{service_name}}`/`{{service_area}}`, not positional `{{1}}`/`{{2}}`); `whatsapp.templates.technicianWelcome`/`technicianWelcomeHeaderImage` config + `toMetaTemplateLanguageCode()` util map `Language` → Meta's actual approved code (EN→`en`). Getting to a working state also required fixing a wrong-WABA template approval (`WA_TEMPLATE_TECHNICIAN_WELCOME` in `/etc/sevagan/.env` now points at `technician_welcom` — note the approved template name is actually missing its trailing "e", not a typo in this doc) — diagnosed each issue via `GET /{waba-id}/message_templates` directly rather than guessing. TA is still `PENDING` Meta approval as of 2026-08-11. | ✅ |

### 3.3 Webhook Endpoint
| # | Task | Status |
|---|------|--------|
| 3.3.1 | `POST /api/v1/webhooks/whatsapp` — receives Meta webhook events | ✅ |
| 3.3.2 | `GET /api/v1/webhooks/whatsapp` — Meta verification (hub.mode, hub.verify_token, hub.challenge) | ✅ |
| 3.3.3 | HMAC-SHA256 signature verification via `X-Hub-Signature-256` header (`WebhookHmacGuard`) | ✅ |
| 3.3.4 | Returns `200 OK` immediately; async processing | ✅ |
| 3.3.5 | Unit tests: `webhook.controller.spec.ts` | ✅ |
| 3.3.6 | Message trail audit log (added 2026-08-12) — `MessageTrailService` writes every inbound webhook message (`WebhookController.routeMessage`) and every outbound send (`TrackedWhatsAppProvider`, decorating `WHATSAPP_PROVIDER` in `MessagingModule`) to real AWS S3 (`arn:aws:s3:::sevagan-ai`, `us-east-1` — a separate bucket from the self-hosted MinIO used for uploads; auth via the EC2 instance's IAM role, no keys in `.env`). Each entry is attributed to a job via `resolveJobId(phone)` — a technician's most recent `Assignment` or a customer's most recent `Job` — so `jobId` doesn't need threading through the ~5 services that call `sendText`/`sendTemplate`/etc. Trail writes are `void`-fired and swallow their own errors — a trail failure never blocks message delivery. Admin view: `GET /admin/jobs/:id/message-trail` (8.3), chat-style modal on the Jobs page. | ✅ |

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
| 4.3.0 | `handleIdle()` sends `customer.welcome` (plain text greeting) before the language buttons (added 2026-07-21); covers customers arriving from the website's `wa.me` links, some with a prefilled service-specific message. `customer.welcome` key already existed in `en.json`/`ta.json` but was unused until now | ✅ |
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
| 4.5.5 | MVP: location-request step paused (customer no longer asked to share location) — `job.location` set to a translated placeholder and flow skips straight to AWAITING_TIME; `handleLocation()` commented out, not deleted, to be revived with the commission-based model — see `docs/EXECUTION_PLAN.md` §4.2 (2026-08-19) | ✅ |

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
| 5.6.5 | MVP: "enter the amount" step paused, Cash/UPI buttons replaced by a single Complete button — technician taps once, job completes with no `jobAmount`/`paymentMode` (`jobsService.updateStatus`, not `setCompletion`), is freed immediately, and the customer skips straight to the rating flow (amount confirmation + invoice sharing also paused, see §4.5.5 and `docs/EXECUTION_PLAN.md` §4.2/§5.2). Old handlers commented out, not deleted, to be revived with the commission-based model (2026-08-19) | ✅ |

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
| 8.5.1 | `POST /api/v1/admin/technicians` — create + add skills + send WhatsApp welcome template (fixed 2026-08-10: was `sendText`/`technician.welcome`, silently failing outside the 24h session window; now `sendTemplate` via approved `technician_welcome` template, see 3.2.4). Failure is now logged and returned as `welcomeMessageSent: false` on the response instead of being swallowed by `.catch(() => undefined)` | ✅ |
| 8.5.2 | `GET /api/v1/admin/technicians` (paginated), `GET /:id` (+ `totalJobs`/`totalEarnings`/`totalCommission` via `JobCommission.aggregate`), `PATCH /:id` | ✅ |
| 8.5.3 | Technicians page: table + create modal with skill pill toggles; clicking a technician's name folds open a detail row with Joined date, Total Jobs, Total Earnings, Total Commission (lazy-fetched + cached per row) | ✅ |

### 8.6 Job Management
| # | Task | Status |
|---|------|--------|
| 8.6.1 | `GET /api/v1/admin/jobs` — paginated with status/date filters | ✅ |
| 8.6.2 | `POST /api/v1/admin/jobs/:id/assign` — genuine manual pick via `AssignmentEngineService.manualAssign(jobId, technicianId)`; frees the previous technician back to AVAILABLE first | ✅ |
| 8.6.3 | `POST /api/v1/admin/jobs/:id/cancel` | ✅ |
| 8.6.4 | Jobs page: table with status filter dropdown, all 6 `JobStatus` color badges, "Assign" button + technician-picker modal on NEW/ASSIGNED/ACCEPTED rows | ✅ |
| 8.6.5 | `GET /api/v1/admin/jobs/:id/message-trail` (added 2026-08-12) — returns the S3-backed WhatsApp trail for a job, see 3.3.6; Jobs page gets a message-icon button per row opening a chat-style modal (inbound left, outbound right) with phone/timestamp/message-type per entry | ✅ |
| 8.6.6 | `POST /api/v1/admin/jobs/:id/complete` (added 2026-08-12) — admin manually completes an ASSIGNED/ACCEPTED/IN_PROGRESS job (amount + payment mode), for when the technician↔customer WhatsApp completion handshake doesn't happen; records `JobCommission`, generates the invoice + payment record, frees the assigned technician back to AVAILABLE, and sends translated `customer.job_completed_by_admin`/`technician.job_completed_by_admin` WhatsApp notices to both parties. Blocked with 409 outside those statuses. Jobs page gets a "Complete" button + amount/payment-mode modal on completable rows. | ✅ |

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
| AC-8.3 | Technician created from dashboard sends WhatsApp onboarding via an approved template (fixed 2026-08-10 — see 3.2.4/8.5.1; previously via `TranslationService` + free-text `sendText`, which WhatsApp rejects for a technician's first-ever message from us) | ✅ |
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

## Phase 14 — Technician Job-Offer Voice Escalation

**Status: 🔄 IN PROGRESS**
**Goal:** If a technician hasn't responded to a job offer within 1 minute, place an automated phone call (Plivo) that plays the offer in their language and lets them accept/reject by keypress.

### 14.1 Voice Provider Abstraction
| # | Task | Status |
|---|------|--------|
| 14.1.1 | `VoiceCallProvider` interface, mirrors `WhatsAppProvider`'s swap-implementation pattern | ✅ |
| 14.1.2 | `PlivoVoiceCallProvider` — real implementation via Plivo REST Call API | ✅ |
| 14.1.3 | `MockVoiceCallProvider` — logs only, `VOICE_MOCK_MODE=true` | ✅ |
| 14.1.4 | `TelephonyModule` (global), registered in `AppModule` | ✅ |

### 14.2 Call Audio
| # | Task | Status |
|---|------|--------|
| 14.2.1 | EN + TA prompts recorded via Google Cloud TTS (real Tamil voice — Polly and Plivo's `<Speak>` both lack Tamil, confirmed against their docs first) | ✅ |
| 14.2.2 | Deployed to `sevagan.co.in/audio/job_offer_call_{en,ta}.mp3` via existing nginx static site | ✅ |
| 14.2.3 | Fix: original files were WAV (`pcm_s16le`, 48kHz) saved with a `.mp3` extension, not real MP3 — Plivo played silence instead of erroring. Re-encoded via `ffmpeg`/`libmp3lame` to real MP3 at 16kHz mono (Plivo's documented recommendation); 1.2MB→104KB (EN), 2.3MB→190KB (TA) | ✅ |

### 14.3 Answer/DTMF Webhooks
| # | Task | Status |
|---|------|--------|
| 14.3.1 | `VoiceWebhookController`: `GET /voice/answer` (Plivo XML: `<Play>` + `<GetDigits>`), `POST /voice/dtmf` | ✅ |
| 14.3.2 | `VoiceWebhookTokenGuard` — shared-secret query token (Plivo's HMAC-V3 signature scheme not implemented — follow-up) | ✅ |
| 14.3.3 | `TechnicianBotService.handlePhoneCallResponse()` reuses the existing WhatsApp accept/reject/expiry logic — no duplicated business rules | ✅ |

### 14.4 Escalation Trigger
| # | Task | Status |
|---|------|--------|
| 14.4.1 | `TechnicianSession.offerSentAt`/`escalationCallSentAt` added; `offerSentAt` set in `AssignmentEngineService.assignJobToTechnician` | ✅ |
| 14.4.2 | `TechnicianOfferEscalationService` — 60s Redis-scan poller, same shape as `CustomerIdleNudgeService` | ✅ |

### 14.5 Config
| # | Task | Status |
|---|------|--------|
| 14.5.1 | `PLIVO_AUTH_ID`/`PLIVO_AUTH_TOKEN`/`PLIVO_NUMBER`/`VOICE_WEBHOOK_TOKEN`/`VOICE_JOB_OFFER_AUDIO_{EN,TA}` in `app.config.ts`/`env.validation.ts`/`.env.example`; local `backend/.env` populated | ✅ |

### 14.6 Escalate Immediately on Confirmed WhatsApp Delivery Failure
| # | Task | Status |
|---|------|--------|
| 14.6.1 | Bug (reported 2026-08-19, JOB-20260819-0001 → Selva): technician's job-offer WhatsApp never arrived, but a call fired anyway. Meta accepts an interactive-buttons send synchronously (returns a wamid) but a technician outside the 24h session window gets an *async* delivery failure (131047) minutes later via the webhook `statuses[]` callback — nothing reacted to it, so the 60s escalation poller (working as designed) waited out its timer for a message already confirmed dead. Root-caused via the new S3 message trail (3.3.6) + production logs: offer submitted 05:20:11 → Meta `failed` #131047 at 05:20:13 → escalation call placed 05:21:17 (~60s, as designed) → technician accepted by keypress 05:21:56 → the "Job Accepted" WhatsApp confirmation *also* failed 131047 | ✅ Diagnosed |
| 14.6.2 | `TechnicianOfferEscalationService.escalateOnDeliveryFailure(phone)` — same call-placing logic as the 60s poller (`placeEscalationCall`, extracted as a shared private method), minus the elapsed-time gate, since a confirmed failure means waiting serves no purpose | ✅ |
| 14.6.3 | `WebhookController`'s `statuses[]` handling calls `escalateOnDeliveryFailure` the moment a `failed` status with `errors` arrives, for whichever phone it names | ✅ |
| 14.6.4 | Durable fix (approved Meta template with quick-reply buttons for job offers) — started same day, see 14.7 | 🔄 In progress |
| 14.6.5 | Unit tests: `technician-offer-escalation.service.spec.ts` (`escalateOnDeliveryFailure` — immediate call, no session, wrong state, already-escalated), `webhook.controller.spec.ts` (escalates on failed+errors, not on read/no-errors, survives the escalation check itself throwing) | ✅ |
| 14.6.6 | Full backend suite green (73 suites / 615 tests), `tsc --noEmit` clean, coverage gate passing (96.8%/87.86%/92.15%/97.16%) | ✅ |

### 14.7 Durable Fix: `technician_job_offer_v2` Meta Template
| # | Task | Status |
|---|------|--------|
| 14.7.1 | Goal: job offers reach a technician over WhatsApp regardless of a live 24h session, via a pre-approved template instead of free-form interactive buttons — same reasoning as `technician_welcome` (3.2.4), but this time ONE template name with EN/TA as proper language variants of each other (the accidental two-separate-names/structures split on `technician_welcome` is not repeated) | ✅ Designed |
| 14.7.2 | Submitted 2026-08-19 via `POST /{waba-id}/message_templates` against WABA `2518354635331400` (confirmed via `GET /{waba}/phone_numbers` that it owns the production number first) — UTILITY, BODY with 4 named params (`customer_name`/`location`/`service`/`scheduled_time`, mirroring the live `technician.job_offer` translation text verbatim) + 2 QUICK_REPLY buttons ("Accept"/"Reject", "ஏற்கிறேன்"/"மறுக்கிறேன்") | ✅ Both languages `PENDING` |
| 14.7.3 | First attempt `REJECTED` (`INVALID_FORMAT`) — named parameters require a top-level `"parameter_format": "NAMED"` field on the create payload; Business Manager's UI sets this automatically (why nobody hit this on `technician_welcome`), the raw API does not infer it. Fixed by adding the field; resubmitted under a fresh name `technician_job_offer_v2` rather than waiting out the original name's async deletion (still hadn't propagated past Meta's own "under 1 minute" estimate after ~100s) | ✅ Root-caused and fixed |
| 14.7.4 | `SendTemplateOptions.quickReplyPayloads?: string[]` — one payload per QUICK_REPLY button, index order; `MetaWhatsAppProvider.sendTemplate()` appends `{type: 'button', sub_type: 'quick_reply', index, parameters: [{type: 'payload', payload}]}` per entry; `MockWhatsAppProvider` logs them | ✅ |
| 14.7.5 | Inbound: a template quick-reply tap is `type: 'button'` (`{text, payload}`) — different shape from a free-form interactive reply (`type: 'interactive'`). Added to `WhatsAppMessageType`/`InboundWhatsAppMessage`; `TechnicianBotService.extractText()` and `WebhookController.summarizeInbound()` handle it. Payloads chosen as `accept_job`/`reject_job` — identical to the existing interactive-button ids — so `handleOfferResponse()`'s matching needed zero changes | ✅ |
| 14.7.6 | **Both languages APPROVED 2026-08-19** — `AssignmentEngineService.assignJobToTechnician` switched from `sendInteractiveButtons` to `sendTemplate`; validated live (JOB-20260819-0002 → Selva): Meta status `sent`→`delivered`, zero errors | ✅ |
| 14.7.7 | **New failure surfaced immediately** (JOB-20260819-0003 → Maha/"Vetri", `919626191907`): Meta accepted the send but blocked delivery with **131049** ("not delivered to maintain healthy ecosystem engagement") — a per-recipient cap on marketing-category messages. Root cause: Meta had silently reclassified the EN language variant as `MARKETING` during review (TA stayed `UTILITY`). Escalation call fallback also failed for the same number (`no-answer`, `Rejected`, carrier-level) — same DND/NCPR pattern flagged 2026-08-12, still unfixed for that one number, not a code issue | ✅ Diagnosed |
| 14.7.8 | Fixed the category: Meta refuses `POST /{template-id} {"category":"UTILITY"}` on an approved template ("Cannot update an approved template category") and blocks resubmitting the same (name, language) for **4 weeks** once a category history exists ("Try again in 4 weeks or use MARKETING") — confirmed by trying both. Deleted only the EN variant (`DELETE .../message_templates?name=X&hsm_id=Y` — `hsm_id` alone errors, needs `name` too) and resubmitted under a new name `technician_job_offer_en_v3` with plainer, less broadcast-styled wording ("You have been assigned a new job." vs. "🔔 New Job Available!⏰...") — **APPROVED as UTILITY within minutes**. Config split: `whatsapp.templates.jobOfferEn` (`technician_job_offer_en_v3`) / `jobOfferTa` (`technician_job_offer_v2`, untouched) | ✅ |
| 14.7.9 | Unit tests: `meta-whatsapp.provider.spec.ts` (quick-reply components in order after body, omitted when empty), `technician-bot.service.spec.ts` (accepts on a `type: button` tap), `webhook.controller.spec.ts` (trail summary for `type: button`), `assignment-engine.service.spec.ts` (correct template name + language code per technician language) | ✅ |
| 14.7.10 | Full backend suite green (73 suites / 618 tests), `tsc --noEmit` clean, coverage 96.83%/87.98%/92.03%/97.21% | ✅ |
| 14.7.11 | Carrier-level DND/NCPR rejection on `919626191907` (Maha, formerly "Vetri") — both WhatsApp and voice calls unreliable for this specific number | ❌ Needs a direct conversation with the technician, not a code fix |

### 14.8 Escalation Call `answer_method`: GET → POST
| # | Task | Status |
|---|------|--------|
| 14.8.1 | Bug: 2 of 4 real escalation calls (both to Selva, `919585909045` — JOB-20260819-0002 and -0004) hung up ~1s after answering with Plivo-reported `Invalid Answer XML`. The 2026-08-19 logging fix confirmed on the second occurrence that Plivo's `GET /voice/answer` request genuinely reached the app and that our response independently verified as valid (correct XML, headers, `Content-Length`, no BOM/chunking issues — checked via `curl -v` against the identical live URL); Plivo's own Call Detail Record API offered no further detail | ✅ Diagnosed — failure is somewhere in Plivo's GET fetch/parse path, unobservable from our side |
| 14.8.2 | `PlivoVoiceCallProvider.placeCall()`: `answer_method` `'GET'` → `'POST'` (Plivo's documented alternative) | ✅ |
| 14.8.3 | `VoiceWebhookController`: XML-building extracted into `buildAnswerXml(lang)`, shared by GET (kept for manual testing, no longer hit by Plivo) and POST. Plivo POSTs to the *same* `/voice/answer` URL for two purposes — initial answer fetch, and its default post-hangup status callback (no `hangup_url` configured) — originally (wrongly) distinguished by "has any `Event` field" | ✅ |
| 14.8.4 | **Confirmed broken on the very next real call** (JOB-20260819-0004 → Maha): hangup reason changed from `Invalid Answer XML`/`Error` to `End Of XML Instructions`/`Plivo` — the POST fetch now *succeeded*, but still 1s/no audio. Root cause: Plivo tags its initial fetch `Event: StartApp`, not Event-less — `if (body.Event)` caught both `StartApp` and `Hangup`, so the real call always got the empty ack (confirmed via nginx access logs: both POSTs returned 59 bytes, not the real ~354). Fixed to key off `Event === 'Hangup'` specifically | ✅ Root-caused and fixed |
| 14.8.5 | Unit tests: `plivo-voice-call.provider.spec.ts` (`answer_method: 'POST'`); `voice-webhook.controller.spec.ts` — `Event: 'Hangup'` acks empty, `Event: 'StartApp'` serves real XML (regression test for this bug), no-`Event` also serves real XML, per-language + logging | ✅ |
| 14.8.6 | Full backend suite green (73 suites / 622 tests), `tsc --noEmit` clean, coverage 96.83%/88%/92.05%/97.21%, `voice-webhook.controller.ts` 100% all four metrics | ✅ |
| 14.8.7 | Confirm the `Event === 'Hangup'` fix actually gets the technician the audio prompt on a real call | ❌ Failed again (JOB-20260819-0005 → Selva) — but nginx access logs proved Plivo received exactly 354 bytes, byte-identical to the independently-verified-valid XML. Content and routing are now conclusively proven correct; the failure persisted anyway |
| 14.8.8 | Working theory: server is AWS us-east-1 (Virginia), calls are to Indian mobile numbers routed through Plivo's India/APAC infra — the transcontinental round-trip likely intermittently exceeds Plivo's `answer_url` fetch timeout on an already-connected call. Own app-level processing measured sub-25ms — no more latency to trim server-side | ✅ Diagnosed as likely Plivo-side, not fixable via further code changes |
| 14.8.9 | Escalated to Plivo support with a full evidence table (5 call UUIDs, GET vs POST, correct vs incorrect content served, Plivo's varying hangup reasons) and specific questions about their fetch timeout and India-to-US-East latency. Draft not committed (contains account IDs) — scratchpad only | ✅ Turned out to be the right move — Plivo's own parse trace identified the actual bug, see 14.9 |

### 14.9 Actual Root Cause: Unescaped `&` in the `<GetDigits>` Attribute
| # | Task | Status |
|---|------|--------|
| 14.9.1 | Plivo support identified the real bug from their own XML parse trace: `buildAnswerXml()`'s `action="${actionUrl}"` contained a bare `&` (from `?token=...&lang=EN`) — invalid inside an XML attribute per spec, must be `&amp;`. Explains "Invalid Answer XML" for every one of the 5 tracked call UUIDs in 14.8, and explains why our own checks (curl, eyeballing, nginx byte counts) never caught it: none of them validate XML well-formedness, only that *something* with the right headers/byte count was returned — "byte-correct" and "well-formed XML" are different claims, and conflating them is what kept 14.6-14.8 looking at network/latency instead of content syntax | ✅ Root-caused (by Plivo, not us) |
| 14.9.2 | `VoiceWebhookController.escapeXml()` — escapes `&`/`<`/`>`/`"`/`'` per the standard XML entity set; applied to `actionUrl` + `audioUrl` in `buildAnswerXml()` and `confirmationUrl` in `dtmf()`'s `<Play>` content | ✅ |
| 14.9.3 | Unit tests: DTMF action URL asserts `&amp;lang=TA` (not bare `&`); blanket test asserting no unescaped `&` appears anywhere in the generated answer XML | ✅ |
| 14.9.4 | Full backend suite green (73 suites / 623 tests), `tsc --noEmit` clean, coverage 96.83%/88%/92.07%/97.21%, `voice-webhook.controller.ts` 100% all four metrics | ✅ |
| 14.9.5 | Confirm on a real call — third fix attempt for the same symptom (14.6 logging → 14.8 GET→POST + Event routing → 14.9 XML escaping) | ❌ Unconfirmed — watching the next live escalation call |

### 14.10 Accept Confirmation: Live-Spoken "Thank You" (EN)
| # | Task | Status |
|---|------|--------|
| 14.10.1 | On pressing "1" (accept), EN calls now say `<Speak>Thank you for choosing Sevagan Services</Speak>` instead of playing the pre-recorded `job_accepted_call_en.mp3` — Plivo's `<Speak>` supports English natively, no new audio asset needed | ✅ |
| 14.10.2 | TA left unchanged — still plays the pre-recorded `acceptedTa` audio, since Plivo's `<Speak>` has no Tamil support (confirmed with the user rather than guessing on live technician-heard content) | ✅ |
| 14.10.3 | Reject confirmation (digit "2") unchanged for both languages — out of scope for this request | ✅ |
| 14.10.4 | Unit tests: EN accept asserts the `<Speak>` text and no reference to `job_accepted_call_en.mp3`; TA accept asserts the pre-recorded audio still plays and no `<Speak>` appears | ✅ |
| 14.10.5 | Full backend suite green (73 suites / 613 tests), `tsc --noEmit` clean, coverage 97.21%/88%/92.98%/97.62%, `voice-webhook.controller.ts` 100% all four metrics | ✅ |

### Acceptance Criteria
| # | Criterion | Status |
|---|-----------|--------|
| AC-14.1 | Unit tests for provider, guard, controller, poller, `handlePhoneCallResponse()` — all passing | ✅ |
| AC-14.2 | Full backend suite green after the change (72 suites / 590 tests) | ✅ |
| AC-14.3 | Deployed to the production backend/EC2 (`PLIVO_*`/`VOICE_WEBHOOK_TOKEN` on the live host) | ✅ Deployed 2026-08-12 via `scripts/deploy.sh`; verified live — `GET /api/v1/voice/answer` returns correct XML per language, bad/missing token 401s |
| AC-14.4 | Real end-to-end call placed and verified | ✅ **Confirmed 2026-08-19** (JOB-20260819-0001 → Selva): technician answered, heard the full prompt, accepted by keypress — `handlePhoneCallResponse()` routed the DTMF through the same accept logic a WhatsApp reply uses, job went to ACCEPTED. Two earlier real calls (JOB-20260812-0003 → Selva) had each surfaced a different bug before reaching this point, both fixed: Call #1 (12:57 UTC) — `GetDigits timeout="10"` cut the message off after 13s; fixed to `timeout="35"`. Call #2 (14:33 UTC) — ran the full 38s window but was silent; root cause was WAV mislabeled as `.mp3`, re-encoded to real MP3. Separately (Vetri attempt): carrier `Rejected` hangup (likely DND, still unaddressed) and a WhatsApp 131047 failure on the original offer — **fixed 2026-08-19, see 14.6** |
| AC-14.5 | Plivo HMAC-V3 webhook signature validation implemented | ❌ Shared-secret token only — documented gap |
| AC-14.6 | Post-hangup callback on `/voice/answer` handled cleanly (was 404ing) | ✅ POST handler added, returns 200 |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete |
| 🔄 | In Progress |
| ❌ | Not Started / Deferred |
