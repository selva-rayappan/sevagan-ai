# Workflow Rules — Sevagan

## Phase Execution Protocol

1. **Check current phase** — `docs/EXECUTION_PLAN.md` Section 18 shows what's next
2. **Check task backlog** — `.claude/task-backlog.md` shows current task-level status
3. **Work one task at a time** — complete, test, then move to next
4. **Update on completion** — mark task ✅ in BOTH `docs/EXECUTION_PLAN.md` Section 18 AND `.claude/task-backlog.md`
5. **Never skip phases** — each phase builds on the previous

## Task Completion Checklist

Before marking any task ✅:
- [ ] Code written and compiles without errors
- [ ] Unit tests written and passing (`npm run test:api`)
- [ ] Coverage ≥ 80% not broken (`npm run test:api:cov`)
- [ ] Multilingual: any new user-facing message uses `TranslationService`
- [ ] Both `docs/EXECUTION_PLAN.md` and `.claude/task-backlog.md` updated

## Phase Completion Checklist

Before marking a phase ✅ COMPLETE:
- [ ] All tasks in the phase are ✅
- [ ] Phase status line in `docs/EXECUTION_PLAN.md` updated to ✅ COMPLETE
- [ ] Progress Overview table updated
- [ ] "Last Updated" date updated

## Branching Strategy

```
master          ← stable, always deployable
└── phase-N/description   ← feature branch per phase (or per task for large phases)
```

Examples:
- `phase-5/technician-bot`
- `phase-6/commission-engine`
- `phase-8/admin-dashboard`

## Commit Message Format

```
<verb> <what>

Examples:
  add technician job acceptance flow
  fix commission calculation for UPI jobs
  update translation keys for technician bot
  refactor ConversationStateService to use typed states
```

Rules:
- Imperative, present tense
- No period at end
- Max 72 chars on first line
- Reference phase in body if helpful: `Phase 5: technician accept/reject flow`

## Environments

| Env | How to run | DB |
|-----|-----------|-----|
| Local dev | `npm run dev:api` + Docker infra | localhost:5433 |
| Docker dev | `docker-compose up` | container postgres |
| Production | TBD (Phase 13) | EC2 + Docker Compose |

## Adding a New Feature Module (NestJS)

1. Create `backend/src/modules/<feature>/`
2. Add: `<feature>.module.ts`, `<feature>.service.ts`, `<feature>.repository.ts`
3. Add: `dto/`, `spec` files for each
4. Import the module in `app.module.ts`
5. Export `Service` and/or `Repository` if other modules need them
6. Add Swagger `@ApiTags('<feature>')` in `main.ts`

## Adding a New Translation Key

1. Add the key to `backend/src/infrastructure/i18n/locales/en.json`
2. Add the **same key** to `backend/src/infrastructure/i18n/locales/ta.json` (Tamil translation)
3. Use `translationService.translate('path.to.key', language, { optionalParams })`

## Running Prisma Migrations

```bash
# After editing schema.prisma:
npm run prisma:generate    # Regenerate client types
npm run prisma:migrate     # Create and run migration (dev)

# Production:
npx prisma migrate deploy  # Apply pending migrations (no prompts)
```

Never edit migration files by hand after they've been committed.
