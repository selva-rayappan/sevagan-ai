# SEVAGAN (சேவகன்)

# WhatsApp-First Home Services Marketplace

# Master Technical Specification & Development Guide

Version: 1.0

Status: MVP

Target Market: Virudhunagar, Tamil Nadu

Target Launch Timeline: 6-8 Weeks

---

# 1. PRODUCT VISION

Sevagan is a WhatsApp-first marketplace connecting customers with local service professionals.

Examples:

* Electrician
* Plumber
* AC Technician
* Carpenter
* Painter
* Appliance Repair
* RO Service
* CCTV Installation

The MVP deliberately avoids:

* Customer Mobile App
* Technician Mobile App

All interactions happen through WhatsApp.

Goal:

Enable customers to request services through WhatsApp while technicians receive, accept, execute, and complete jobs through their personal WhatsApp accounts.

---

# 2. BUSINESS MODEL

## Revenue Model

### Cash Jobs

Customer pays Technician directly.

Sevagan charges:

```text
Flat Commission Per Job
```

Default:

```text
₹20
```

Configurable by Admin.

---

### UPI Jobs

Customer pays Sevagan.

Sevagan charges:

```text
Percentage Commission
```

Default:

```text
5%
```

Configurable by Admin.

---

## Examples

### Cash

```text
Job Amount: ₹1200

Commission: ₹20

Technician Keeps: ₹1180
```

---

### UPI

```text
Job Amount: ₹1200

Commission: 5%

Sevagan: ₹60

Technician Settlement: ₹1140
```

---

# 3. MVP USERS

## Customer

Can:

* Request Service
* Track Job
* Confirm Amount
* Provide Rating

---

## Technician

Can:

* Receive Jobs
* Accept Jobs
* Reject Jobs
* Start Jobs
* Complete Jobs
* Upload Photos

---

## Operations Admin

Can:

* View Jobs
* Manage Technicians
* View Revenue
* Configure Commission Rules
* Manage Settlements
* Handle Disputes

---

# 4. TECHNOLOGY STACK

## Frontend

* NextJS 15
* TypeScript
* TailwindCSS
* ShadCN
* TanStack Table

---

## Backend

* NestJS
* TypeScript

Architecture:

```text
Controller
Service
Repository
Domain
Infrastructure
```

---

## Database

PostgreSQL

---

## Cache

Redis

---

## Messaging

Meta WhatsApp Cloud API

Abstract behind:

```typescript
interface WhatsAppProvider
```

Future provider replacement should require no business logic changes.

---

## AI

Primary:

```text
Ollama
```

Models:

* Qwen3
* Llama3

Fallback:

```text
OpenAI
```

---

## Storage

MinIO

S3 Compatible

---

## Deployment

Single EC2

Docker Compose

Nginx

Let's Encrypt

---

4A. LANGUAGE & LOCALIZATION FRAMEWORK
Objective

Allow Customers and Technicians to interact with Sevagan in their preferred language.

Initial Supported Languages:

English (EN)
Tamil (TA)

The entire WhatsApp conversation experience must automatically adapt to the user's preferred language.

Customer Language Selection
First Interaction

Customer sends:

Hi

Bot responds:

Please choose your language:

1. English
2. தமிழ்

Customer selects:

2

System stores:

language = 'TA'

All future messages are automatically sent in Tamil.

Example:

வணக்கம்!

உங்களுக்கு எந்த சேவை தேவை?

1. மின்சாரம்
2. பிளம்பிங்
3. ஏசி சேவை
Technician Language Selection

During onboarding:

Admin registers technician.

System sends:

Welcome to Sevagan.

Choose your preferred language.

1. English
2. தமிழ்

Technician selects.

Store:

language = 'EN'

or

language = 'TA'
Language Preference Management
Customer Commands

English:

LANGUAGE

Tamil:

மொழி

System:

Choose Language

1 English
2 தமிழ்
Technician Commands
LANGUAGE

or

மொழி

Updates preference.

Database Changes
customers

Add:

language VARCHAR(5) DEFAULT 'TA'
technicians

Add:

language VARCHAR(5) DEFAULT 'TA'
admins

Add:

language VARCHAR(5) DEFAULT 'EN'
Localization Tables
localization_keys
id UUID

key_name

description
localization_values
id UUID

localization_key_id

language_code

message_text

Example:

SERVICE_REQUEST_CREATED

English:

Your request has been created.

Tamil:

உங்கள் சேவை கோரிக்கை பதிவு செய்யப்பட்டது.
Translation Service

Create:

interface TranslationService {

 getMessage(
   key: string,
   language: string,
   variables?: object
 )

}
WhatsApp Messaging Rule

Never hardcode text inside business services.

Bad:

send("Your request has been created")

Good:

send(
  translationService.getMessage(
      "REQUEST_CREATED",
      user.language
  )
)
Customer Examples
English User
Need AC repair

Response:

Please share your location.
Tamil User
ஏசி சர்வீஸ் வேண்டும்

Response:

உங்கள் இருப்பிடத்தை பகிரவும்.
Technician Examples
English Technician
New Job

Customer:
Rajesh

Reply:
1 Accept
2 Reject
Tamil Technician
புதிய வேலை

வாடிக்கையாளர்:
Rajesh

பதில்:

1 ஏற்கவும்
2 நிராகரிக்கவும்
AI Dispatcher Language Requirements

The AI Dispatcher must:

Detect Input Language

Example:

Need electrician

Language:

EN

Example:

எலக்ட்ரீஷியன் வேண்டும்

Language:

TA
Maintain Response Language

If customer speaks Tamil:

Reply only in Tamil.

If customer speaks English:

Reply only in English.

Admin Dashboard Localization

Phase 1:

Admin UI remains English.

Phase 2:

Add multilingual Admin UI support.

Acceptance Criteria

✓ Customer chooses English or Tamil

✓ Technician chooses English or Tamil

✓ Language preference stored

✓ WhatsApp messages localized

✓ AI detects language automatically

✓ User can change language anytime

✓ No hardcoded messages in business logic

✓ Translation framework ready for future languages

# 5. SYSTEM ARCHITECTURE

```text
Customer WhatsApp
          |
          v
WhatsApp Cloud API
          |
          v
Webhook Service
          |
          v
Sevagan Backend
          |
  ----------------
  |      |       |
 Jobs  AI    Payments
  |
  v
PostgreSQL

Admin Dashboard
     |
     v
Backend APIs
```

---

# 6. DATABASE DESIGN

## customers

```sql
id UUID PK
name
phone
address
created_at
updated_at
```

---

## technicians

```sql
id UUID PK
name
phone
status
rating
trust_score
service_area
created_at
updated_at
```

---

## service_categories

```sql
id UUID PK
name
description
active
```

Seed Data:

* Electrical
* Plumbing
* AC Service
* Carpentry
* Painting
* Appliance Repair
* RO Service
* CCTV Installation

---

## technician_skills

```sql
id UUID PK

technician_id
category_id
```

---

## jobs

```sql
id UUID PK

job_number

customer_id

service_category_id

status

description

location

scheduled_time

job_amount

payment_mode

created_at
updated_at
```

Status:

```text
NEW
ASSIGNED
ACCEPTED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

## assignments

```sql
id UUID PK

job_id
technician_id

assigned_at
accepted_at
```

---

## invoices

```sql
id UUID PK

invoice_number

job_id

amount

status

pdf_url
```

---

## payments

```sql
id UUID PK

invoice_id

amount

method

status
```

Methods:

```text
CASH
UPI
```

---

## commission_rules

```sql
id UUID PK

payment_mode

commission_type

commission_value

effective_from

active
```

---

## job_commissions

```sql
id UUID PK

job_id

job_amount

commission_amount

technician_amount

payment_mode
```

---

## technician_settlements

```sql
id UUID PK

technician_id

gross_amount

commission_amount

net_amount

status
```

---

## ratings

```sql
id UUID PK

job_id

customer_id

technician_id

rating

comments
```

---

## disputes

```sql
id UUID PK

job_id

customer_amount

technician_amount

status
```

---

# 7. CUSTOMER WHATSAPP BOT

## Flow

Customer:

```text
Need AC Repair
```

Bot:

```text
Please share your location.
```

Customer:

```text
Allampatti
```

Bot:

```text
Preferred time?
```

Customer:

```text
Today 4 PM
```

Bot:

```text
Your request has been created.
Job Number: JOB123
```

---

## Supported Commands

```text
Track JOB123

Cancel JOB123

Help
```

---

# 8. TECHNICIAN WORKFLOW

## New Assignment

```text
New Job

Customer: Rajesh

Location: Allampatti

Service: AC Repair

Reply:

1 Accept
2 Reject
```

---

## Accept

```text
1
```

---

## Start

```text
START
```

---

## Complete

```text
COMPLETE 1200 CASH
```

or

```text
COMPLETE 1200 UPI
```

---

# 9. CUSTOMER VALIDATION

After completion:

```text
Technician reported:

₹1200

Reply:

1 Correct
2 Incorrect
```

---

# 10. TRUST SCORE ENGINE

Initial:

```text
100
```

Rules:

### Correct Confirmation

+0

### Dispute

-5

### Amount Mismatch

-10

### Fraud Detection

-25

Assignment engine prioritizes higher scores.

---

# 11. ASSIGNMENT ENGINE

V1 Logic:

Match:

* Service Category
* Service Area
* Availability

---

Ranking:

```text
Trust Score DESC

Rating DESC
```

---

# 12. COMMISSION ENGINE

## Cash

```text
Flat Commission
```

Default:

```text
₹20
```

---

## UPI

```text
Percentage
```

Default:

```text
5%
```

---

Functions:

```typescript
calculateCommission()

calculateSettlement()

generateSettlement()
```

---

# 13. ADMIN DASHBOARD

## Modules

### Dashboard

KPIs:

* Jobs Today
* Revenue
* Commission Earned
* Active Technicians

---

### Customers

CRUD

---

### Technicians

CRUD

Skill Assignment

Trust Score

---

### Jobs

View

Assign

Reassign

Cancel

---

### Revenue

Daily

Weekly

Monthly

---

### Settlements

Generate

Pay

History

---

### Commission Rules

Configure:

```text
Cash Commission

UPI Commission
```

---

### Reports

Revenue

Ratings

Trust

Jobs

---

# 14. AI DISPATCHER

Responsibilities:

### Intent Classification

```text
Need plumber
```

↓

```text
PLUMBING
```

---

### Service Classification

Map free text to category.

---

### FAQ Responses

Working Hours

Pricing

Coverage

---

### Follow-ups

```text
Was service completed?
```

---

# 15. API DESIGN

Base URL:

```text
/api/v1
```

Examples:

```http
POST /jobs

GET /jobs

POST /technicians

GET /technicians

POST /settlements/generate
```

Generate complete OpenAPI specification.

---

# 16. SECURITY

Implement:

* JWT
* RBAC
* Rate Limiting
* Audit Logs
* Input Validation

---

# 17. TESTING

Generate:

## Unit Tests

Coverage > 80%

---

## Integration Tests

API Tests

---

## E2E Tests

Playwright

---

# 18. EXECUTION PLAN

---

## Progress Overview (Last Updated: 2026-06-15)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Architecture & Project Skeleton | ✅ COMPLETE |
| Phase 1 | Infrastructure: Docker, PostgreSQL, Redis, MinIO | ✅ COMPLETE |
| Phase 2 | Database: Prisma Schema & Migrations | ✅ COMPLETE |
| Phase 3 | WhatsApp Integration | ✅ COMPLETE |
| Phase 4 | Customer WhatsApp Bot | ✅ COMPLETE |
| Phase 5 | Technician WhatsApp Workflow | ✅ COMPLETE |
| Phase 6 | Commission, Trust Score & Settlement Engines | ❌ NOT STARTED |
| Phase 7 | Assignment Engine | ❌ NOT STARTED |
| Phase 8 | Admin Dashboard (Frontend + Backend APIs) | ❌ NOT STARTED |
| Phase 9 | Invoice & Payments | ❌ NOT STARTED |
| Phase 10 | AI Dispatcher | ❌ NOT STARTED |
| Phase 11 | Reports | ❌ NOT STARTED |
| Phase 12 | Security | ❌ NOT STARTED |
| Phase 13 | Production Deployment | ❌ NOT STARTED |

---

## Phase 0 — Architecture & Project Skeleton

**Status: ✅ COMPLETE**

Goal: Establish the monorepo, folder conventions, and shared types before any feature code is written.

### Tasks

#### 0.1 Monorepo Initialisation ✅
- ✅ Root `package.json` with npm workspaces: `apps/api`, `apps/web`
- ❌ `turbo.json` (or Nx) — not added; scripts run via npm workspaces directly
- ❌ Root `tsconfig.base.json` with path aliases — each app has its own tsconfig
- ✅ `.gitignore` added

#### 0.2 NestJS Backend Scaffold ✅
- ✅ NestJS app bootstrapped inside `apps/api`
- ✅ `ValidationPipe` globally enabled (whitelist, forbidNonWhitelisted)
- ✅ `ConfigModule` with `.env` validation via `class-validator` (`apps/api/src/config/env.validation.ts`)
- ✅ Module structure: `AppModule` → `HealthModule`, `WhatsAppModule`, infrastructure modules
- ✅ `HealthModule` with `/health` endpoint (`apps/api/src/modules/health/`)

#### 0.3 NextJS Frontend Scaffold ✅
- ✅ NextJS 15 (App Router) bootstrapped inside `apps/web`
- ✅ TailwindCSS + ShadCN configured
- ✅ `next.config.ts` configured
- ❌ `/app/(admin)/layout.tsx` admin shell — placeholder not yet added

#### 0.4 Shared Types / Domain Enums ✅
- ✅ Domain enums defined in `apps/api/src/domain/enums/`: `JobStatus`, `PaymentMode`, `Language`, `CommissionType`, `SettlementStatus`, `DisputeStatus`, `TechnicianStatus`, `AdminRole`, `InvoiceStatus`
- ❌ Separate `packages/shared-types` package not created — enums live in backend domain layer

#### 0.5 Architecture Documentation ✅
- ✅ `CLAUDE.MD` documents multilingual requirements and conventions
- ✅ `SEVAGAN_DEV_INSTRUCTIONS.MD` serves as master specification

#### Acceptance Criteria
- ✅ `npm run build` passes across all workspaces with zero errors
- ✅ `GET /health` returns `{ status: "ok" }`
- ❌ Shared types importable from `apps/web` — enums are backend-only for now

---

## Phase 1 — Infrastructure: Docker, PostgreSQL, Redis, MinIO

**Status: ✅ COMPLETE**

Goal: Every service the backend depends on runs locally via Docker Compose and is reachable with correct credentials.

### Tasks

#### 1.1 Docker Compose (Development) ✅
- ✅ `docker-compose.yml` at repo root with postgres, redis, backend, frontend, nginx services
- ❌ MinIO service not included (deferred — not needed for Phase 3)
- ❌ `docker-compose.override.yml` — not created

#### 1.2 Environment Configuration ✅
- ✅ `.env.example` with all required keys documented and described
- ✅ `.env` (git-ignored) for local values
- ✅ All keys present: `DATABASE_URL`, `REDIS_URL`, `WA_*`, `JWT_SECRET`, `OLLAMA_*`, `OPENAI_API_KEY`, `NODE_ENV`, `API_PORT`

#### 1.3 Backend Database Connection ✅
- ✅ `PrismaModule` + `PrismaService` in `apps/api/src/infrastructure/database/`
- ✅ `RedisModule` + `RedisService` in `apps/api/src/infrastructure/cache/`
- ❌ `MinioModule` / `StorageService` — not yet created

#### 1.4 Nginx Configuration ✅
- ✅ `nginx/nginx.conf` proxying `/api` to backend and `/` to frontend

#### 1.5 CI Bootstrap ❌
- ❌ GitHub Actions workflow not created

#### Acceptance Criteria
- ✅ `docker compose up` starts all services with no errors
- ✅ `GET /health` reachable via `http://localhost/api/health`
- ✅ Redis connection functional (used by TranslationService)
- ❌ MinIO console — not set up
- ❌ CI workflow — not set up

---

## Phase 2 — Database: Prisma Schema & Migrations

**Status: ✅ COMPLETE**

Goal: All tables are defined, migrated, and seeded. Prisma client is fully typed and importable.

### Tasks

#### 2.1 Prisma Setup ✅
- ✅ `prisma`, `@prisma/client` installed
- ✅ `prisma/schema.prisma` with `datasource db` pointing to `DATABASE_URL`
- ✅ Prisma generate step configured

#### 2.2 Schema — Core Tables ✅
Define all models with correct types and relations:
- ✅ `Customer` — id, name, phone (unique), address, language, createdAt, updatedAt
- ✅ `Technician` — id, name, phone (unique), status, rating, trustScore, serviceArea, language, createdAt, updatedAt
- ✅ `Admin` — id, name, email (unique), passwordHash, language, createdAt
- ✅ `ServiceCategory` — id, name, description, active
- ✅ `TechnicianSkill` — id, technicianId, categoryId (composite unique)
- ✅ `Job` — id, jobNumber (unique), customerId, serviceCategoryId, status (enum), description, location, scheduledTime, jobAmount, paymentMode, createdAt, updatedAt
- ✅ `Assignment` — id, jobId, technicianId, assignedAt, acceptedAt (nullable)
- ✅ `Invoice` — id, invoiceNumber (unique), jobId, amount, status, pdfUrl (nullable)
- ✅ `Payment` — id, invoiceId, amount, method (enum), status, createdAt
- ✅ `CommissionRule` — id, paymentMode, commissionType, commissionValue, effectiveFrom, active
- ✅ `JobCommission` — id, jobId, jobAmount, commissionAmount, technicianAmount, paymentMode
- ✅ `TechnicianSettlement` — id, technicianId, grossAmount, commissionAmount, netAmount, status, createdAt
- ✅ `Rating` — id, jobId, customerId, technicianId, rating (1-5), comments, createdAt
- ✅ `Dispute` — id, jobId, customerAmount, technicianAmount, status, createdAt
- ✅ `AuditLog` — id, actorId, actorType, action, entityType, entityId, metadata (Json), createdAt
- ✅ `LocalizationKey` — id, keyName (unique), description
- ✅ `LocalizationValue` — id, localizationKeyId, languageCode, messageText

#### 2.3 Enums ✅
```prisma
enum JobStatus { NEW ASSIGNED ACCEPTED IN_PROGRESS COMPLETED CANCELLED }
enum PaymentMode { CASH UPI }
enum Language { EN TA }
enum CommissionType { FLAT PERCENTAGE }
enum SettlementStatus { PENDING PAID }
enum DisputeStatus { OPEN RESOLVED ESCALATED }
enum TechnicianStatus { AVAILABLE BUSY OFFLINE }
enum AdminRole { ADMIN OPERATOR }
enum InvoiceStatus { DRAFT SENT PAID }
enum PaymentStatus { PENDING COMPLETED FAILED REFUNDED }
```

#### 2.4 Migrations ✅
- ✅ Initial migration: `prisma/migrations/20260614083731_init_full_schema/`
- ❌ Migration step in CI not added (CI not set up)

#### 2.5 Seed Data ✅
- ✅ `prisma/seed.ts` created with:
  - `ServiceCategory`: Electrical, Plumbing, AC Service, Carpentry, Painting, Appliance Repair, RO Service, CCTV Installation
  - `CommissionRule`: CASH FLAT ₹20, UPI PERCENTAGE 5%
  - `Admin`: default ops admin account
  - `LocalizationKey` + `LocalizationValue` for all MVP message keys in EN and TA

#### 2.6 PrismaModule in NestJS ✅
- ✅ `PrismaService` in `apps/api/src/infrastructure/database/prisma.service.ts`
- ✅ `PrismaModule` exported as global module
- ✅ Prisma health indicator in `/health` endpoint

#### Acceptance Criteria
- ✅ `prisma migrate dev` runs cleanly on fresh database
- ✅ `prisma db seed` completes with no errors
- ✅ `prisma studio` shows all tables with correct columns
- ✅ `GET /health` includes database status

---

## Phase 3 — WhatsApp Integration

**Status: ✅ COMPLETE**

Goal: Webhook receives messages from Meta, signature is verified, messages are parsed and routed, and outbound messages can be sent.

### Tasks

#### 3.1 WhatsApp Provider Interface ✅
- ✅ `WhatsAppProvider` interface in `apps/api/src/infrastructure/messaging/whatsapp.provider.interface.ts`
- ✅ All business code depends only on this interface

#### 3.2 Meta WhatsApp Provider Implementation ✅
- ✅ `WhatsAppModule` in `apps/api/src/modules/whatsapp/whatsapp.module.ts`
- ✅ `MetaWhatsAppProvider` in `apps/api/src/infrastructure/messaging/meta-whatsapp.provider.ts`
- ✅ Injects `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID` from `ConfigService`
- ✅ Unit tests: `meta-whatsapp.provider.spec.ts`

#### 3.3 Webhook Endpoint ✅
- ✅ `POST /api/v1/webhook` — receives Meta webhook events (`apps/api/src/modules/whatsapp/webhook/webhook.controller.ts`)
- ✅ `GET /api/v1/webhook` — Meta verification (hub.mode, hub.verify_token, hub.challenge)
- ✅ HMAC-SHA256 signature verification via `X-Hub-Signature-256` header
- ✅ Returns `200 OK` immediately; async processing via NestJS EventEmitter
- ✅ Unit tests: `webhook.controller.spec.ts`

#### 3.4 Webhook Message Parser ✅
- ✅ Included in `WhatsAppModule` / webhook controller
- ✅ Parses incoming JSON to typed message structures
- ✅ Emits typed events

#### 3.5 Outbound Message Service ✅
- ✅ Outbound messaging via `MetaWhatsAppProvider` in `apps/api/src/infrastructure/messaging/`
- ✅ Uses `TranslationService` for localised messages

#### 3.6 Translation Service (Localization) ✅
- ✅ `TranslationService` in `apps/api/src/infrastructure/i18n/translation.service.ts`
- ✅ `TranslationModule` in `apps/api/src/infrastructure/i18n/translation.module.ts`
- ✅ Loads translations from JSON locale files (`locales/en.json`, `locales/ta.json`)
- ✅ Redis caching with TTL
- ✅ Variable interpolation support
- ✅ Unit tests: `translation.service.spec.ts`

#### 3.7 Message Template Seed ✅
- ✅ All MVP message keys seeded in EN and TA via `prisma/seed.ts`
- ✅ Locale JSON files: `apps/api/src/infrastructure/i18n/locales/en.json`, `ta.json`
- ✅ Keys include: `LANGUAGE_SELECTION`, `WELCOME`, `SERVICE_MENU`, `LOCATION_PROMPT`, `TIME_PROMPT`, `JOB_CREATED`, `JOB_ASSIGNED`, `JOB_ACCEPTED`, `JOB_STARTED`, `JOB_COMPLETED`, `AMOUNT_CONFIRMATION`, `AMOUNT_CONFIRMED`, `AMOUNT_DISPUTED`, `RATING_PROMPT`, `RATING_RECEIVED`, `TECHNICIAN_JOB_OFFER`, `TECHNICIAN_JOB_ACCEPTED`, `TECHNICIAN_JOB_REJECTED`, `TECHNICIAN_START_PROMPT`, `TECHNICIAN_COMPLETE_PROMPT`, `HELP`, `UNKNOWN_COMMAND`, `ERROR_GENERIC`

#### Acceptance Criteria
- ✅ Meta webhook verification GET request returns correct challenge
- ✅ Invalid signature POST returns `403 Forbidden`
- ✅ Valid text message emits `whatsapp.message.received` event
- ✅ `TranslationService.getMessage("WELCOME", "TA")` returns Tamil text
- ✅ `TranslationService.getMessage("WELCOME", "EN")` returns English text
- ✅ No hardcoded strings outside of locale seed data

---

## Phase 4 — Customer WhatsApp Bot

**Status: ✅ COMPLETE**

Goal: A customer can send a message, choose a language, request a service, share a location, pick a time, and receive a job number — all via WhatsApp.

### Tasks

#### 4.1 Customer Session Management ✅
- ✅ `ConversationStateService` backed by Redis (`conv:{phone}` key, 24h TTL)
- ✅ Session state machine: `IDLE → AWAITING_LANGUAGE → AWAITING_SERVICE → AWAITING_LOCATION → AWAITING_TIME`
- ✅ `ConversationSession` interface stored as JSON in Redis
- ✅ `createNewSession`, `getSession`, `saveSession`, `clearSession` methods

#### 4.2 Customer Message Router ✅
- ✅ `CustomerBotService` injected into `WebhookController.dispatchMessage()` (fire-and-forget)
- ✅ Customer upserted by phone on every inbound message
- ✅ Routes based on session state + message content
- ✅ Unknown input returns `customer.unknown_command` translation

#### 4.3 Language Selection Flow ✅
- ✅ Every new session (IDLE state) triggers interactive button language selection
- ✅ `1` / `lang_en` → English; `2` / `lang_ta` → Tamil
- ✅ Language persisted in `customers.language` DB column + session
- ✅ All subsequent messages sent in customer's chosen language

#### 4.4 Service Request Flow ✅
- ✅ Service numbered menu 1–8 sent as text message (all 8 seeded categories)
- ✅ On valid selection: lookup category by name in DB, advance to AWAITING_LOCATION
- ✅ On invalid selection: error + re-send menu (state unchanged)

#### 4.5 Location Handling ✅
- ✅ Accepts text location (area name) or native WhatsApp location share
- ✅ WhatsApp location: uses `name` → `address` → `lat,lng` fallback chain
- ✅ Location stored in session, advance to AWAITING_TIME

#### 4.6 Time Scheduling ✅
- ✅ Free-text time input accepted ("Today 4 PM", "Tomorrow 10 AM", "ASAP")
- ✅ Raw text stored in job `description` field as "Requested time: ..."
- ✅ Used verbatim in `job_created` confirmation message

#### 4.7 Job Creation ✅
- ✅ `Job` record created with status `NEW`
- ✅ Job number format: `JOB-YYYYMMDD-NNNN` via Redis `INCR job_counter:{date}`
- ✅ `JOB_CREATED` confirmation sent with jobNumber, service, location, scheduledTime
- ✅ Session reset to IDLE after creation

#### 4.8 Supported Commands (Any State) ✅
- ✅ `TRACK JOB-YYYYMMDD-NNNN` — job status in customer's language
- ✅ `CANCEL JOB-YYYYMMDD-NNNN` — cancels NEW/ASSIGNED jobs; rejects IN_PROGRESS+
- ✅ `HELP` / `உதவி` — help message in customer's language

#### 4.9 Customer Repository ✅
- ✅ `CustomersRepository`: `findByPhone`, `findById`, `upsert`, `updateLanguage`
- ✅ `ServiceCategoriesRepository`: `findAll`, `findActive`, `findByName`, `findById`
- ✅ `JobsRepository`: `create`, `findByJobNumber` (with serviceCategory include), `findByCustomerId`, `updateStatus`

#### Acceptance Criteria ✅
- ✅ New customer receives language selection on first message
- ✅ Language preference persisted in DB + Redis session
- ✅ Customer completes full flow: language → service → location → time → job confirmed
- ✅ `Job` record created in DB with jobNumber, customerId, serviceCategoryId, location
- ✅ `TRACK JOB-XXX` returns current status in customer's language
- ✅ `CANCEL JOB-XXX` cancels NEW/ASSIGNED jobs with confirmation
- ✅ Unknown commands return localised error message
- ✅ All messages pass through `TranslationService` (no hardcoded strings)
- ✅ 117 tests passing, coverage: Statements 97.58%, Branches 88.54%, Functions 95.31%, Lines 98.01%

---

## Phase 5 — Technician WhatsApp Workflow

**Status: ✅ COMPLETE**

Goal: Technicians receive job offers, can accept/reject, start, complete, and upload photos — all via WhatsApp.

### Tasks

#### 5.1 Technician Session Management
✅ Create `TechnicianSessionService` backed by Redis
✅ Session key: `tech_session:{phone}`
✅ State machine:
  ```
  IDLE → JOB_OFFER_PENDING → JOB_ACCEPTED → JOB_IN_PROGRESS → AWAITING_COMPLETION
  ```
✅ Store active `jobId`, `assignmentId`, `customerPhone`, `offerExpiresAt` in session

#### 5.2 Technician Message Router
✅ Create `TechnicianBotService` with `handleMessage(message, senderName, technician)`
✅ `WebhookController` identifies technician via `TechniciansRepository.findByPhone`; routes to `TechnicianBotService` if found, else `CustomerBotService`
✅ Route based on session state + message content

#### 5.3 Job Offer Notification
✅ `TechnicianBotService.sendJobOffer(technician, job, customer)` — sends interactive buttons
✅ Message includes: customer name, service type, location, scheduled time (EN+TA)
✅ Interactive buttons: `Accept` / `Reject`
✅ Set session state to `JOB_OFFER_PENDING`, store `offerExpiresAt` (15 minutes TTL)
✅ Offer expiry checked on next incoming message (cron auto-reject deferred to Phase 7)

#### 5.4 Accept / Reject Handling
✅ `1` / `accept_job` / `accept` / `ஏற்கவும்`: `Assignment.acceptedAt`, `Job.status = ACCEPTED`, `Technician.status = BUSY`; customer notified with `job_assigned`
✅ `2` / `reject_job` / `reject`: delete assignment, `Job.status = NEW`, session cleared to IDLE
✅ Expired offer resets session to IDLE with `offer_expired` message

#### 5.5 START Command
✅ Technician sends `START` in `JOB_ACCEPTED` state
✅ Update `Job.status = IN_PROGRESS`
✅ Send `job_started` to technician and customer
✅ Advance session to `JOB_IN_PROGRESS`

#### 5.6 COMPLETE Command
✅ Format: `COMPLETE <amount> <CASH|UPI>` (regex validates decimal amounts)
✅ Calls `JobsService.setCompletion(id, amount, paymentMode)` — sets `jobAmount`, `paymentMode`, `status = COMPLETED`
✅ Sends `job_completed` to technician (commission=0 placeholder until Phase 6)
✅ Sends `confirm_amount` to customer; sets customer session to `AWAITING_AMOUNT_CONFIRMATION` with `activeJobContext`

#### 5.7 Photo Upload
✅ Technician can send image in `JOB_IN_PROGRESS` state
✅ Download via `whatsapp.downloadMedia(mediaId)` (Meta Graph API)
✅ Upload to MinIO bucket `sevagan-uploads` under `job-photos/{jobId}/{timestamp}.{ext}`
✅ `JobsService.appendPhotoUrl()` appends `Photo: {key}` to job description
✅ Send `photo_received` confirmation to technician; upload errors send `unknown_command`

#### 5.8 Technician Commands (Any State)
✅ `STATUS` / `நிலை` — sends current active job details or `no_active_job`
✅ `JOBS` / `வேலைகள்` — sends last 5 jobs summary via `findByTechnicianId`
✅ `HELP` / `உதவி` — sends localised command reference

#### 5.9 Technician Repository & Assignments Repository
✅ `TechniciansRepository`: `findByPhone`, `findById`, `updateLanguage`, `updateStatus`
✅ `AssignmentsRepository`: `create`, `findByJobId`, `findById`, `accept`, `deleteById`, `findByTechnicianId`
✅ `JobsRepository` extended: `findById`, `findByIdWithDetails`, `findByTechnicianId`, `setCompletion`, `appendDescription`
✅ `MinioService`: `uploadFile`, `getPresignedUrl`, `onModuleInit` (auto-creates bucket)
✅ `downloadMedia` added to `WhatsAppProvider` interface and `MetaWhatsAppProvider`

#### 5.10 i18n
✅ EN + TA translations for all technician messages: `job_offer`, `job_accepted`, `job_rejected`, `job_started`, `job_completed`, `photo_received`, `unknown_command`, `no_active_job`, `offer_expired`, `job_history`, `status_awaiting_confirmation`, `help`
✅ Customer `confirm_amount`, `amount_confirmed`, `amount_disputed`, `rate_technician`, `rating_received` added

#### 5.11 Customer Bot Extensions
✅ `AWAITING_AMOUNT_CONFIRMATION` state: `1` confirms → `AWAITING_RATING`; `2` disputes → IDLE; else re-prompt
✅ `AWAITING_RATING` state: 1–5 accepted → IDLE; else re-prompt

#### 5.12 Tests
✅ `technicians.repository.spec.ts` — 4 tests
✅ `assignments.repository.spec.ts` — 6 tests
✅ `technician-session.service.spec.ts` — 5 tests
✅ `technician-bot.service.spec.ts` — 22 tests (all states, sendJobOffer, global commands)
✅ `webhook.controller.spec.ts` — updated: TechnicianBotService + TechniciansRepository mocks, routing tests
✅ `customer-bot.service.spec.ts` — updated: AWAITING_AMOUNT_CONFIRMATION (3 tests), AWAITING_RATING (4 tests)
✅ `jobs.repository.spec.ts` — updated: findById, findByIdWithDetails, findByTechnicianId, setCompletion, appendDescription
✅ `jobs.service.spec.ts` — updated: findById, findWithDetails, findByTechnicianId, updateStatus, setCompletion, appendPhotoUrl
✅ **183 tests, 17 suites — all passing**
✅ **Coverage: Statements 96.48% | Branches 83.41% | Functions 97.39% | Lines 97.26%** (all ≥80%)
✅ `nest build` — clean

#### Acceptance Criteria
✅ Technician receives job offer with correct localised text (EN+TA)
✅ `1` within 15 min accepts job; `2` rejects and clears session
✅ Expired offer detected on next message; session reset to IDLE
✅ `START` updates job to IN_PROGRESS; customer notified
✅ `COMPLETE 1500 UPI` sets amount, payment mode; customer prompted for confirmation
✅ Image upload stores file in MinIO and appends URL to job description
✅ Customer `AWAITING_AMOUNT_CONFIRMATION` and `AWAITING_RATING` states wired end-to-end

---

## Phase 6 — Commission, Trust Score & Settlement Engines

**Status: ❌ NOT STARTED**

Goal: Every completed job automatically calculates commission, updates the technician trust score, and settlement records are generated correctly.

### Tasks

#### 6.1 Commission Engine
- Create `CommissionService`
- `calculateCommission(jobAmount, paymentMode): CommissionResult`
  - Fetch active `CommissionRule` for paymentMode
  - FLAT: `commission = rule.commissionValue`
  - PERCENTAGE: `commission = jobAmount * rule.commissionValue / 100`
  - Return `{ jobAmount, commissionAmount, technicianAmount }`
- `recordCommission(jobId): JobCommission` — persist to `job_commissions`
- Triggered on `job.amount_confirmed` event

#### 6.2 Commission Rule Service
- `getActiveRule(paymentMode): CommissionRule`
- `createRule(dto): CommissionRule` — deactivates previous rule, activates new
- `listRules(): CommissionRule[]`
- All commission rule changes logged to `AuditLog`

#### 6.3 Trust Score Engine
- Create `TrustScoreService`
- Initial score on technician registration: `100`
- Events and adjustments:
  - `AMOUNT_CONFIRMED`: `+0` (no change, just confirmation)
  - `AMOUNT_DISPUTED`: `-5`
  - `AMOUNT_MISMATCH_RESOLVED_AGAINST_TECHNICIAN`: `-10`
  - `FRAUD_DETECTED`: `-25`
  - `POSITIVE_RATING` (4-5 stars): `+2`
  - `NEGATIVE_RATING` (1-2 stars): `-3`
- `applyTrustEvent(technicianId, event): void` — update `technician.trustScore`, log event
- Minimum score: `0` (never negative)
- Subscribe to: `job.disputed`, `job.amount_confirmed`, `rating.received`

#### 6.4 Customer Validation Handler
- Subscribe to customer replies to `AMOUNT_CONFIRMATION`
- `1` (Correct): emit `job.amount_confirmed`; proceed to rating prompt (Phase 6.5)
- `2` (Incorrect): create `Dispute` record (status `OPEN`), emit `job.disputed`, notify admin via WhatsApp/dashboard alert, apply trust score deduction

#### 6.5 Rating Collection
- After `job.amount_confirmed`: send `RATING_PROMPT` to customer
- Accept reply `1`–`5`
- Create `Rating` record
- Update `technician.rating` as rolling average
- Emit `rating.received`

#### 6.6 Settlement Engine
- Create `SettlementService`
- `generateSettlementForTechnician(technicianId, periodStart, periodEnd): TechnicianSettlement`
  - Aggregate all COMPLETED jobs in period
  - Sum `jobAmount` (gross), sum `commissionAmount`, compute `netAmount`
  - Create `TechnicianSettlement` with status `PENDING`
- `markSettlementPaid(settlementId): void` — update status to PAID, log to AuditLog
- `listSettlements(technicianId?, status?)`: paginated list

#### Acceptance Criteria
- CASH job ₹1000: commissionAmount = ₹20, technicianAmount = ₹980
- UPI job ₹1000: commissionAmount = ₹50, technicianAmount = ₹950
- Dispute reduces trust score by 5
- Rating 5 stars increases trust score by 2
- Settlement generates correct net amounts for a technician with 3 completed jobs
- Settlement status transitions from PENDING → PAID correctly

---

## Phase 7 — Assignment Engine

**Status: ❌ NOT STARTED**

Goal: When a job is created, the system automatically selects the best available technician, notifies them, and handles reassignment on reject or timeout.

### Tasks

#### 7.1 Assignment Service
- Create `AssignmentService`
- Subscribe to `job.created` event
- `findBestTechnician(job): Technician | null`
  - Filter by: `TechnicianSkill.categoryId = job.serviceCategoryId`
  - Filter by: technician `status = AVAILABLE`
  - Filter by: `serviceArea` overlaps with job location (basic string/region match for MVP)
  - Rank by: `trustScore DESC`, then `rating DESC`
  - Return top candidate

#### 7.2 Assignment Creation
- `assignJob(jobId, technicianId): Assignment`
  - Create `Assignment` record with `assignedAt = now()`
  - Update `Job.status = ASSIGNED`
  - Update `Technician.status = BUSY`
  - Emit `job.assigned` event (triggers Technician Bot Phase 5.3)
  - Start 15-minute acceptance timeout timer (Redis TTL or Bull queue)

#### 7.3 Rejection & Reassignment
- On `assignment.rejected` or `assignment.timeout`:
  - Mark current assignment as rejected (add `rejectedAt` column)
  - Find next best technician (exclude previously rejected technicians for this job)
  - If technician found: repeat assignment flow
  - If no technician found: update `Job.status = NEW`, notify customer "No technician available yet, we are searching..."
  - Max reassignment attempts: 3 (configurable)
  - After max attempts: notify admin via dashboard alert

#### 7.4 Availability Management
- `setAvailable(technicianId)` — called when job completed or rejected
- `setBusy(technicianId)` — called when job assigned

#### 7.5 Service Area Matching (MVP)
- Store `serviceArea` as comma-separated string of locality names: `"Virudhunagar,Allampatti,Sattur"`
- Match: check if any locality in `serviceArea` appears in job location string (case-insensitive)
- Log a TODO comment for future GPS-based matching

#### Acceptance Criteria
- Job created for AC Service in Allampatti assigns to highest trust-score AC technician covering Allampatti
- Rejected assignment triggers reassignment to next technician
- After 3 failed assignments: admin notified, customer receives waiting message
- Completed job sets technician status back to AVAILABLE

---

## Phase 8 — Admin Dashboard (Frontend + Backend APIs)

**Status: ❌ NOT STARTED**

Goal: Operations admin can log in and manage all entities via a NextJS web dashboard. All data is live from the backend.

### Tasks

#### 8.1 Authentication APIs
- `POST /api/v1/auth/login` — email + password → JWT access token + refresh token
- `POST /api/v1/auth/refresh` — refresh token → new access token
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- Guard: `JwtAuthGuard` applied to all protected routes
- Role guard: `RolesGuard` with `@Roles('ADMIN')`

#### 8.2 Admin Login UI
- `app/(auth)/login/page.tsx` — email/password form
- On success: store JWT in HTTP-only cookie
- Redirect to `/admin/dashboard`
- Handle expired token: auto-redirect to login

#### 8.3 Dashboard KPIs API + UI
- `GET /api/v1/dashboard/kpis` returns:
  - `jobsToday`, `jobsThisWeek`, `activeJobs`
  - `revenueToday`, `revenueThisWeek`
  - `commissionEarned`, `activeTechnicians`, `pendingSettlements`
- Dashboard page: 6-card grid layout using ShadCN `Card`
- Auto-refresh every 60 seconds

#### 8.4 Customer Management
- `GET /api/v1/customers` — paginated list (name, phone, jobCount, language)
- `GET /api/v1/customers/:id` — detail with job history
- `PATCH /api/v1/customers/:id` — update name, address
- UI: TanStack Table with search, pagination, row click to detail drawer

#### 8.5 Technician Management
- `POST /api/v1/technicians` — create technician (triggers WhatsApp onboarding message)
- `GET /api/v1/technicians` — list with trustScore, rating, status, skillCount
- `GET /api/v1/technicians/:id` — detail with job history, skills, settlements
- `PATCH /api/v1/technicians/:id` — update name, phone, serviceArea, status
- `POST /api/v1/technicians/:id/skills` — assign skill categories
- `DELETE /api/v1/technicians/:id/skills/:categoryId`
- UI: table + create modal + detail page with tabs (Overview | Jobs | Skills | Settlements)

#### 8.6 Job Management
- `GET /api/v1/jobs` — list with filters: status, date range, technician, category
- `GET /api/v1/jobs/:id` — full detail with assignment history, commission, payment
- `POST /api/v1/jobs/:id/assign` — manual assign to technician
- `POST /api/v1/jobs/:id/reassign` — reassign to different technician
- `POST /api/v1/jobs/:id/cancel` — cancel with reason
- UI: table with status badges, filter bar, detail drawer with timeline

#### 8.7 Revenue Module
- `GET /api/v1/revenue/summary?period=daily|weekly|monthly`
- `GET /api/v1/revenue/breakdown?from=&to=` — by category and payment mode
- UI: summary cards + bar chart (Recharts) + breakdown table

#### 8.8 Settlement Management
- `GET /api/v1/settlements` — list by status (PENDING | PAID) + technician filter
- `POST /api/v1/settlements/generate` — generate settlements for a period (with date range input)
- `POST /api/v1/settlements/:id/pay` — mark as paid
- UI: table with generate button + date range picker + pay action

#### 8.9 Commission Rule Configuration
- `GET /api/v1/commission-rules` — list all rules
- `POST /api/v1/commission-rules` — create new rule (auto-deactivates previous)
- UI: current rules display + form to update CASH flat amount or UPI percentage

#### 8.10 Dispute Management
- `GET /api/v1/disputes` — list open disputes
- `GET /api/v1/disputes/:id` — detail with job info, amounts
- `POST /api/v1/disputes/:id/resolve` — resolve with final amount, notify both parties

#### Acceptance Criteria
- Admin can log in, JWT expires correctly, refresh works
- Dashboard KPIs match database counts
- Technician can be created from dashboard — receives WhatsApp onboarding message
- Job list filters by status and date correctly
- Manual reassignment changes assignment in DB and notifies new technician
- Settlement generation computes correct amounts

---

## Phase 9 — Invoice & Payments

**Status: ❌ NOT STARTED**

Goal: Every completed job produces a PDF invoice. Payment records are created. UPI payment links are generated and tracked.

### Tasks

#### 9.1 Invoice Generation
- Create `InvoiceService`
- `generateInvoice(jobId): Invoice`
  - Load job, customer, technician, commission data
  - Generate `invoiceNumber` (format: `INV-YYYYMMDD-NNNN`)
  - Create `Invoice` record with status `PENDING`
- Triggered automatically on `job.amount_confirmed`

#### 9.2 PDF Generation
- Use `puppeteer` or `@nestjs/pdf` (PDFKit) to render invoice HTML → PDF
- Invoice template includes: Sevagan branding, job details, amount, commission breakdown, payment mode
- Localised template — EN or TA based on customer language
- Upload PDF to MinIO `invoices/{invoiceId}.pdf`
- Store `pdfUrl` on `Invoice` record
- Send PDF link to customer via WhatsApp after generation

#### 9.3 Payment Recording
- `POST /api/v1/payments` — create payment record
- `recordCashPayment(invoiceId): Payment` — status `COMPLETED` immediately
- `recordUpiPayment(invoiceId, transactionRef): Payment` — status `PENDING` until confirmed

#### 9.4 UPI Payment Flow (MVP Simplified)
- On `COMPLETE 1200 UPI`:
  - Generate UPI deep link: `upi://pay?pa=sevagan@upi&am=1200&tn=JOB123`
  - Send link to customer via WhatsApp
  - Admin manually confirms receipt in dashboard → status updated to COMPLETED

#### 9.5 Invoice APIs
- `GET /api/v1/invoices` — list with job and customer info
- `GET /api/v1/invoices/:id` — detail
- `GET /api/v1/invoices/:id/pdf` — redirect to signed MinIO URL

#### Acceptance Criteria
- Completed job produces PDF invoice in MinIO within 30 seconds
- Customer receives WhatsApp message with invoice PDF link
- Cash payment recorded as COMPLETED immediately
- UPI deep link sent to customer with correct amount
- Admin can view all invoices and download PDFs

---

## Phase 10 — AI Dispatcher

**Status: ❌ NOT STARTED**

Goal: Free-text customer messages are understood by an AI model, mapped to service categories, and handled in the user's language without hardcoded rules.

### Tasks

#### 10.1 Ollama Integration
- Create `OllamaService`
- `chat(messages: ChatMessage[]): string` — calls `POST /api/chat` on Ollama
- Configure base URL from `OLLAMA_BASE_URL` env var
- Default model: `qwen3` (configurable per `AI_MODEL` env var)
- Timeout: 10 seconds

#### 10.2 OpenAI Fallback
- Create `OpenAIService` implementing same interface as `OllamaService`
- `chat(messages): string` — calls OpenAI chat completions API
- Activate when `OPENAI_FALLBACK=true` or when Ollama throws timeout/connection error

#### 10.3 AI Provider Abstraction
```typescript
interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>
}
```
- `AIService` tries `OllamaProvider` first, falls back to `OpenAIProvider`
- Log which provider was used per request

#### 10.4 Intent Classification
- Create `IntentClassifierService`
- System prompt defines available intents: `REQUEST_SERVICE`, `TRACK_JOB`, `CANCEL_JOB`, `FAQ_HOURS`, `FAQ_PRICING`, `FAQ_COVERAGE`, `UNKNOWN`
- `classifyIntent(userMessage: string, language: Language): IntentResult`
- Return: `{ intent, confidence, detectedLanguage }`

#### 10.5 Service Category Mapping
- `mapToServiceCategory(userMessage: string): ServiceCategory | null`
- System prompt lists all 8 categories with synonyms in EN + TA
- Returns matched category or null for ambiguous input (bot then shows full category list)

#### 10.6 Language Detection
- `detectLanguage(text: string): Language`
- Prompt: single-call classification returning `"EN"` or `"TA"`
- Used as override check — if detected language differs from stored preference, update preference automatically

#### 10.7 FAQ Responses
- `generateFAQResponse(intent: FAQIntent, language: Language): string`
- Use TranslationService for structured FAQ answers (not AI-generated — controlled content)
- AI only used for open-ended queries not matching a known FAQ

#### 10.8 AI Dispatcher Integration into Customer Bot
- Replace keyword-matching in `CustomerBotService` (Phase 4) with AI intent classification
- Retain keyword fallback (`HELP`, `STATUS`, `CANCEL`) for reliability
- AI handles free-form service requests

#### Acceptance Criteria
- "Need electrician" → `REQUEST_SERVICE` intent → `Electrical` category
- "எலக்ட்ரீஷியன் வேண்டும்" → `REQUEST_SERVICE` intent → detected language `TA` → `Electrical`
- "What are your working hours?" → `FAQ_HOURS` → structured FAQ response in EN
- Ollama timeout → falls back to OpenAI automatically (log shows fallback)
- Response time < 3 seconds for intent classification

---

## Phase 11 — Reports

**Status: ❌ NOT STARTED**

Goal: Admin can view and export operational reports covering revenue, jobs, ratings, and technician trust.

### Tasks

#### 11.1 Report APIs
- `GET /api/v1/reports/revenue?from=&to=&groupBy=day|week|month`
  - Returns: `[{ period, totalRevenue, commissionEarned, jobCount }]`
- `GET /api/v1/reports/jobs?from=&to=&status=&categoryId=`
  - Returns: job list with completion rate, average amount
- `GET /api/v1/reports/ratings?technicianId=&from=&to=`
  - Returns: average rating per technician, rating distribution
- `GET /api/v1/reports/trust?from=&to=`
  - Returns: technician list with trust score history summary

#### 11.2 CSV Export
- All report endpoints accept `?format=csv` query param
- Return `Content-Type: text/csv`, `Content-Disposition: attachment` response
- Generate CSV using `fast-csv`

#### 11.3 Report UI
- `app/(admin)/reports/page.tsx`
- Tabs: Revenue | Jobs | Ratings | Trust
- Date range picker (ShadCN DateRangePicker)
- Revenue tab: line/bar chart (Recharts) + summary table
- Jobs tab: table with status breakdown
- Ratings tab: bar chart of rating distribution + technician ranking table
- Trust tab: table sorted by trust score with delta indicator

#### Acceptance Criteria
- Revenue report for past 7 days returns correct aggregated amounts
- CSV export for revenue downloads valid CSV with correct headers and data
- Ratings report shows correct averages per technician
- UI date range filter correctly queries API with ISO date strings

---

## Phase 12 — Security

**Status: ❌ NOT STARTED**

Goal: All API endpoints are protected, inputs are validated, rate limiting is active, and all admin actions are audited.

### Tasks

#### 12.1 JWT Authentication
- Access token: 15 min expiry, signed with `JWT_SECRET`
- Refresh token: 7 day expiry, stored in HTTP-only cookie
- `JwtAuthGuard` applied globally; `@Public()` decorator exempts webhook and health endpoints
- Token rotation: refresh endpoint issues new refresh token and invalidates old

#### 12.2 RBAC
- Define roles: `ADMIN`, `SUPER_ADMIN`
- `RolesGuard` checks `@Roles()` metadata on routes
- Super admin can manage admins; admin cannot
- Seed super admin account in database seed

#### 12.3 Rate Limiting
- Install `@nestjs/throttler`
- Global: 100 requests / minute per IP
- Webhook endpoint: 300 requests / minute (higher limit for Meta)
- Auth endpoints: 10 requests / minute per IP (brute-force protection)

#### 12.4 Input Validation
- All DTOs use `class-validator` decorators
- `ValidationPipe` is globally enabled with `whitelist: true, forbidNonWhitelisted: true`
- Sanitize string inputs (trim whitespace, strip HTML tags)
- Validate phone numbers: must be E.164 format (`+91XXXXXXXXXX`)

#### 12.5 Webhook Security
- HMAC-SHA256 verification of `X-Hub-Signature-256` header (implemented in Phase 3)
- Reject payloads with missing or invalid signature: `403 Forbidden`
- Log all rejected webhook attempts to AuditLog

#### 12.6 Audit Logging
- `AuditLogService.log(actor, action, entityType, entityId, metadata)`
- Interceptor: auto-log all `POST`, `PATCH`, `DELETE` admin API calls
- Store in `AuditLog` table
- `GET /api/v1/audit-logs` — admin-only, paginated, filterable by actor and entity

#### 12.7 HTTPS Enforcement
- Nginx config: redirect all HTTP → HTTPS
- HSTS header: `Strict-Transport-Security: max-age=31536000`
- Secure cookie flags on refresh token cookie: `HttpOnly`, `Secure`, `SameSite=Strict`

#### Acceptance Criteria
- Unauthenticated request to `/api/v1/jobs` returns `401`
- Invalid JWT returns `401`
- Non-admin JWT returns `403` on admin-only routes
- 11th auth request in a minute returns `429`
- Webhook with wrong signature returns `403`
- All admin create/update/delete actions appear in audit log

---

## Phase 13 — Production Deployment

**Status: ❌ NOT STARTED**

Goal: Application is live on EC2 with HTTPS, running via Docker Compose, with backups and monitoring.

### Tasks

#### 13.1 EC2 Setup
- Launch Ubuntu 22.04 LTS EC2 instance (minimum t3.medium for MVP)
- Configure Security Groups: allow 22 (SSH), 80 (HTTP), 443 (HTTPS); deny all other inbound
- Attach Elastic IP
- Create IAM role with minimal permissions (no root access)

#### 13.2 Docker Compose Production Config
- Create `docker-compose.prod.yml`:
  - Remove volume mounts for source code
  - Add `restart: unless-stopped` on all services
  - Use production Dockerfile (multi-stage build, `NODE_ENV=production`)
  - Add `logging.driver: json-file` with `max-size: 10m, max-file: 3`
  - Pin all image versions
- Separate `nginx/nginx.prod.conf` with SSL config

#### 13.3 Production Dockerfiles
- `apps/backend/Dockerfile` — multi-stage: build stage (compile TS) → runtime stage (node:20-alpine, copy dist only)
- `apps/frontend/Dockerfile` — multi-stage: build stage (next build) → runtime stage (next start)
- No `devDependencies` in production images
- Non-root user in all containers

#### 13.4 SSL with Let's Encrypt
- Install Certbot on EC2
- Obtain certificate for domain: `api.sevagan.in` (or configured domain)
- Configure Nginx to serve HTTPS with certificate
- Set up cron job for auto-renewal: `0 3 * * * certbot renew --quiet`

#### 13.5 Environment Secrets on EC2
- Store production secrets in `/etc/sevagan/.env` (permissions: 600, owned by deploy user)
- Reference from `docker-compose.prod.yml` via `env_file`
- Never commit `.env` to git

#### 13.6 Database Backup
- Daily PostgreSQL dump: `pg_dump` → compressed `.sql.gz`
- Upload to S3 bucket (or MinIO) with 30-day retention
- Cron job: `0 2 * * * pg_dump ... | gzip > backup-$(date +%Y%m%d).sql.gz`
- Test restore procedure documented

#### 13.7 Deployment Script
- Create `scripts/deploy.sh`:
  ```bash
  git pull origin master
  docker compose -f docker-compose.prod.yml build
  docker compose -f docker-compose.prod.yml up -d --remove-orphans
  docker compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
  ```
- Zero-downtime: new containers start before old ones stop (Compose rolling update)

#### 13.8 Meta Webhook Registration
- Register production webhook URL with Meta: `https://api.sevagan.in/api/v1/webhook`
- Verify token matches `WHATSAPP_VERIFY_TOKEN` env var
- Subscribe to `messages` field on phone number

#### 13.9 Health Monitoring
- Configure UptimeRobot (free tier) to monitor `https://api.sevagan.in/api/v1/health`
- Alert to `selvakumar.rayappan@gmail.com` on downtime
- Add Nginx access log parsing script for basic traffic review

#### Acceptance Criteria
- `https://api.sevagan.in/api/v1/health` returns `{ "status": "ok" }` with valid SSL
- HTTP redirects to HTTPS
- WhatsApp message received → processed → reply sent (end-to-end on production)
- `docker compose -f docker-compose.prod.yml ps` shows all services healthy
- Daily backup job visible in crontab; test restore completes successfully
- Deployment script runs without manual intervention

---

# CLAUDE CODE EXECUTION RULES

For every phase:

1. Explain architecture decisions.
2. Generate folder structure.
3. Generate code.
4. Generate migrations.
5. Generate APIs.
6. Generate tests.
7. Generate Docker updates.
8. Verify build passes.
9. Provide acceptance criteria.

Never use placeholders.

Generate production-ready code.

Do not move to the next phase until the current phase is complete.