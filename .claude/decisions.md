# Architectural Decisions — Sevagan

## ADR-001: WhatsApp-Only MVP (No Mobile Apps)

**Status:** Accepted  
**Date:** 2026-06

**Decision:** All customer and technician interactions happen via WhatsApp Cloud API. No native iOS/Android apps for MVP.

**Rationale:**
- Virudhunagar target market has high WhatsApp penetration
- Zero friction — no app install required
- Technicians already use WhatsApp daily
- Reduces MVP development time by 60%+

**Consequences:**
- Conversation UX is constrained by WhatsApp message types (text, lists, buttons)
- Webhook HMAC verification is mandatory for security
- Session state must be managed server-side (Redis)

---

## ADR-002: PostgreSQL over MongoDB

**Status:** Accepted  
**Date:** 2026-06

**Decision:** Use PostgreSQL 16 with Prisma ORM.

**Rationale:**
- Financial data (commissions, settlements, payments) needs ACID transactions
- Complex joins between jobs, assignments, technicians are efficient in relational DB
- Prisma provides type-safe queries and migration tooling

**Consequences:**
- Schema changes require Prisma migrations (not flexible like document DB)
- All schema edits go through `schema.prisma` → `prisma migrate dev`

---

## ADR-003: Ollama Local AI + OpenAI Fallback

**Status:** Accepted  
**Date:** 2026-06

**Decision:** Primary AI runs on Ollama (local Docker container, qwen3 model). OpenAI is the fallback.

**Rationale:**
- Reduces per-request cost to near-zero for most queries
- Data privacy — customer messages don't leave infrastructure by default
- OpenAI fallback ensures reliability during Ollama outages

**Consequences:**
- AI Dispatcher (Phase 10) must implement provider abstraction with fallback logic
- EC2 instance must have enough RAM for the chosen Ollama model
- Response latency may be higher than cloud AI

---

## ADR-004: Redis for Conversation State

**Status:** Accepted  
**Date:** 2026-06

**Decision:** WhatsApp conversation state stored in Redis with TTL (not PostgreSQL).

**Rationale:**
- Ephemeral — conversation sessions expire naturally (24h TTL)
- Fast reads/writes for high-frequency webhook events
- No database schema changes needed as conversation flows evolve

**Consequences:**
- Redis must be persistent (`appendonly yes`) to survive restarts during active conversations
- Session data is lost if Redis volume is deleted
- TTL must be tuned — too short truncates multi-step flows, too long wastes memory

---

## ADR-005: MinIO over Cloud S3

**Status:** Accepted  
**Date:** 2026-06

**Decision:** Use self-hosted MinIO (S3-compatible) instead of AWS S3.

**Rationale:**
- Zero per-request cost for invoice PDF storage
- Same S3 API — can switch to AWS S3 with env var change only
- Runs in the same Docker Compose stack, no external dependencies for dev

**Consequences:**
- Must back up MinIO volumes in production (Phase 13)
- MinIO console available at port 9001 for manual management

---

## ADR-006: npm Workspaces over Turborepo

**Status:** Accepted  
**Date:** 2026-06

**Decision:** Use npm native workspaces (`backend`, `frontend`) instead of Turborepo or Nx.

**Rationale:**
- No additional tooling to learn or maintain
- Two packages only — Turborepo's caching benefits are marginal at this scale
- Scripts in root `package.json` provide sufficient DX

**Consequences:**
- No build caching between workspaces
- If packages grow beyond 3–4, reconsider Turborepo

---

## ADR-007: Admin Dashboard English-Only (MVP)

**Status:** Accepted  
**Date:** 2026-06

**Decision:** Admin dashboard (`frontend/`) is English-only for MVP. Multilingual requirement applies only to WhatsApp-facing flows.

**Rationale:**
- Operations team is comfortable in English
- Reduces frontend localization scope significantly for MVP

**Consequences:**
- Phase 2 of admin (post-MVP) will add Tamil UI if needed
- `TranslationService` is backend-only for now

---

## ADR-008: Commission Calculated at Completion, Not Pre-Quoted

**Status:** Accepted  
**Date:** 2026-06

**Decision:** Commission is calculated at job completion time using the current active `CommissionRule`, not at job creation.

**Rationale:**
- Rules may change between job creation and completion
- Customer pays the stated job amount; commission is between Sevagan and technician only

**Consequences:**
- `JobCommission` records the values at the moment of settlement (audit trail)
- If commission rules change mid-flight, the new rule applies
