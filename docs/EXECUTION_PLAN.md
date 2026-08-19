# Execution Plan — Sevagan

> This document is the single source of truth for phase progress.
> Section 18 must be updated after every completed task.
> Also mirror status changes to `.claude/task-backlog.md`.

---

# 18. EXECUTION PLAN

## Progress Overview (Last Updated: 2026-08-19)

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
| Phase 14 | Technician Job-Offer Voice Escalation | ✅ COMPLETE — job offers (the primary notification) now deliver reliably outside the 24h WhatsApp session via approved templates, validated live 2026-08-19. The voice-call *fallback*'s "Invalid Answer XML" hangups were finally root-caused (via Plivo support's own parse trace, not our own diagnostics) as a genuine bug: a bare `&` in the `<GetDigits action="...">` attribute, invalid per the XML spec — fixed with proper XML-entity escaping, unconfirmed on a real call yet. Documented non-blocking gaps: Plivo HMAC-V3 signature, carrier-level DND/NCPR rejection on one technician's number |

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
- ✅ `WhatsAppProvider.sendTemplate` (added 2026-08-10, confirmed working end-to-end in production 2026-08-11) — bug fix: the technician welcome message was going out via `sendText` (free-form `type: 'text'`), which WhatsApp Cloud API silently rejects for business-initiated messages outside the 24h customer-service session window (error 131047) — a brand-new technician has never messaged the bot, so every welcome message was failing. `technicians.controller.ts` now calls `sendTemplate` with an approved template name (`whatsapp.templates.technicianWelcome` config, env `WA_TEMPLATE_TECHNICIAN_WELCOME`) and a BCP-47 language code (`toMetaTemplateLanguageCode()` in `whatsapp-language.util.ts`, EN→`en`). The old failure was also silently swallowed (`.catch(() => undefined)`); the controller now logs the error and returns `welcomeMessageSent: true/false` on the created technician so a delivery failure is visible instead of looking like success. `MockWhatsAppProvider.sendTemplate` logs the call for dev/testing.
  - Getting this actually working in production surfaced three distinct, separately-diagnosed issues beyond the code fix itself, each confirmed by querying `GET /{waba-id}/message_templates` directly against the Graph API rather than guessing: (1) the language code Meta actually approved the template under was `en`, not `en_US` as assumed; (2) the template was initially approved under the wrong WhatsApp Business Account entirely — WABA `2322112221861809` (a Meta test number) instead of `2518354635331400`, the WABA that actually owns the production number +91 77081 00871 — templates are scoped per-WABA, so this could never have worked regardless of wait time; (3) the real approved template name has a typo, `technician_welcom` (missing the trailing "e"), now pointed at via `WA_TEMPLATE_TECHNICIAN_WELCOME=technician_welcom` in `/etc/sevagan/.env` rather than baked into code. The template also has an IMAGE header (Meta requires the image supplied at send-time — `SendTemplateOptions.headerImageUrl`, defaults to the site logo) and two **named** body variables `service_name`/`service_area` (not positional `{{1}}`/`{{2}}` — `SendTemplateOptions.bodyParams` is `Array<{name, value}>`, sent as `parameter_name` per Meta's named-parameter format).
  - Tamil (`ta`) welcome messages do **not** work yet — the `ta` translation of `technician_welcome` is still `PENDING` approval in Meta Business Manager as of 2026-08-11. EN-language technicians are unaffected; TA-language technicians will get `welcomeMessageSent: false` until that template is approved.

#### 3.2 Webhook
- ✅ `POST /api/v1/webhooks/whatsapp`
- ✅ `WebhookHmacGuard` (HMAC-SHA256 verification)
- ✅ Inbound/outbound message type definitions
- ✅ Message trail audit log (added 2026-08-12) — every inbound webhook message and every outbound send (`TrackedWhatsAppProvider` decorating `WHATSAPP_PROVIDER`) is written to real AWS S3 (`arn:aws:s3:::sevagan-ai`, `us-east-1`, auth via the EC2 instance's IAM role — not the self-hosted MinIO used for uploads), keyed under `message-trails/job/{jobId}/...`. `MessageTrailService.resolveJobId(phone)` attributes each message to whichever job the phone is currently attached to (a technician's most recent assignment, or a customer's most recent job) so no business service has to thread `jobId` through its send calls. Trail writes are fire-and-forget — never block message delivery. See 8.3 for the admin-facing viewer.

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
- ✅ Welcome message (added 2026-07-21): `handleIdle()` now sends `customer.welcome` (plain text) before the language-selection buttons, so first-time contacts (including those arriving via the website's `wa.me` links) get a greeting instead of jumping straight to language buttons. `customer.welcome` previously existed in `en.json`/`ta.json` but was unused/dead code.
- ✅ Language selection (first interaction) — interactive buttons (EN/தமிழ்)
- ✅ Service category selection — interactive list message (tap to select), generated live from `ServiceCategoriesRepository.findActive()` — admin add/hold/remove in the Services tab immediately changes what customers see; menu order = `createdAt asc`, matching the original seeded 1-8 numbering; selection stored per-session as `pendingServiceCategoryIds` so a race with a mid-conversation admin change fails safely and re-shows the menu
- ✅ Location capture — sent as an interactive `location_request_message` (native "Send Location" button) with typed free text as a fully-supported fallback (`WhatsAppProvider.sendLocationRequest`, added 2026-07-20). A native location share always has a tappable `https://www.google.com/maps?q=lat,lng` link appended to `job.location` (added 2026-07-21) — previously a name/address-only pin rendered as unclickable plain text in the technician's job offer message; typed free-text locations are unaffected since there are no coordinates to link.
- ✅ Scheduled time capture — interactive list message (tap to select a slot), auto-regenerates on an invalid/stale reply
- ✅ Job creation with `JOB-YYYYMMDD-NNNN` number format
- ✅ TRACK, CANCEL, HELP commands
- ✅ Amount confirmation flow (AWAITING_AMOUNT_CONFIRMATION) — interactive buttons (Yes Correct / No Incorrect)
- ✅ Rating flow (AWAITING_RATING) — interactive list message (5 star-rating options)
- ✅ Idle nudge (added 2026-07-20): `CustomerIdleNudgeService` polls Redis every 60s (`conv:*` SCAN) for customers parked mid-request (AWAITING_LANGUAGE/SERVICE/LOCATION/TIME only — not post-job states, where "sorry we couldn't service you" would be confusing). Sends `customer.idle_reminder` once after 15 min of no reply, `customer.idle_dropoff` once after 30 min and resets the session to IDLE. Idle time is measured from a dedicated `lastCustomerMessageAt` field (not `updatedAt`, which the nudge's own save would otherwise reset) and clears on the customer's next real message so nudges can fire again for a future idle period.

All customer/technician numbered-selection flows (service, time slot, amount
confirm, rating, job accept/reject, start/decline, complete cash/UPI) were
converted from typed numbers to tap-to-select WhatsApp interactive
buttons/lists (2026-07-19) — `extractText()` already normalized
`button_reply.id`/`list_reply.id` to the same string used for typed replies,
so row/button `id`s reuse the existing "1", "2", ... values and no
state-handler parsing logic needed to change, only the send side. Typed
numeric replies still work as a fallback. Row/button title lengths are
validated against WhatsApp's 24-char (list row) / 20-char (button) limits;
`sendSelectionList` defensively truncates row titles since admin-entered
service names can exceed that (DTO allows up to 120 chars for dashboard
display).

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
- ✅ Job offer notification — interactive buttons: Accept / Reject
- ✅ Accept: acceptedAt set, Job.status = ACCEPTED, Technician.status = BUSY, customer notified; reply sends interactive buttons (Start / Decline) for the next step; technician's `job_accepted` message now also includes the customer's phone number (`customerPhone`, added 2026-07-20) so they can call ahead
- ✅ Reject/Decline: assignment deleted, Job.status = NEW, session cleared, reassignment triggered
- ✅ Start (interactive button): IN_PROGRESS, customer notified; reply sends interactive buttons (Complete Cash / Complete UPI) for the next step
- ✅ Complete Cash/UPI (interactive buttons) → amount entered as free text → amount + mode set, customer prompted for confirmation via interactive buttons (Yes Correct / No Incorrect)
- ✅ Photo upload: downloaded from Meta, stored in MinIO, URL appended to job
- ✅ STATUS, JOBS, HELP commands
- ✅ All button titles routed through `TranslationService` (`technician.accept_button`, `reject_button`, `start_button`, `decline_button`, `complete_cash_button`, `complete_upi_button`) — previously hardcoded English-only "Accept"/"Reject" strings (fixed 2026-07-19)

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
- 🔄 **MVP (2026-07-19): commission set to 0** for both CASH (FLAT) and UPI (PERCENTAGE) via the existing admin Commission tab — technicians keep 100% during the onboarding/adoption period. `JobCommission` records still get created (commissionAmount=0) since `CommissionService`/`recordCommission()` are untouched; only the *display* of commission was removed (invoice PDF's "Service Fee" row, technician's `job_completed`/`settlement_processed` messages) — code commented out, not deleted, in `pdf-generator.service.ts`, `invoice.service.ts`, `technician-bot.service.ts` (+ specs). To re-enable: uncomment those blocks and raise the commission rules back above 0 via `POST /admin/commission-rules`.

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
- ✅ Technicians: list, create modal with skill selection + WhatsApp onboarding, skills CRUD; `GET /admin/technicians/:id` also returns `totalJobs`/`totalEarnings`/`totalCommission` (aggregated from `JobCommission`) and `createdAt`, shown in a fold/expand detail row when the admin clicks a technician's name (added 2026-07-16)
- ✅ Jobs: list with status filter + date filters, detail (GET /admin/jobs, POST /admin/jobs/:id/assign, POST /admin/jobs/:id/cancel); `GET /admin/jobs/:id/message-trail` (added 2026-08-12) surfaces the S3-backed WhatsApp message trail (see 3.2) as a chat-style modal opened via the message icon on each Jobs row; `POST /admin/jobs/:id/complete` (added 2026-08-12) — manual override for ASSIGNED/ACCEPTED/IN_PROGRESS jobs when the technician↔customer WhatsApp completion handshake doesn't happen (call-in, stuck dispute, bot outage): records commission, generates the invoice + payment record, frees the technician, and notifies both parties via translated WhatsApp messages. Exposed as a "Complete" button on the Jobs table.
- ✅ Settlements: list, generate modal, mark paid (GET, POST /admin/settlements/generate, POST /:id/pay)
- ✅ Commission Rules: list + inline create form (GET, POST /admin/commission-rules)
- ✅ Disputes: list with status filter, resolve with notes (GET, POST /admin/disputes/:id/resolve)
- ✅ Services tab: full CRUD (GET ?all=true, POST, PATCH incl. `active` toggle for Hold/Unhold, DELETE — blocked with 409 + a "use Hold instead" message if technicians/jobs still reference it) — drives both the technician skill picker and the live customer WhatsApp menu (updated 2026-07-16)

#### Acceptance Criteria
- ✅ Admin can log in; JWT auth guard protects all admin routes
- ✅ Dashboard KPIs match database counts (auto-refresh every 30s)
- ✅ Creating technician from dashboard sends WhatsApp onboarding message via an approved template (see 3.1, fixed 2026-08-10 — previously a free-text `sendText` call that WhatsApp rejects outside the 24h session window, so no newly onboarded technician ever received it)
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

---

## Phase 14 — Technician Job-Offer Voice Escalation ✅ COMPLETE

**Goal:** If a technician hasn't responded to a job offer within 1 minute, place an automated phone call (Plivo) that plays the offer in their language and lets them accept/reject by keypress — same outcome as a WhatsApp button reply.

#### 14.1 Voice Provider Abstraction
- ✅ `VoiceCallProvider` interface (`infrastructure/telephony/voice-call.provider.interface.ts`) — mirrors `WhatsAppProvider`'s swap-the-implementation pattern
- ✅ `PlivoVoiceCallProvider` — real implementation, `POST /Account/{id}/Call/` via Plivo REST API
- ✅ `MockVoiceCallProvider` — logs only, enabled via `VOICE_MOCK_MODE=true`
- ✅ `TelephonyModule` (global), switches provider via `VOICE_MOCK_MODE`, registered in `AppModule`

#### 14.2 Call Audio
- ✅ EN + TA prompts pre-recorded (Google Cloud TTS, user-generated) — not live TTS: Amazon Polly and Plivo's own `<Speak>` verb both lack Tamil support, confirmed against their docs before choosing the pre-recorded-`<Play>` approach
- ✅ Deployed to `sevagan.co.in/audio/job_offer_call_{en,ta}.mp3` via the existing nginx static site (`infrastructure/site/audio/`) — same mechanism as the WhatsApp template header image
- ✅ **Fixed 2026-08-12**: the originally-provided files were raw `pcm_s16le` WAV at 48kHz saved with a `.mp3` extension, not actual MP3 — Plivo's `<Play>` decoded them as silence for the full call duration (see AC below). Re-encoded via `ffmpeg`/`libmp3lame` to genuine MP3 at Plivo's documented recommendation (16kHz, mono); files shrank 1.2MB→104KB (EN) / 2.3MB→190KB (TA) as a side effect of no longer being uncompressed

#### 14.3 Answer/DTMF Webhooks
- ✅ `VoiceWebhookController` (`modules/whatsapp/voice/`) — `GET /voice/answer` returns Plivo XML (`<Play>` the language-appropriate prompt + `<GetDigits>`), `POST /voice/dtmf` receives the keypress
- ✅ `VoiceWebhookTokenGuard` — shared-secret query token on both callback URLs (Plivo's own HMAC-V3 signature scheme was not implemented — flagged as a follow-up, not blocking)
- ✅ `TechnicianBotService.handlePhoneCallResponse()` — routes digit "1"/"2" through the exact same `handleOfferResponse` accept/reject/expiry logic a WhatsApp "1"/"2" reply uses; no duplicated business logic

#### 14.4 Escalation Trigger
- ✅ `TechnicianSession` gained `offerSentAt` (set in `AssignmentEngineService.assignJobToTechnician`, alongside the existing `offerExpiresAt`) and `escalationCallSentAt` (idempotency flag)
- ✅ `TechnicianOfferEscalationService` — 60s Redis-scan poller (`tech_session:*`), same shape as `CustomerIdleNudgeService`; places one call per offer at the 1-minute mark

#### 14.5 Config
- ✅ `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN`, `PLIVO_NUMBER`, `VOICE_WEBHOOK_TOKEN`, `VOICE_JOB_OFFER_AUDIO_{EN,TA}` added to `app.config.ts` / `env.validation.ts` / `.env.example`; local `backend/.env` populated

#### Acceptance Criteria
- ✅ Unit tests: `PlivoVoiceCallProvider`, `VoiceWebhookTokenGuard`, `VoiceWebhookController`, `TechnicianOfferEscalationService`, `TechnicianBotService.handlePhoneCallResponse()` — all passing
- ✅ Full backend suite green (72 suites / 590 tests) after the change
- ✅ **Deployed to production (2026-08-12)** — `scripts/deploy.sh` run against `54.208.201.48`; `PLIVO_*`/`VOICE_WEBHOOK_TOKEN` added to `/etc/sevagan/.env`; `sevagan-api` rebuilt and healthy
- ✅ Verified live: `GET https://api.sevagan.co.in/api/v1/voice/answer` returns correct Plivo XML with the right `<Play>` URL per `lang`; missing/wrong `token` correctly 401s
- ✅ **Call #1, diagnosed and fixed (2026-08-12 12:57 UTC, JOB-20260812-0003 → Selva)**: answered, fetched XML + audio, but cut off after 13s by `GetDigits timeout="10"` — before the real prompt could finish. Fixed: `timeout` raised to `35`; also fixed a stray `POST /voice/answer` 404 (Plivo's post-hangup callback, no `hangup_url` configured)
- ✅ **Call #2, diagnosed and fixed (2026-08-12 14:33 UTC, same job, reassigned to Selva again)**: confirmed the timeout fix worked mechanically (call ran the full 38s = ~35s timeout + overhead) — but reported "silent," nothing heard. Root cause: the audio files were WAV mislabeled as MP3 (see 14.2) — Plivo fetched them successfully but couldn't decode them, producing silence for the whole call instead of an error. Fixed via re-encode; deployed live and confirmed the URLs now serve genuine, ffmpeg-decodable MP3
- ✅ **Confirmed end-to-end (2026-08-19, JOB-20260819-0001 → Selva)**: technician answered the escalation call, heard the full prompt, and accepted by keypress — `handlePhoneCallResponse()` correctly routed the DTMF through the same accept logic a WhatsApp reply uses, `Job.status` → ACCEPTED
- ✅ Call #1's attempt to Vetri (919626191907, before reassignment) also surfaced two independent findings, not fixed at the time: (1) carrier-level `Rejected` hangup on an unanswered call — likely DND/NCPR filtering on that number, still needs checking separately; (2) the original WhatsApp job-offer message to Vetri failed with Meta error 131047 ("Re-engagement message" — outside the 24h customer-service window) — **fixed 2026-08-19, see 14.6**
- ❌ Plivo's HMAC-V3 webhook signature not implemented (shared-secret token only) — documented gap, not a blocker for MVP

#### 14.6 Escalate Immediately on Confirmed WhatsApp Delivery Failure
**Bug (reported 2026-08-19, JOB-20260819-0001 → Selva):** the technician's job-offer WhatsApp message never arrived — Meta accepts an interactive-buttons send synchronously (returns a wamid) but delivery to a technician outside the 24h session window fails *asynchronously*, minutes later, via the webhook `statuses[]` callback (error 131047). Nothing reacted to that failure status, so `TechnicianOfferEscalationService`'s 60s poller — working exactly as designed — waited out the full timer for a message that was already confirmed dead, then called, making it look like "no WhatsApp was sent, straight to a call." Root-caused via the new S3 message trail (14.x/3.2) plus production logs: offer submitted 05:20:11 → Meta status `failed` #131047 at 05:20:13 → escalation call placed 05:21:17 (~60s later, as designed) → technician accepted by keypress 05:21:56 → the WhatsApp "Job Accepted" confirmation *also* failed 131047 for the same reason.
- ✅ `TechnicianOfferEscalationService.escalateOnDeliveryFailure(phone)` — same call-placing logic as the 60s poller, minus the elapsed-time gate, since a confirmed failure status means waiting serves no purpose
- ✅ `WebhookController`'s `statuses[]` handling now calls it the moment a `failed` status with `errors` arrives for a phone with a `JOB_OFFER_PENDING` session and no escalation call yet sent
- ✅ Durable fix (converting job-offer messages to an approved Meta template with quick-reply buttons, so delivery doesn't depend on the technician having messaged the bot within 24h — same class of fix as `technician_welcome`, see 3.1) started same day — see 14.7
- ✅ Unit tests: `technician-offer-escalation.service.spec.ts` (`escalateOnDeliveryFailure`), `webhook.controller.spec.ts` (escalates on failed status, does not on read/no-errors, survives the escalation check itself throwing)
- ✅ Full backend suite green (73 suites / 615 tests) after the change

#### 14.7 Durable Fix: `technician_job_offer_v2` Meta Template ✅ COMPLETE
**Goal:** job offers reach a technician over WhatsApp regardless of whether they've messaged the bot in the last 24h, by using a pre-approved template instead of free-form interactive buttons — same reasoning as `technician_welcome` (3.1), but this time submitted correctly the first time: ONE template name with EN and TA as proper language variants of each other (not two separate names/structures, which is what happened — likely by accident, via manual Business Manager submission — for `technician_welcome`).
- ✅ Submitted 2026-08-19 via `POST /{waba-id}/message_templates` directly against the Graph API (WABA `2518354635331400`, the one that owns the production number, confirmed via `GET /{waba}/phone_numbers` first) — UTILITY category, BODY with 4 named params (`customer_name`/`location`/`service`/`scheduled_time`, mirroring the live `technician.job_offer` translation text 1:1) + 2 QUICK_REPLY buttons ("Accept"/"Reject", "ஏற்கிறேன்"/"மறுக்கிறேன்"). Both languages: `id` returned, `status: PENDING` — awaiting Meta review.
- ✅ **First attempt REJECTED (`INVALID_FORMAT`)** — root cause: named parameters (`{{customer_name}}`, not positional `{{1}}`) require an explicit top-level `"parameter_format": "NAMED"` field on the create payload; Business Manager's UI sets this automatically (why `technician_welcome`'s named params worked without anyone noticing this requirement) but the raw API does not infer it. Fixed by adding the field and resubmitting under a fresh name (`technician_job_offer_v2` — the original name's async deletion hadn't finished propagating within Meta's own stated "under 1 minute", so a fresh name sidestepped the race rather than waiting further).
- ✅ Config: `whatsapp.templates.jobOffer` (env `WA_TEMPLATE_JOB_OFFER`, default `technician_job_offer_v2`) added to `app.config.ts`
- ✅ `SendTemplateOptions.quickReplyPayloads?: string[]` — one payload per QUICK_REPLY button, in declared index order; `MetaWhatsAppProvider.sendTemplate()` appends a `{ type: 'button', sub_type: 'quick_reply', index, parameters: [{ type: 'payload', payload }] }` component per entry; `MockWhatsAppProvider` logs them
- ✅ Inbound: a template quick-reply tap arrives as `type: 'button'` (payload `{ text, payload }`) — a **different shape** from a free-form interactive button reply (`type: 'interactive'`, `interactive.button_reply.id`). Added `'button'` to `WhatsAppMessageType`, `WhatsAppButtonReply`/`InboundWhatsAppMessage.button`; `TechnicianBotService.extractText()` and `WebhookController.summarizeInbound()` both handle it. Chose payloads `accept_job`/`reject_job` (identical to the existing interactive-button ids) specifically so `handleOfferResponse()`'s existing `isAccept`/`isReject` matching needed **zero changes** — the plumbing is a drop-in once the template is live.
- ✅ **Both languages APPROVED 2026-08-19** — switched `AssignmentEngineService.assignJobToTechnician` from `sendInteractiveButtons` to `sendTemplate`; deployed and validated live (JOB-20260819-0002 → Selva): Meta status `sent` → `delivered`, zero errors — the first job offer in this app's history to genuinely reach a technician outside their 24h session window.
- ✅ **New failure mode surfaced immediately (JOB-20260819-0003 → Maha, formerly "Vetri", `919626191907`)**: Meta accepted the EN template send but blocked delivery with **131049** — "This message was not delivered to maintain healthy ecosystem engagement." Distinct from 131047: this is a **per-recipient marketing-message cap** — Meta silently reclassified the EN language variant as `MARKETING` during review (TA stayed `UTILITY`), and the recipient had hit their personal limit for marketing messages across all businesses on the platform. The escalation call fallback *also* failed for the same number — `CallStatus: no-answer`, `HangupCauseName: Rejected`, `HangupSource: Carrier` — matching the DND/NCPR pattern already flagged (unfixed) for this number on 2026-08-12; both automated channels were down for this one recipient simultaneously, requiring a direct human call instead.
- ✅ **Fixed the category**: Meta refuses to edit an approved template's category via the API (`POST /{template-id} {"category": "UTILITY"}` → "Cannot update an approved template category") and blocks resubmitting the same (name, language) pair for **4 weeks** once a category history exists ("Try again in 4 weeks or use MARKETING as the category") — a deliberate anti-gaming rule, confirmed by trying both. Worked around by deleting only the EN language variant (`DELETE .../message_templates?name=X&hsm_id=Y` — `hsm_id` alone errors, needs `name` too) and resubmitting under a **new** name, `technician_job_offer_en_v3`, with plainer, less broadcast-styled wording ("You have been assigned a new job." instead of "🔔 New Job Available!⏰...") — submitted and **APPROVED as UTILITY** within minutes. TA (`technician_job_offer_v2`, already UTILITY) was untouched.
- ✅ Config split into `whatsapp.templates.jobOfferEn` (`technician_job_offer_en_v3`) / `jobOfferTa` (`technician_job_offer_v2`) — same per-language-name pattern `technician_welcome` ended up needing, for a different root cause this time (category history vs. an original submission accident)
- ✅ Unit tests: `meta-whatsapp.provider.spec.ts` (quick-reply button components, in order, after body; omitted when empty), `technician-bot.service.spec.ts` (accepts on a `type: button` quick-reply tap), `webhook.controller.spec.ts` (trail summary for `type: button`), `assignment-engine.service.spec.ts` (correct template name + language code per technician language)
- ✅ Full backend suite green (73 suites / 618 tests), `tsc --noEmit` clean, coverage 96.83%/87.98%/92.03%/97.21%
- ❌ Still open: the carrier-level DND/NCPR rejection on `919626191907` (Maha, formerly "Vetri") — both WhatsApp and voice calls are unreliable for this specific number; needs a conversation with the technician, not a code fix

#### 14.8 Escalation Call `answer_method`: GET → POST
**Bug:** two of four real escalation calls (both to Selva, `919585909045` — JOB-20260819-0002's initial call and JOB-20260819-0004's) hung up ~1s after answering with Plivo-reported `Invalid Answer XML`, `HangupSource: Error`. The 2026-08-19 logging fix (14.6-adjacent) confirmed on the second occurrence that Plivo's request genuinely reached `GET /voice/answer` (`GET /voice/answer — lang=EN` logged) and that our response was independently verified valid — correct XML, `Content-Type: text/xml; charset=utf-8`, correct `Content-Length`, no BOM/chunking issues (checked via `curl -v` against the identical live URL). Plivo's own Call Detail Record API (`GET /Account/{id}/Call/{call_uuid}/`) offered no further detail than the webhook callback already gave. With the failure genuinely narrowed to somewhere in Plivo's GET fetch/parse of an already-verified-valid response, switched to `POST` as Plivo's documented alternative.
- ✅ `PlivoVoiceCallProvider.placeCall()`: `answer_method: 'GET'` → `'POST'`
- ✅ `VoiceWebhookController`: XML-building logic extracted into `buildAnswerXml(lang)`, shared by both the (now-unused-by-Plivo, kept for manual testing) `GET /voice/answer` and the POST handler. Plivo POSTs to the *same* `/voice/answer` URL for two different purposes — the initial answer fetch and, separately, its default post-hangup status callback (no distinct `hangup_url` configured, see 2026-08-12 note) — originally (wrongly) distinguished by "has an `Event` field at all"; the initial-answer POST was meant to return the real `<GetDigits>`/`<Play>` XML instead of always acking with an empty `<Response/>`.
- ❌ **Confirmed broken on the very next real call (JOB-20260819-0004 reassigned to Maha)**: Plivo's hangup reason changed from `Invalid Answer XML`/`HangupSource: Error` to `End Of XML Instructions`/`HangupSource: Plivo` — meaning the POST fetch itself now *succeeded* (progress!) but the call still lasted only 1s with no audio. Root cause: Plivo tags its **initial** fetch with `Event: StartApp`, not Event-less as assumed — `if (body.Event)` caught both `StartApp` and `Hangup`, so the real call always got the empty ack. Confirmed via nginx access logs: both POSTs for that call returned a 59-byte response (the empty ack) instead of the real ~354-byte answer XML. Fixed by keying off `Event === 'Hangup'` specifically instead of Event-presence.
- ✅ Unit tests: `plivo-voice-call.provider.spec.ts` (posts `answer_method: 'POST'`); `voice-webhook.controller.spec.ts` — hangup callback (`Event: 'Hangup'`) acks empty, `Event: 'StartApp'` serves the real XML (regression test for this exact bug), no-`Event`-at-all also serves the real XML, per-language + logging
- ✅ Full backend suite green (73 suites / 622 tests), `tsc --noEmit` clean, coverage 96.83%/88%/92.05%/97.21%, `voice-webhook.controller.ts` at 100% across all four metrics
- ❌ **Confirmed failing again on the next real call (JOB-20260819-0005 → Selva)** — but this time nginx access logs prove Plivo's request received a 200 with exactly 354 bytes, byte-identical to the independently-verified-valid XML. This conclusively rules out our own response content and routing as the cause — content and routing are now proven correct, and the failure still occurred. Working theory: our server is AWS us-east-1 (Virginia); these are calls to Indian mobile numbers, so the call leg likely routes through Plivo's India/APAC infrastructure — the transcontinental round-trip may intermittently exceed whatever timeout Plivo enforces for fetching `answer_url` on an already-connected call. Our own app-level processing measured sub-25ms, so any real delay is network/TLS transit, not us.
- ❌ **Escalated to Plivo support** (2026-08-19) with the full evidence table (5 call UUIDs across GET/POST, correct/incorrect content, and Plivo's own varying hangup reasons — including the "control" case where serving the *wrong* content correctly produced a *different* error, "End Of XML Instructions," not "Invalid Answer XML") and specific questions about their `answer_url` fetch timeout and whether it's latency-sensitive for this route. No further server-side code changes planned until their response — see support ticket draft (not committed; contains account IDs)
- **Business-flow impact:** the job-offer WhatsApp template (14.7) already delivers reliably regardless of session window — this remaining gap is specifically the voice-call *fallback* for technicians who don't respond to the WhatsApp offer, not the primary notification path

#### 14.9 Actual Root Cause: Unescaped `&` in the `<GetDigits>` Attribute ✅ COMPLETE
**The real bug**, identified by Plivo support from their own parse trace: `buildAnswerXml()`'s `actionUrl` — `.../voice/dtmf?token=...&lang=EN` — was interpolated directly into `action="${actionUrl}"`. A bare `&` is not valid inside an XML attribute value per the XML spec; it must be `&amp;`. This is exactly what "Invalid Answer XML" meant, every single time, across all 5 tracked call UUIDs (14.8) — never a fetch failure, network issue, guard rejection, or content-routing bug.
- Why this evaded every check made in 14.6-14.8: `curl -v` and eyeballing the string both show a bare `&` identically to `&amp;` — neither validates XML well-formedness, only that *something* was returned with the right headers/byte count. nginx's logged byte count being exactly right (14.8, call #5) was **true** and still **not evidence of well-formed XML** — those are different claims, and conflating them is what kept the investigation looking at network/latency instead of content syntax for two days.
- ✅ `VoiceWebhookController.escapeXml()` — escapes `&`, `<`, `>`, `"`, `'` per the standard XML entity set; applied to `actionUrl` and `audioUrl` in `buildAnswerXml()` and to `confirmationUrl` in `dtmf()`'s `<Play>` content
- ✅ Unit tests: regression test asserting the DTMF action URL contains `&amp;lang=TA` (not a bare `&`), plus a blanket test that no unescaped `&` appears anywhere in the generated answer XML
- ✅ Full backend suite green (73 suites / 623 tests), `tsc --noEmit` clean, coverage 96.83%/88%/92.07%/97.21%, `voice-webhook.controller.ts` at 100% across all four metrics
- ❌ Unconfirmed on a real call — this is the third fix attempt for the same underlying symptom (14.6 logging → 14.8 GET→POST + Event routing → 14.9 XML escaping); watching the next live escalation call before declaring this closed
