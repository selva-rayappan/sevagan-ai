# Database Design — Sevagan

**ORM:** Prisma 6  
**Database:** PostgreSQL 16  
**Schema file:** `backend/prisma/schema.prisma`

---

## Entity Relationship Overview

```
Customer ──< Job >── ServiceCategory
                │
                ├── Assignment ──> Technician ──< TechnicianSkill >── ServiceCategory
                ├── Invoice ──> Payment
                ├── JobCommission
                ├── Rating ──> Customer, Technician
                └── Dispute

CommissionRule          (admin-configurable, no FK)
TechnicianSettlement ──> Technician
AdminUser               (separate auth — no FK to domain entities)
```

---

## Tables

### customers

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | String? | Nullable until captured |
| phone | String | UNIQUE |
| address | String? | |
| language | Language | Default: EN |
| created_at | DateTime | |
| updated_at | DateTime | |

---

### technicians

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | String | |
| phone | String | UNIQUE |
| status | TechnicianStatus | AVAILABLE / BUSY / OFFLINE |
| rating | Decimal(3,2) | Default: 5.0 |
| trust_score | Int | Default: 100 |
| service_area | String | City/area name |
| language | Language | Default: EN |
| active | Boolean | Default: true |
| created_at | DateTime | |
| updated_at | DateTime | |

**Index:** `(status, service_area)` — assignment engine query

---

### service_categories

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | String | UNIQUE |
| description | String? | |
| active | Boolean | Default: true |

**Seed data:** Electrical, Plumbing, AC Service, Carpentry, Painting, Appliance Repair, RO Service, CCTV Installation

---

### technician_skills

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| technician_id | UUID | FK → technicians |
| category_id | UUID | FK → service_categories |

**Unique:** `(technician_id, category_id)`

---

### jobs

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| job_number | String | UNIQUE (e.g. JOB2026-001) |
| customer_id | UUID | FK → customers |
| service_category_id | UUID | FK → service_categories |
| status | JobStatus | NEW → ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED \| CANCELLED |
| description | String? | |
| location | String | Customer-provided text |
| scheduled_time | DateTime? | |
| job_amount | Decimal(10,2)? | Set by technician on completion |
| payment_mode | PaymentMode? | CASH or UPI |
| created_at | DateTime | |
| updated_at | DateTime | |

**Indexes:** `(status)`, `(customer_id)`, `(created_at)`

---

### assignments

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| job_id | UUID | UNIQUE FK → jobs |
| technician_id | UUID | FK → technicians |
| assigned_at | DateTime | |
| accepted_at | DateTime? | Set when technician replies "1" |

**Index:** `(technician_id)`

---

### invoices

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| invoice_number | String | UNIQUE |
| job_id | UUID | UNIQUE FK → jobs |
| amount | Decimal(10,2) | |
| status | InvoiceStatus | DRAFT → SENT → PAID |
| pdf_url | String? | MinIO URL |
| created_at | DateTime | |

---

### payments

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| invoice_id | UUID | UNIQUE FK → invoices |
| amount | Decimal(10,2) | |
| method | PaymentMode | CASH or UPI |
| status | PaymentStatus | PENDING → COMPLETED \| FAILED \| REFUNDED |
| created_at | DateTime | |

---

### commission_rules

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| payment_mode | PaymentMode | CASH or UPI |
| commission_type | CommissionType | FLAT or PERCENTAGE |
| commission_value | Decimal(10,4) | 20.0000 or 5.0000 |
| effective_from | DateTime | |
| active | Boolean | Only one active rule per payment_mode |

**Index:** `(payment_mode, active)`

---

### job_commissions

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| job_id | UUID | UNIQUE FK → jobs |
| job_amount | Decimal(10,2) | Snapshot at settlement time |
| commission_amount | Decimal(10,2) | |
| technician_amount | Decimal(10,2) | job_amount − commission_amount |
| payment_mode | PaymentMode | |
| created_at | DateTime | |

---

### technician_settlements

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| technician_id | UUID | FK → technicians |
| gross_amount | Decimal(10,2) | Sum of job_amount for period |
| commission_amount | Decimal(10,2) | |
| net_amount | Decimal(10,2) | gross − commission |
| status | SettlementStatus | PENDING → PAID |
| created_at | DateTime | |
| paid_at | DateTime? | |

**Index:** `(technician_id, status)`

---

### ratings

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| job_id | UUID | UNIQUE FK → jobs |
| customer_id | UUID | FK → customers |
| technician_id | UUID | FK → technicians |
| rating | Int | 1–5 |
| comments | String? | |
| created_at | DateTime | |

**Index:** `(technician_id)`

---

### disputes

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| job_id | UUID | UNIQUE FK → jobs |
| customer_amount | Decimal(10,2) | Amount customer claims |
| technician_amount | Decimal(10,2) | Amount technician claims |
| status | DisputeStatus | OPEN → RESOLVED \| ESCALATED |
| notes | String? | Admin notes |
| created_at | DateTime | |
| resolved_at | DateTime? | |

**Index:** `(status)`

---

### admin_users

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | String | UNIQUE |
| password_hash | String | bcrypt |
| name | String | |
| role | AdminRole | ADMIN or OPERATOR |
| active | Boolean | |
| created_at | DateTime | |
| updated_at | DateTime | |

---

## Enums

```typescript
Language:         EN | TA
JobStatus:        NEW | ASSIGNED | ACCEPTED | IN_PROGRESS | COMPLETED | CANCELLED
PaymentMode:      CASH | UPI
PaymentStatus:    PENDING | COMPLETED | FAILED | REFUNDED
CommissionType:   FLAT | PERCENTAGE
TechnicianStatus: AVAILABLE | BUSY | OFFLINE
SettlementStatus: PENDING | PAID
InvoiceStatus:    DRAFT | SENT | PAID
DisputeStatus:    OPEN | RESOLVED | ESCALATED
AdminRole:        ADMIN | OPERATOR
```

---

## Migration Workflow

```bash
# 1. Edit backend/prisma/schema.prisma
# 2. Generate migration
npm run prisma:migrate         # creates migration file + applies
# 3. Regenerate Prisma client
npm run prisma:generate
# 4. Seed initial data
npm run prisma:seed
```

**Production:** use `prisma migrate deploy` (no prompts, applies pending migrations only).
