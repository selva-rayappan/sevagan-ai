# Execution Plan — Sevagan

> This document is the single source of truth for phase progress.
> Section 18 must be updated after every completed task.
> Also mirror status changes to `.claude/task-backlog.md`.

---

# 18. EXECUTION PLAN

## Progress Overview (Last Updated: 2026-07-16)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Architecture & Project Skeleton | ✅ COMPLETE |
| Phase 1 | Infrastructure: Docker, PostgreSQL, Redis, MinIO | ✅ COMPLETE |
| Phase 2 | Database: Prisma Schema & Migrations | ✅ COMPLETE |
| Phase 3 | WhatsApp Integration | ✅ COMPLETE |
| Phase 4 | Customer WhatsApp Bot | ✅ COMPLETE |
| Phase 5 | Technician WhatsApp Workflow | ✅ COMPLETE |
| Phase 6 | Commission, Trust Score & Settlement Engines | ✅ COMPLETE |
| Phase 7 | Assignment Engine | ✅ COMPLETE |
| Phase 8 | Admin Dashboard (Frontend + Backend APIs) | ✅ COMPLETE |
| Phase 9 | Invoice & Payments | ✅ COMPLETE |
| Phase 10 | AI Dispatcher | ✅ COMPLETE |
| Phase 11 | Reports | ✅ COMPLETE |
| Phase 12 | Security | ✅ COMPLETE |
| Phase 13 | Production Deployment | 🔄 IN PROGRESS — artifacts ready, EC2 execution pending |

---

## Phase 0 — Architecture & Project Skeleton ✅ COMPLETE

**Goal:** Establish the monorepo, folder conventions, and shared types before any feature code is written.

#### 0.1 Monorepo Initialisation
- ✅ Root `package.json` with npm workspaces: `backend`, `frontend`
- ❌ `turbo.json` — deferred; scripts run via npm workspaces directly
- ❌ Root `tsconfig.base.json` — deferred; each app has its own tsconfig
- ✅ `.gitignore` added

#### 0.2 NestJS Backend Scaffold
- ✅ NestJS app bootstrapped in `backend/`
- ✅ `ValidationPipe` globally enabled (whitelist, forbidNonWhitelisted)
- ✅ `ConfigModule` with env validation via `class-validator`
- ✅ Module structure: `AppModule` → `HealthModule`, infrastructure modules
- ✅ `HealthModule` with `/health` endpoint

#### 0.3 Next.js Frontend Scaffold
- ✅ Next.js 15 (App Router) bootstrapped in `frontend/`
- ✅ TailwindCSS configured
- ✅ `next.config.ts` configured
- ❌ `/app/(admin)/layout.tsx` admin shell placeholder — not yet added

#### 0.4 Domain Enums
- ✅ Enums in `backend/src/domain/enums/`: JobStatus, PaymentMode, Language, CommissionType, SettlementStatus, DisputeStatus, TechnicianStatus, AdminRole, InvoiceStatus

#### Acceptance Criteria
- ✅ `npm run build` passes across all workspaces
- ✅ `GET /health` returns `{ status: "ok" }`

---

## Phase 1 — Infrastructure ✅ COMPLETE

**Goal:** Every service the backend depends on runs via Docker Compose.

#### 1.1 Docker Compose
- ✅ `docker-compose.yml` with postgres, redis, backend, frontend, nginx, minio, ollama
- ✅ `.env.example` with all required keys

#### 1.2 Infrastructure Modules
- ✅ `PrismaModule` + `PrismaService`
- ✅ `RedisModule` + `RedisService`
- ✅ `MinioModule` + `MinioService`
- ✅ `nginx/nginx.conf` proxying

#### 1.3 CI Bootstrap
- ✅ `.github/workflows/ci.yml` — backend (prisma generate, lint, `test:cov` enforcing the 80% gate, `nest build`) and frontend (lint, `next build`) jobs on push/PR to `master`

#### Acceptance Criteria
- ✅ `docker compose up` starts all services
- ✅ `GET /health` reachable

---

## Phase 2 — Database: Prisma Schema & Migrations ✅ COMPLETE

**Goal:** All tables defined, migrated, and seeded.

#### 2.1 Core Models
- ✅ Customer, Technician, ServiceCategory, TechnicianSkill
- ✅ Job, Assignment, Invoice, Payment
- ✅ CommissionRule, JobCommission, TechnicianSettlement
- ✅ Rating, Dispute, AdminUser

#### 2.2 Enums
- ✅ JobStatus, PaymentMode, Language, CommissionType, SettlementStatus, DisputeStatus, TechnicianStatus, AdminRole, InvoiceStatus, PaymentStatus

#### 2.3 Migrations & Seed
- ✅ Initial migration: `20260614083731_init_full_schema`
- ✅ Seed: ServiceCategories (8), CommissionRules (CASH+UPI), default admin

#### Acceptance Criteria
- ✅ `prisma migrate dev` runs cleanly
- ✅ `prisma db seed` completes
- ✅ `GET /health` includes database status

---

## Phase 3 — WhatsApp Integration ✅ COMPLETE

**Goal:** Webhook receives and routes messages; outbound messages can be sent.

#### 3.1 Provider
- ✅ `IWhatsAppProvider` interface
- ✅ `MetaWhatsAppProvider` implementation
- ✅ `MessagingModule` (global)

#### 3.2 Webhook
- ✅ `POST /api/v1/webhooks/whatsapp`
- ✅ `WebhookHmacGuard` (HMAC-SHA256 verification)
- ✅ Inbound/outbound message type definitions

#### 3.3 i18n
- ✅ `TranslationService` + `TranslationModule`
- ✅ EN locale file
- ✅ TA locale file
- ✅ `ConversationStateService` (Redis-backed)

#### Acceptance Criteria
- ✅ Meta webhook verification GET returns challenge
- ✅ Invalid signature returns 403
- ✅ `TranslationService.translate("customer.welcome", "TA")` returns Tamil text

---

## Phase 4 — Customer WhatsApp Bot ✅ COMPLETE

**Goal:** Customer can request and track a service entirely via WhatsApp.

#### 4.1 State Machine
- ✅ `ConversationStateService` (Redis, 24h TTL)
- ✅ States: IDLE → AWAITING_LANGUAGE → AWAITING_SERVICE → AWAITING_LOCATION → AWAITING_TIME → (job created) → IDLE

#### 4.2 Customer Bot Flows
- ✅ Language selection (first interaction)
- ✅ Service category selection (numbered menu, generated live from `ServiceCategoriesRepository.findActive()` — admin add/hold/remove in the Services tab immediately changes what customers see; menu order = `createdAt asc`, matching the original seeded 1-8 numbering; selection stored per-session as `pendingServiceCategoryIds` so a race with a mid-conversation admin change fails safely and re-shows the menu) (updated 2026-07-16)
- ✅ Location capture (text or WhatsApp location share)
- ✅ Scheduled time capture (free text)
- ✅ Job creation with `JOB-YYYYMMDD-NNNN` number format
- ✅ TRACK, CANCEL, HELP commands
- ✅ Amount confirmation flow (AWAITING_AMOUNT_CONFIRMATION)
- ✅ Rating flow (AWAITING_RATING)

#### 4.3 Repositories
- ✅ `CustomersRepository`: findByPhone, findById, upsert, updateLanguage
- ✅ `ServiceCategoriesRepository`: findAll, findActive, findByName, findById
- ✅ `JobsRepository`: create, findByJobNumber, findByCustomerId, updateStatus

#### Acceptance Criteria
- ✅ 117 tests passing
- ✅ Coverage: Statements 97.58% | Branches 88.54% | Functions 95.31% | Lines 98.01%

---

## Phase 5 — Technician WhatsApp Workflow ✅ COMPLETE

**Goal:** Technician can receive, accept, start, complete, and upload photos — all via WhatsApp.

#### 5.1 Session Management
- ✅ `TechnicianSessionService` (Redis, `tech_session:{phone}`)
- ✅ States: IDLE → JOB_OFFER_PENDING → JOB_ACCEPTED → JOB_IN_PROGRESS → AWAITING_COMPLETION

#### 5.2 Bot Flows
- ✅ Job offer notification (interactive buttons: Accept / Reject)
- ✅ Accept (reply `1`): acceptedAt set, Job.status = ACCEPTED, Technician.status = BUSY, customer notified
- ✅ Reject (reply `2`): assignment deleted, Job.status = NEW, session cleared
- ✅ `START` command: IN_PROGRESS, customer notified
- ✅ `COMPLETE <amount> <CASH|UPI>` command: amount + mode set, customer prompted for confirmation
- ✅ Photo upload: downloaded from Meta, stored in MinIO, URL appended to job
- ✅ STATUS, JOBS, HELP commands

#### 5.3 Repositories & Extensions
- ✅ `TechniciansRepository`: findByPhone, findById, updateLanguage, updateStatus
- ✅ `AssignmentsRepository`: create, findByJobId, findById, accept, deleteById, findByTechnicianId
- ✅ `JobsRepository` extended: findById, findByIdWithDetails, findByTechnicianId, setCompletion, appendDescription
- ✅ `downloadMedia` added to WhatsAppProvider interface

#### 5.4 i18n
- ✅ All technician messages in EN + TA: job_offer, job_accepted, job_rejected, job_started, job_completed, photo_received, etc.

#### Acceptance Criteria
- ✅ 183 tests, 17 suites — all passing
- ✅ Coverage: Statements 96.48% | Branches 83.41% | Functions 97.39% | Lines 97.26%
- ✅ `nest build` clean

---

## Phase 6 — Commission, Trust Score & Settlement Engines ✅ COMPLETE

**Goal:** Every completed job auto-calculates commission, updates trust score, and generates settlement records.

#### 6.1 Commission Engine
- ✅ `CommissionService`: `calculateCommission(jobAmount, paymentMode)`, `recordCommission(jobId)`
- ✅ Fetch active `CommissionRule` for paymentMode at calculation time
- ✅ FLAT: `commission = rule.commissionValue`; PERCENTAGE: `commission = jobAmount * rule.commissionValue / 100`
- ✅ Triggered on customer amount confirmation (`AWAITING_AMOUNT_CONFIRMATION` state, reply '1')

#### 6.2 Commission Rule Service
- ✅ `CommissionRuleRepository`: `getActiveRule(paymentMode)`, `createRule(dto)` (auto-deactivates previous), `listRules()`
- ✅ Rule changes logged via NestJS Logger

#### 6.3 Trust Score Engine
- ✅ `TrustScoreService.applyTrustEvent(technicianId, event)`
- ✅ Events: AMOUNT_DISPUTED (−5), MISMATCH_RESOLVED_AGAINST_TECH (−10), FRAUD_DETECTED (−25), POSITIVE_RATING (4–5★) (+2), NEGATIVE_RATING (1–2★) (−3)
- ✅ Minimum score: 0

#### 6.4 Customer Validation Handler (wired into CustomerBotService)
- ✅ Reply '1': record commission, notify technician confirmed, reset tech session, set tech AVAILABLE, proceed to rating
- ✅ Reply '2': create Dispute, apply AMOUNT_DISPUTED trust event, notify technician, reset tech session, set tech AVAILABLE

#### 6.5 Rating Collection (wired into CustomerBotService)
- ✅ Accept 1–5 reply, create Rating record, update technician rolling average, apply trust event

#### 6.6 Settlement Engine
- ✅ `SettlementService.generateSettlementForTechnician(technicianId, start, end)`
- ✅ `markSettlementPaid(settlementId)`
- ✅ `listSettlements(technicianId?, status?)`

#### Acceptance Criteria
- ✅ CASH job ₹1000: commissionAmount = ₹20, technicianAmount = ₹980
- ✅ UPI job ₹1000: commissionAmount = ₹50, technicianAmount = ₹950
- ✅ Dispute reduces trust score by 5
- ✅ Rating 5 stars increases trust score by 2
- ✅ Settlement generates correct net amounts for a technician with multiple completed jobs
- ✅ Settlement status transitions PENDING → PAID correctly
- ✅ **216 tests, 23 suites — all passing**

---

## Phase 7 — Assignment Engine ✅ COMPLETE

**Goal:** Auto-assign best available technician on job creation; handle reassignment on rejection.

#### 7.1 Assignment Service
- ✅ `AssignmentEngineService.findBestTechnician(categoryId, location, excludedIds)` — filter by skill, AVAILABLE status, serviceArea ILIKE match; rank by composite score (admin-editable `priorityRank` weighted boost + trustScore + rating)
- ✅ `assignJobToTechnician(job, technician)` — create Assignment, Job.status = ASSIGNED, Technician.status = BUSY, set tech session JOB_OFFER_PENDING, send WhatsApp offer
- ✅ `tryAssignJob(jobId, customerPhone)` — triggered from CustomerBotService after job creation (fire-and-forget)
- ✅ `TechnicianSessionModule` extracted as standalone module to avoid circular dependency

#### 7.1a Admin-Editable Technician Ranking (added 2026-07-16)
- ✅ `Technician.priorityRank` (Int, default 50, 0-100) — admin-editable via `PATCH /admin/technicians/:id` and set on create
- ✅ `TechniciansRepository.findBestAvailable` computes a composite score (`priorityRank * 2 + trustScore + rating * 10`) over `findMany` candidates instead of a raw `orderBy`, so rank nudges selection without letting it fully override trustScore/rating
- ✅ Admin technicians page (frontend) exposes a "Priority Rank" field on create/edit and a Rank column in the list

#### 7.2 Rejection & Reassignment
- ✅ `triggerReassignment(jobId, rejectedTechnicianId)` — called from TechnicianBotService on rejection and offer expiry
- ✅ Redis key `job_rejections:{jobId}` tracks excluded technician IDs (24h TTL)
- ✅ Max 3 rejections; after that notify customer `customer.no_technician_available`

#### 7.3 Availability Management
- ✅ `setBusy(technicianId)` — called on assignment in `assignJobToTechnician`
- ✅ `setAvailable(technicianId)` — already handled in Phase 6 (CustomerBotService on confirmation/dispute)

#### Acceptance Criteria
- ✅ Job for AC Service in Allampatti assigns to highest trust-score AC technician covering that area
- ✅ Rejected assignment triggers reassignment (TechnicianBotService.rejectJob calls triggerReassignment)
- ✅ Offer timeout triggers reassignment (handleOfferResponse expiry calls triggerReassignment)
- ✅ After 3 failures: customer receives `customer.no_technician_available` message
- ✅ **224 tests, 24 suites — all passing**

---

## Phase 8 — Admin Dashboard ✅ COMPLETE

**Goal:** Operations admin manages all entities via Next.js web dashboard.

#### 8.1 Auth (Backend + Frontend)
- ✅ `POST /api/v1/auth/login` — returns accessToken + refreshToken
- ✅ `POST /api/v1/auth/refresh` — accepts refreshToken, returns new tokens
- ✅ `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- ✅ `JwtAuthGuard` registered as global APP_GUARD via `AuthModule`
- ✅ `@Public()` decorator applied to WebhookController and HealthController
- ✅ Login page at `frontend/src/app/(auth)/login/page.tsx`

#### 8.2 Dashboard KPIs
- ✅ `GET /api/v1/dashboard/kpis` — jobsToday, revenueToday, commissionEarned, activeTechnicians, pendingSettlements, openDisputes, totalJobs, completedJobs
- ✅ KPI cards UI with 30s auto-refresh

#### 8.3 Entity Management Pages
- ✅ Customers: list with pagination (GET /admin/customers, GET /admin/customers/:id, PATCH)
- ✅ Technicians: list, create modal with skill selection + WhatsApp onboarding, skills CRUD
- ✅ Jobs: list with status filter + date filters, detail (GET /admin/jobs, POST /admin/jobs/:id/assign, POST /admin/jobs/:id/cancel)
- ✅ Settlements: list, generate modal, mark paid (GET, POST /admin/settlements/generate, POST /:id/pay)
- ✅ Commission Rules: list + inline create form (GET, POST /admin/commission-rules)
- ✅ Disputes: list with status filter, resolve with notes (GET, POST /admin/disputes/:id/resolve)
- ✅ Services tab: full CRUD (GET ?all=true, POST, PATCH incl. `active` toggle for Hold/Unhold, DELETE — blocked with 409 + a "use Hold instead" message if technicians/jobs still reference it) — drives both the technician skill picker and the live customer WhatsApp menu (updated 2026-07-16)

#### Acceptance Criteria
- ✅ Admin can log in; JWT auth guard protects all admin routes
- ✅ Dashboard KPIs match database counts (auto-refresh every 30s)
- ✅ Creating technician from dashboard sends WhatsApp onboarding message via translation service
- ✅ `AssignmentEngineService.manualAssign(jobId, technicianId)` — admin picks a specific technician (not just re-running auto-match); frees the previously-assigned technician back to AVAILABLE first; exposed via the "Assign" button on NEW/ASSIGNED/ACCEPTED jobs (updated 2026-07-16 — the endpoint previously accepted but silently ignored `technicianId`)
- ✅ **224 tests, 24 suites — all passing**
- ✅ Unit tests backfilled 2026-06-30 for all 7 admin controllers, the auth module (controller/service/guard/strategy), and the dashboard module — these had zero coverage despite the original sign-off; see Phase 9 note (now resolved)

---

## Phase 9 — Invoice & Payments ✅ COMPLETE

**Goal:** PDF invoice generated on completion; sent to customer via WhatsApp.

#### 9.1 Invoice Generation
- ✅ `PdfGeneratorService` — bilingual (EN/TA) PDF invoice via `pdfkit`
- ✅ `InvoiceService.generateInvoice(jobId)` — idempotent (returns existing invoice if already generated), generates invoice number `INV-YYYYMMDD-NNNN` via Redis counter
- ✅ PDF uploaded to MinIO (`invoices/{invoiceNumber}.pdf`), 7-day presigned URL sent to customer via `sendDocument`
- ✅ Invoice status DRAFT → SENT on successful delivery; invoice record persists even if PDF generation fails (retryable via `getInvoicePdfUrl`)

#### 9.2 Payments
- ✅ `PaymentService.recordCashPayment` (status COMPLETED) / `recordUpiPayment` (status PENDING)
- ✅ `generatePaymentLink` — Razorpay payment link, base URL configurable via `RAZORPAY_LINK_URL` env var (not hardcoded)
- ✅ Wired into `CustomerBotService` — on amount confirmation (reply '1'), invoice + payment generated fire-and-forget; UPI jobs get a payment link sent via WhatsApp

#### 9.3 Admin
- ✅ `GET /api/v1/admin/invoices`, `GET /:id`, `GET /:id/pdf` (redirect to presigned URL), `POST /:id/confirm-payment`

#### Acceptance Criteria
- ✅ Invoice generated and WhatsApp document sent on job completion confirmation
- ✅ CASH payment recorded as COMPLETED; UPI payment recorded as PENDING with payment link sent
- ✅ Admin can confirm a pending UPI payment, marking invoice PAID
- ✅ **263 tests, 31 suites — all passing**; invoice/payment modules at 100% statement coverage

> Note (resolved 2026-06-30): Phase 8 admin controllers, auth, and dashboard modules originally shipped with zero unit tests despite the Phase 8 sign-off, keeping the workspace below the 80% coverage gate. Backfilled 63 new tests (301 → 364) across `modules/admin/*.controller.spec.ts`, `modules/auth/*.spec.ts`, `modules/dashboard/*.spec.ts`, and extended `technicians.repository.spec.ts`. `npm run test:cov` now passes cleanly (96.6% stmts / 88% branches / 93.6% functions / 97% lines, 364 tests, 50 suites).

---

## Phase 10 — AI Dispatcher ✅ COMPLETE

**Goal:** Ollama-powered intent classification and FAQ responses.

#### 10.1 AI Provider Abstraction
- ✅ `AIProvider` interface; `OllamaProvider` (primary) + `OpenAIProvider` (fallback)
- ✅ `AIService.chat()` — tries Ollama first, falls back to OpenAI on failure, throws only if both fail
- ✅ `AIModule` (global), configured via `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OPENAI_API_KEY`

#### 10.2 Intent Classification & Category Mapping
- ✅ `IntentClassifierService.classifyIntent(message, language)` — classifies into REQUEST_SERVICE / TRACK_JOB / CANCEL_JOB / FAQ_HOURS / FAQ_PRICING / FAQ_COVERAGE / UNKNOWN, extracts job number when present
- ✅ `CategoryMapperService.mapToCategory(message)` — maps free text (EN or TA) to a `ServiceCategory` via DB lookup

#### 10.3 Language Auto-Detection
- ✅ `LanguageDetectorService.detectLanguage(text)` — Tamil-Unicode heuristic first, AI fallback only for ambiguous mixed-script input

#### 10.4 CustomerBotService Integration
- ✅ Wired as a free-text fallback in `IDLE` / `AWAITING_SERVICE` states (numbered-menu input is untouched — pure-digit replies always skip AI dispatch)
- ✅ FAQ intents answered directly from `faq.hours` / `faq.pricing` / `faq.coverage` (EN+TA) without changing conversation state
- ✅ Natural-language `TRACK_JOB` / `CANCEL_JOB` (with extracted job number) routed to the existing track/cancel handlers
- ✅ `REQUEST_SERVICE` in `AWAITING_SERVICE` resolves a free-text service description to a category (confidence ≥ 0.6) and advances straight to location capture, skipping the numbered menu
- ✅ All AI failures caught and logged — falls back to the standard state-machine flow, never blocks the conversation

#### Acceptance Criteria
- ✅ "What are your working hours?" answered directly via FAQ, no state change
- ✅ "My fan is not working" in AWAITING_SERVICE resolves to Electrical and advances to location capture
- ✅ "Where is JOB-XXXXXXXX-XXXX" routes to the existing track flow
- ✅ Ollama outage transparently falls back to OpenAI; both providers down falls back to standard menu-driven flow
- ✅ **301 tests, 37 suites — all passing**; AI infra + ai-dispatcher modules at 100% statement coverage

---

## Phase 11 — Reports ✅ COMPLETE

**Goal:** Admin can view revenue, job, and technician performance reports.

#### 11.1 Backend — `ReportsModule`
- ✅ `GET /api/v1/reports/revenue?period=daily|weekly|monthly` — zero-filled time-bucketed revenue + commission, summed from `JobCommission` (30 days / 12 weeks / 12 months lookback); invalid `period` rejected with 400
- ✅ `GET /api/v1/reports/jobs?from=&to=` — job counts grouped by `status` and by `serviceCategory` (via `Prisma.groupBy`), optional date-range filter
- ✅ `GET /api/v1/reports/technicians` — active technicians ranked by `trustScore` desc, with rating and completed/total assignment counts

#### 11.2 Frontend — `/reports`
- ✅ Revenue line chart (Recharts) with Daily/Weekly/Monthly toggle
- ✅ Jobs-by-status bar chart and jobs-by-category pie chart
- ✅ Technician performance table ranked by trust score
- ✅ Client-side CSV export (no backend endpoint needed) on all three sections via `exportToCsv()` in `lib/utils.ts`
- ✅ Added to admin sidebar nav; `recharts` added as a frontend dependency

#### Acceptance Criteria
- ✅ Revenue report returns a full bucket range even with no data (zero-filled, not sparse)
- ✅ Jobs report groups accurately by status and category, including a graceful "Unknown" fallback for a since-deleted category
- ✅ Technician report reflects live trust scores and job counts
- ✅ Each report section exports to CSV from the browser
- ✅ **383 tests, 52 suites — all passing**; `reports` module at 100% statement coverage; clean `next build`

---

## Phase 12 — Security ✅ COMPLETE

**Goal:** Production-hardened security controls.

#### 12.1 RBAC (Admin vs Operator)
- ✅ `@Roles()` decorator + `RolesGuard`, registered globally as `APP_GUARD` (after `JwtAuthGuard`)
- ✅ `AdminRole.ADMIN`-only: commission rule creation, settlement generate/pay, invoice payment confirmation, dispute resolution, audit log viewing
- ✅ `AdminRole.OPERATOR` retains operational access: customers, technicians, jobs, service categories

#### 12.2 Audit Logging
- ✅ `AuditLog` table migrated (`20260630163120_add_audit_log`)
- ✅ `AuditService` (global, `infrastructure/audit/`) — `log()` never throws, fire-and-forget safe
- ✅ Wired into 11 sensitive mutations: login, commission rule creation, settlement generate/pay, invoice payment confirmation, dispute resolution, technician create/update, customer update, job manual-assign/cancel
- ✅ `GET /api/v1/admin/audit-logs` (ADMIN-only, paginated, filterable by `entityType`/`actorId`)

#### 12.3 Rate Limiting
- ✅ **Fixed a pre-existing gap:** `ThrottlerModule` was configured but `ThrottlerGuard` was never registered — rate limiting was completely inert. Now registered globally.
- ✅ `/auth/login` and `/auth/refresh` restricted to **10 req/min** via `@Throttle()` (per `.claude/task-backlog.md` spec — corrected from an initial 5/min)
- ✅ WhatsApp webhook POST handler explicitly throttled to 300 req/min (previously fell through to the 30/min global default)

#### 12.4 Input Sanitization Audit
- ✅ Replaced unvalidated inline `@Body()` interface types with `class-validator`-decorated DTOs across all 6 admin controllers + auth controller (8 new DTO files) — closes a mass-assignment gap where arbitrary fields could reach `prisma.update({ data: body })`
- ✅ Confirmed zero raw SQL (`$queryRaw`/`$executeRaw`) anywhere in the codebase
- ✅ Global `SanitizePipe` trims whitespace and strips HTML tags from every string in request bodies, ahead of `ValidationPipe`
- ✅ E.164-tolerant Indian phone validator (`IsIndianPhone`) on technician creation, normalized via `normalizePhone()` before persistence

#### 12.5 JWT Hardening
- ✅ Refresh token moved from JSON body to an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production), scoped to `/api/v1/auth`
- ✅ `AdminUser.tokenVersion` (new column) embedded in every JWT and checked on every request; refresh and logout both increment it, immediately invalidating **all** outstanding access and refresh tokens for that admin — true server-side revocation, not just client-side token discard
- ✅ Verified live: refresh rotates the cookie and instantly 401s the pre-rotation access token; logout 401s the just-issued access token on the next request

#### 12.6 Webhook & Audit Coverage
- ✅ `WebhookHmacGuard` logs every rejected signature attempt to `AuditLog` (`WEBHOOK_SIGNATURE_REJECTED`, with reason/IP/path)
- ✅ `AuditInterceptor` applied to every mutating admin controller — guarantees blanket `AuditLog` coverage for all `POST`/`PATCH`/`PUT`/`DELETE` admin calls alongside the 11 existing action-specific manual logs

#### 12.7 HTTPS Enforcement
- ✅ Production nginx config (`infrastructure/nginx/nginx.prod.conf.template`, Phase 13) redirects HTTP→HTTPS and sets HSTS on both domains; `helmet({ hsts })` also enabled when `NODE_ENV=production`
- ✅ Dev-mode `infrastructure/nginx/nginx.conf` intentionally stays HTTP-only

#### 12.8 OWASP Top 10 Review
- ✅ Full assessment written up in `docs/SECURITY_REVIEW.md`, covering A01–A10 with findings, fixes, and residual gaps carried into Phase 13; addendum (2026-07-14) documents the items above

#### Acceptance Criteria
- ✅ OPERATOR role blocked (403) from financial/config endpoints; ADMIN unaffected
- ✅ Repeated login attempts beyond 10/min are throttled (429) — verified live
- ✅ Every sensitive admin action produces a queryable `AuditLog` row with actor, action, and entity
- ✅ Admin DTOs reject malformed/extra fields via the global `ValidationPipe`
- ✅ Unauthenticated request to any admin route returns `401`; invalid/revoked JWT returns `401` — verified live
- ✅ **427 tests, 59 suites — all passing**

---

## Phase 13 — Production Deployment 🔄 IN PROGRESS

**Goal:** Live on EC2, accepting real customers.

All deployable artifacts are built and committed; execution against a real AWS account/domain is pending.

- ✅ `docker-compose.prod.yml`, production Dockerfiles (multi-stage, non-root, `devDependencies` pruned), pinned image versions, `json-file` log rotation on every service
- ✅ `infrastructure/nginx/nginx.prod.conf.template` (full TLS) + `nginx.bootstrap.conf.template` (HTTP-only, used for first-run ACME challenge) — `scripts/deploy.sh` auto-selects based on cert presence
- ✅ `scripts/deploy.sh`, `scripts/init-ssl.sh`, `scripts/renew-ssl.sh`, `scripts/backup-db.sh` — one-off `certbot/certbot` compose service, no host-level certbot install needed
- ✅ `docs/DEPLOYMENT.md` — full guided walkthrough (EC2 setup, secrets, first deploy, SSL renewal cron, Meta webhook registration, backup/restore test procedure, monitoring)
- ❌ EC2 provisioned (t3.medium+) — requires real AWS access
- ❌ Docker Compose deployed to the live host
- ❌ DNS: `api.sevagan.in`, `admin.sevagan.in` pointed at the host
- ❌ Let's Encrypt certs issued (script ready, needs live DNS)
- ❌ Meta WhatsApp Production tier webhook registered (needs live HTTPS endpoint)
- ❌ Backups running on a live host (script + cron documented, not yet executing anywhere)
- ❌ Monitoring: Uptime Robot on `/health`
- ❌ Operations runbook

See `docs/DEPLOYMENT.md` for full deployment guide.
