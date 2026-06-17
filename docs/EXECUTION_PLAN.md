# Execution Plan — Sevagan

> This document is the single source of truth for phase progress.
> Section 18 must be updated after every completed task.
> Also mirror status changes to `.claude/task-backlog.md`.

---

# 18. EXECUTION PLAN

## Progress Overview (Last Updated: 2026-06-15)

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
| Phase 9 | Invoice & Payments | ❌ NOT STARTED |
| Phase 10 | AI Dispatcher | ❌ NOT STARTED |
| Phase 11 | Reports | ❌ NOT STARTED |
| Phase 12 | Security | ❌ NOT STARTED |
| Phase 13 | Production Deployment | ❌ NOT STARTED |

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
- ❌ GitHub Actions workflow not created

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
- ✅ Service category selection (numbered menu)
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
- ✅ `AssignmentEngineService.findBestTechnician(categoryId, location, excludedIds)` — filter by skill, AVAILABLE status, serviceArea ILIKE match; rank by trustScore DESC, rating DESC
- ✅ `assignJobToTechnician(job, technician)` — create Assignment, Job.status = ASSIGNED, Technician.status = BUSY, set tech session JOB_OFFER_PENDING, send WhatsApp offer
- ✅ `tryAssignJob(jobId, customerPhone)` — triggered from CustomerBotService after job creation (fire-and-forget)
- ✅ `TechnicianSessionModule` extracted as standalone module to avoid circular dependency

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
- ✅ Service Categories: GET /admin/service-categories (used by technician create form)

#### Acceptance Criteria
- ✅ Admin can log in; JWT auth guard protects all admin routes
- ✅ Dashboard KPIs match database counts (auto-refresh every 30s)
- ✅ Creating technician from dashboard sends WhatsApp onboarding message via translation service
- ✅ Manual assignment triggers AssignmentEngineService
- ✅ **224 tests, 24 suites — all passing**

---

## Phase 9 — Invoice & Payments ❌ NOT STARTED

**Goal:** PDF invoice generated on completion; sent to customer via WhatsApp.

- ❌ PDF generation (pdfkit or puppeteer)
- ❌ Store PDF in MinIO
- ❌ Send PDF via WhatsApp document message
- ❌ `InvoiceService`, `PaymentService`

---

## Phase 10 — AI Dispatcher ❌ NOT STARTED

**Goal:** Ollama-powered intent classification and FAQ responses.

- ❌ `AIDispatcherService` with Ollama client + OpenAI fallback
- ❌ Intent classification: free text → service category
- ❌ Language auto-detection
- ❌ FAQ responses: hours, pricing, coverage

---

## Phase 11 — Reports ❌ NOT STARTED

**Goal:** Admin can view revenue, job, and technician performance reports.

- ❌ `GET /reports/revenue?period=daily|weekly|monthly`
- ❌ `GET /reports/jobs` — by status, category
- ❌ `GET /reports/technicians` — ratings, trust scores, job counts
- ❌ Frontend: charts + export CSV

---

## Phase 12 — Security ❌ NOT STARTED

**Goal:** Production-hardened security controls.

- ❌ JWT + RBAC (Admin vs Operator)
- ❌ Audit logs for all sensitive actions (`AuditLog` table)
- ❌ Rate limiting on auth endpoints (stricter than default)
- ❌ Input sanitization audit
- ❌ Security review against OWASP Top 10

---

## Phase 13 — Production Deployment ❌ NOT STARTED

**Goal:** Live on EC2, accepting real customers.

- ❌ EC2 provisioned (t3.medium+)
- ❌ Docker Compose deployed
- ❌ Nginx + Let's Encrypt SSL
- ❌ DNS: `api.sevagan.ai`, `admin.sevagan.ai`
- ❌ Meta WhatsApp Production tier approved
- ❌ Backups configured (PostgreSQL + MinIO)
- ❌ Monitoring: Uptime Robot on `/health`
- ❌ Operations runbook

See `docs/DEPLOYMENT.md` for full deployment guide.
