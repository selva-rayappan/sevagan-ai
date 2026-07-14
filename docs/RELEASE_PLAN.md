# Release Plan — Sevagan MVP

**Target:** Virudhunagar, Tamil Nadu  
**Timeline:** 6–8 weeks from Phase 0 start  
**Deployment:** Single EC2 instance, Docker Compose

---

## Release Gates

A phase may not be released until:
- [ ] All phase tasks marked ✅ in `docs/EXECUTION_PLAN.md`
- [ ] Unit test coverage ≥ 80%
- [ ] Manual WhatsApp flow tested end-to-end
- [ ] No P0/P1 bugs open

---

## Milestone Plan

### Milestone 1 — Infrastructure Ready (Phases 0–2)
**Goal:** Database schema live, dev environment stable.

Deliverables:
- Monorepo structure set up (`backend/`, `frontend/`)
- Docker Compose stack running (PostgreSQL, Redis, MinIO, Ollama)
- Prisma schema migrated and seeded
- Health endpoint live: `GET /api/v1/health`
- NestJS + Next.js both boot without errors

**Status:** ✅ Complete

---

### Milestone 2 — WhatsApp Bot (Customer) (Phases 3–4)
**Goal:** A customer can request and track a service entirely via WhatsApp.

Deliverables:
- WhatsApp webhook verified with Meta
- Customer bot: language selection, service request, location, time, job creation
- Customer bot: TRACK, CANCEL, HELP commands
- Translation: all messages in EN + TA
- Conversation state in Redis

**Status:** ✅ Complete

---

### Milestone 3 — WhatsApp Bot (Technician) (Phase 5)
**Goal:** A technician can receive, accept, start, and complete a job via WhatsApp.

Deliverables:
- Technician bot: new job notification, accept/reject
- Technician bot: START, COMPLETE commands
- Customer receives notifications on technician actions
- Amount confirmation flow

**Status:** ✅ Complete

---

### Milestone 4 — Business Logic (Phases 6–7)
**Goal:** Commission, trust score, and assignment engine working end-to-end.

Deliverables:
- Commission calculated on job completion
- Trust score updated on disputes and ratings
- Assignment engine: auto-assign top-ranked available technician
- Re-assignment on rejection

**Status:** ✅ Complete

---

### Milestone 5 — Admin Dashboard (Phase 8)
**Goal:** Operations team can manage everything via web UI.

Deliverables:
- Admin login (JWT)
- Dashboard: KPIs
- Jobs list + detail + manual actions
- Technician CRUD + skill assignment
- Customer list
- Settlement management
- Commission configuration

**Status:** ✅ Complete

---

### Milestone 6 — Invoicing + AI (Phases 9–10)
**Goal:** Auto-generated invoices and AI-assisted service classification.

Deliverables:
- PDF invoice generation on job completion
- Invoice delivered to customer via WhatsApp
- AI Dispatcher: intent classification (Ollama primary, OpenAI fallback)
- AI FAQ responses

**Status:** ✅ Complete

---

### Milestone 7 — Reports + Security (Phases 11–12)
**Goal:** Reportable data and production-hardened security.

Deliverables:
- Revenue reports (daily/weekly/monthly) — ✅ done
- Job and technician performance reports — ✅ done
- RBAC (Admin vs Operator roles) — ✅ done
- Audit logs for sensitive actions — ✅ done
- Rate limiting on auth endpoints — ✅ done (also fixed a pre-existing gap: ThrottlerGuard was never enforcing)
- OWASP Top 10 review — ✅ done, see `docs/SECURITY_REVIEW.md`
- Penetration test checklist completed — ❌ pending (deferred to pre-launch, Phase 13)

**Status:** ✅ Complete (formal penetration test deferred to pre-launch)

---

### Milestone 8 — Production Launch (Phase 13)
**Goal:** Live on EC2, accepting real customers.

Deliverables:
- EC2 provisioned and Docker Compose deployed
- Nginx + Let's Encrypt SSL configured
- DNS configured (`api.sevagan.ai`, `admin.sevagan.ai`)
- Meta WhatsApp phone number verified in Production tier
- Backups configured (PostgreSQL, MinIO)
- Monitoring set up (Uptime Robot or similar)
- Runbook written for common ops tasks

**Status:** ❌ Not Started

---

## Rollback Plan

Each Docker Compose deployment is image-tagged.  
To roll back:
```bash
docker-compose down
git checkout <previous-tag>
docker-compose up -d
npm run prisma:migrate  # if DB migration needs reverting, use Prisma rollback
```

Database migrations are one-way (no auto-down). Schema rollbacks must be applied manually if needed.
