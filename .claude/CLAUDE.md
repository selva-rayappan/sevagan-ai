# Sevagan — Claude Code Instructions

## Critical Rules (Always Apply)

### 1. Multilingual — Non-Negotiable
Every customer-facing and technician-facing WhatsApp message MUST:
- Pass through `TranslationService.translate(key, language, params?)`
- Use dot-notation keys from `backend/src/infrastructure/i18n/locales/en.json` and `ta.json`
- Never contain hardcoded strings in any business service
- Supported languages: **EN** (English) and **TA** (Tamil)

**Bad:**
```typescript
send("Your request has been created");
```

**Good:**
```typescript
send(translationService.translate("customer.job.created", customer.language, { jobNumber }));
```

### 2. Phase Progress Tracking — Mandatory
- **`docs/EXECUTION_PLAN.md` Section 18** is the single source of truth for phase status
- After every completed task: update status from ❌ → ✅ in `docs/EXECUTION_PLAN.md`
- After all tasks in a phase complete: mark phase ✅ COMPLETE, update progress table
- When a phase starts but isn't done: mark 🔄 IN PROGRESS
- Update "Last Updated" date every time Section 18 changes
- Never report a task complete without updating `docs/EXECUTION_PLAN.md` first

### 3. Project Paths (Updated Structure)
```
backend/    ← NestJS API (was apps/api/)
frontend/   ← Next.js admin dashboard (was apps/web/)
infrastructure/ ← nginx/, docker configs
docs/       ← BRD, FRD, architecture, API specs, execution plan
.claude/    ← Claude knowledge base, prompts, templates
```

### 4. No Unused Abstractions
- Don't add error handling for impossible scenarios
- Don't create helper utilities for one-time use
- Don't add feature flags or backwards-compat shims
- Three similar lines is better than premature abstraction

### 5. Comments Policy
- Default: write no comments
- Only add a comment when the WHY is non-obvious (hidden constraint, subtle invariant, vendor workaround)
- Never explain WHAT the code does — good names do that

---

## Quick Reference

### Dev Commands
```bash
npm run dev:api          # NestJS watch (port 3001)
npm run dev:web          # Next.js (port 3000)
npm run test:api         # Jest unit tests
npm run test:api:cov     # With 80% coverage gate
npm run docker:up        # Start postgres, redis, minio, ollama
npm run prisma:migrate   # Run Prisma migrations
npm run prisma:seed      # Seed initial data
```

### Key Files
| Purpose | Path |
|---------|------|
| Project overview | `.claude/project-context.md` |
| Coding standards | `.claude/coding-standards.md` |
| Architecture principles | `.claude/architecture-principles.md` |
| Workflow rules | `.claude/workflow-rules.md` |
| Task status | `.claude/task-backlog.md` |
| ADRs | `.claude/decisions.md` |
| Phase progress | `docs/EXECUTION_PLAN.md` (Section 18) |
| Prisma schema | `backend/prisma/schema.prisma` |
| Translation keys | `backend/src/infrastructure/i18n/locales/` |
| WhatsApp provider | `backend/src/infrastructure/messaging/` |
