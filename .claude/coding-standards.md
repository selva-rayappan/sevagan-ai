# Coding Standards — Sevagan

## TypeScript

- Strict mode enabled — no `any`, no implicit returns
- Prefer `interface` over `type` for object shapes
- Use `enum` from `backend/src/domain/enums/` — never redefine locally
- All async functions must `await` or return a `Promise` explicitly
- Destructure only what you need; don't spread unknown objects

## NestJS Backend Patterns

### Layer Responsibilities
```
Controller  → HTTP boundary only (parse input, call service, return DTO)
Service     → Business logic (orchestrates repositories, enforces rules)
Repository  → Database access only (Prisma calls, no business logic)
Domain      → Pure types: entities, enums, value objects (no deps)
Infrastructure → External systems: DB, cache, storage, messaging, i18n
```

### Module Rules
- Every feature module exports its `Repository` and `Service` (not both unless needed)
- Infrastructure modules are `@Global()` — do not re-import them in feature modules
- Use constructor injection — never `ModuleRef.get()` unless absolutely necessary

### DTO / Validation
- All incoming request bodies use a class with `class-validator` decorators
- `whitelist: true` and `forbidNonWhitelisted: true` are enabled globally — don't bypass
- Response shape is controlled by `TransformInterceptor` — return plain objects from services

### Messages — Mandatory Rule
```typescript
// WRONG — hardcoded string
await this.whatsapp.sendText(phone, "Job assigned to technician");

// RIGHT — always through TranslationService
const msg = this.translation.translate("job.assigned", language, { techName });
await this.whatsapp.sendText(phone, msg);
```

### Translation Keys
- Dot-notation: `"customer.welcome"`, `"job.assigned"`, `"technician.newJob"`
- All keys must exist in both `en.json` AND `ta.json`
- Falls back to EN if a TA key is missing (handled by TranslationService)

## Next.js Frontend Patterns

- App Router only — no `pages/` directory
- Server components by default; `"use client"` only when state/events required
- API calls go through `frontend/src/lib/api.ts` — no raw `fetch` in components
- TailwindCSS for all styling — no inline styles, no CSS modules
- `clsx` + `tailwind-merge` for conditional class composition via `cn()` utility
- `lucide-react` for icons — no other icon library

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| NestJS module | kebab-case | `jobs.module.ts` |
| NestJS service | kebab-case | `jobs.service.ts` |
| NestJS controller | kebab-case | `webhook.controller.ts` |
| NestJS DTO | kebab-case | `create-job.input.ts` |
| React component | PascalCase | `JobsTable.tsx` |
| React hook | camelCase with `use` prefix | `useJobs.ts` |
| Utility | camelCase | `formatCurrency.ts` |

## Testing

- Test files co-located with source: `*.spec.ts`
- E2E tests in `backend/test/`
- Coverage gate: 80% (branches, functions, lines, statements) — enforced by CI
- Excluded from coverage: `*.module.ts`, `main.ts`, all enums, infrastructure adapters, config, prisma
- Mock only at system boundaries (external APIs, DB) — prefer real implementations in unit tests where fast enough
- Use `@nestjs/testing` `Test.createTestingModule()` for NestJS unit tests

## Git Conventions

- Branch: `phase-N/short-description` (e.g., `phase-5/technician-bot`)
- Commits: imperative mood, present tense (`add technician accept flow`, not `added`)
- One logical change per commit
- Never `--no-verify` without explicit user approval

## Security Basics

- Never log secrets, tokens, or full phone numbers
- Sanitize all user input at the controller layer (ValidationPipe handles this)
- HMAC verification is mandatory for all WhatsApp webhook calls (`WebhookHmacGuard`)
- JWT expiry default: 7 days — don't extend without a reason
