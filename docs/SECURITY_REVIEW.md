# Security Review — Phase 12

**Date:** 2026-06-30
**Scope:** Backend API (`backend/`), admin auth/authorization, audit logging, rate limiting, input validation.

This review assesses the platform against the OWASP Top 10 (2021) and records what Phase 12 changed versus what remains for later phases.

---

## A01:2021 — Broken Access Control

**Before Phase 12:** All authenticated admin users (regardless of role) could call every admin endpoint, including financial actions (commission rule changes, settlement payouts, payment confirmation, dispute resolution).

**Now:**
- RBAC added via `@Roles()` decorator + `RolesGuard` (`backend/src/modules/auth/roles.guard.ts`), registered globally as the third `APP_GUARD` (after `ThrottlerGuard` and `JwtAuthGuard`, so it always runs against an already-authenticated request).
- `AdminRole.ADMIN`-only endpoints: create commission rule, generate/pay settlements, confirm invoice payment, resolve disputes, view audit logs.
- `AdminRole.OPERATOR` retains day-to-day operational access: customers, technicians, jobs (assign/cancel), service categories.
- Every protected route still requires a valid JWT (`JwtAuthGuard`, global) unless explicitly marked `@Public()` (webhook + auth login/refresh).

**Residual risk:** There is no endpoint yet to manage `AdminUser` records (create/deactivate/change role) — admin accounts are provisioned only via `prisma/seed.ts` or direct DB access. Acceptable for MVP single-tenant ops; revisit if the admin team grows.

---

## A02:2021 — Cryptographic Failures

- Passwords hashed with bcrypt (cost factor 10) — `auth.service.ts`, `prisma/seed.ts`.
- JWTs signed with HS256, access token 15m / refresh token 7d, separate secrets for access vs refresh.
- **Finding:** `JWT_SECRET` / `JWT_REFRESH_SECRET` fall back to hardcoded dev strings (`app.config.ts`) when the env var is unset. This is intentional for local dev (matches the existing pattern for `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` defaults) but **must** be set to strong random values before Phase 13 production deployment. Tracked as a Phase 13 deployment checklist item, not a code defect.
- TLS termination is deferred to Phase 13 (Nginx + Let's Encrypt) — no plaintext-credential transport risk introduced by this phase.

---

## A03:2021 — Injection

- All database access goes through Prisma's typed query builder — confirmed zero usages of `$queryRaw`/`$executeRaw` anywhere in `backend/src`.
- **Fixed in this phase:** six admin controllers and the auth controller accepted `@Body()` as a plain inline TypeScript interface with no `class-validator` decorators. Because NestJS's `ValidationPipe` (with `whitelist`/`forbidNonWhitelisted`) only enforces shape against an actual decorated class, these bodies were previously **unvalidated** — arbitrary extra fields or wrong types could reach `prisma.update({ data: body })` calls (a mass-assignment risk, e.g. on `customers.controller.ts#update` and `technicians.controller.ts#update`).
  Replaced with validated DTO classes (`backend/src/modules/admin/dto/*.dto.ts`, `backend/src/modules/auth/dto/auth.dto.ts`) using `@IsString`, `@IsEnum`, `@IsUUID`, `@IsDateString`, `@MaxLength`, etc. Global `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true`) now actually strips/rejects unexpected fields on every admin/auth mutation.

---

## A04:2021 — Insecure Design

- WhatsApp webhook authenticity verified via HMAC-SHA256 signature (`WebhookHmacGuard`) — unchanged, already in place from Phase 3.
- Conversation state machine in `CustomerBotService`/`TechnicianBotService` only accepts numeric menu input or recognized commands at each state; the Phase 10 AI dispatcher fallback never accepts pure-digit input, so it can't be used to bypass the structured flow.
- No design changes required this phase beyond RBAC.

---

## A05:2021 — Security Misconfiguration

- `helmet()` applied globally; CORS restricted to `https://admin.sevagan.ai` in production, permissive only in development (`main.ts`).
- **Fixed in this phase:** `ThrottlerModule` was configured (`app.module.ts`, 30 req/min default) but `ThrottlerGuard` was **never registered** anywhere — rate limiting was completely inert despite the module being present. Now registered globally as `APP_GUARD` in `AuthModule`, with `/auth/login` and `/auth/refresh` further restricted to 5 requests/min via `@Throttle()` to blunt credential-stuffing/brute-force attempts.
- Swagger UI (`/api/docs`) is disabled outside development (`main.ts`) — confirmed unchanged and correct.

---

## A06:2021 — Vulnerable and Outdated Components

- No raw SQL, no `eval`/`Function` constructor usage found in `backend/src`.
- `npm audit` on the frontend reported 3 pre-existing vulnerabilities (2 moderate, 1 high) in transitive dependencies pulled in by `recharts` (Phase 11). Not remediated automatically (`npm audit fix --force` would force breaking major-version bumps) — flagged for a deliberate dependency-bump pass before Phase 13, not blocking for MVP since charts run admin-side only, behind auth.
- Prisma 6.19.3 has a major version (7.x) available; staying on 6.x for this MVP, no known CVEs against the pinned version at time of writing.

---

## A07:2021 — Identification and Authentication Failures

- `JwtStrategy` re-validates the admin user (`active: true`) on every request — a deactivated admin's existing tokens stop working immediately, not just at next login.
- Refresh tokens are verified with a distinct secret from access tokens, preventing a leaked access token from being replayed as a refresh token.
- **Fixed in this phase:** login/refresh now rate-limited (see A05) and every successful login is now audit-logged.
- Logout (`POST /auth/logout`) is stateless (just a client-side token discard) — there is no server-side token revocation/blacklist. Acceptable given the short (15m) access token lifetime; a revocation list would be a reasonable Phase 13+ hardening item if needed.

---

## A08:2021 — Software and Data Integrity Failures

- No unsigned/unverified deserialization of remote code. WhatsApp inbound payloads are typed and validated through DTOs/guards before use.
- Invoice PDFs are generated server-side from trusted DB data (not user-supplied HTML), ruling out PDF-injection-style attacks.

---

## A09:2021 — Security Logging and Monitoring Failures

**Before Phase 12:** No audit trail existed for any admin action — only ad-hoc `Logger` calls to stdout, not queryable, not persisted per-actor.

**Now:**
- `AuditLog` table (migration `20260630163120_add_audit_log`) + `AuditService` (`backend/src/infrastructure/audit/`), globally available.
- Logged actions: `LOGIN`, `CREATE_COMMISSION_RULE`, `GENERATE_SETTLEMENT`, `MARK_SETTLEMENT_PAID`, `CONFIRM_PAYMENT`, `RESOLVE_DISPUTE`, `CREATE_TECHNICIAN`, `UPDATE_TECHNICIAN`, `UPDATE_CUSTOMER`, `MANUAL_ASSIGN_JOB`, `CANCEL_JOB` — each records `actorId`, `actorType`, `entityType`, `entityId`, and a `metadata` JSON snapshot of the relevant change.
- `GET /api/v1/admin/audit-logs` (ADMIN-only) exposes the trail, paginated and filterable by `entityType`/`actorId`.
- `AuditService.log()` never throws — a logging failure degrades gracefully (logged via `Logger.error`) rather than blocking the underlying business action, consistent with the rest of the codebase's fire-and-forget error handling pattern.

**Residual gap:** Read-only admin actions (list/view) are not audited — by design, to avoid noise; only state-changing actions are logged.

---

## A10:2021 — Server-Side Request Forgery (SSRF)

- The AI Dispatcher (`OllamaProvider`, `OpenAIProvider`) calls external HTTP endpoints, but both URLs are sourced from server-side env config (`OLLAMA_BASE_URL`, hardcoded OpenAI URL) — never from user input. No SSRF vector.
- `PaymentService.generatePaymentLink()` builds a Razorpay URL from a configured base (`RAZORPAY_LINK_URL`) plus a numeric amount and a job number — no user-controlled URL component.

---

## Summary of Changes Made This Phase

| Area | Change |
|------|--------|
| RBAC | `@Roles()` decorator + `RolesGuard`, applied to all financial/config-changing admin endpoints |
| Rate limiting | `ThrottlerGuard` registered globally (was previously configured but inert); stricter 5/min throttle on login/refresh |
| Input validation | 8 new DTO classes replace unvalidated inline body types across 6 admin controllers + auth controller |
| Audit logging | New `AuditLog` table + `AuditService` + `GET /admin/audit-logs`; wired into 11 sensitive mutation endpoints |
| Tests | 76 new tests (RolesGuard, AuditService, AuditLogsController, DTO validation, plus updated controller/service specs) |

## Known Gaps Carried Forward (not blocking Phase 12 sign-off)

1. `JWT_SECRET`/`JWT_REFRESH_SECRET`/`RAZORPAY_LINK_URL` dev fallbacks must be overridden with real values in Phase 13's production `.env`.
2. No admin-user management endpoints (create/deactivate/change role) — provisioning is seed/DB-only.
3. Frontend `npm audit` flags 3 transitive vulnerabilities via `recharts` — needs a deliberate dependency review before launch.
4. `JobsAdminController.manualAssign` accepts a `technicianId` in its DTO (now UUID-validated) but the underlying `AssignmentEngineService.tryAssignJob` call does not actually target that specific technician — it re-runs the generic best-match algorithm. Functional bug, not a security issue (no privilege escalation); pre-dates Phase 12 and is left as-is to avoid scope creep into Phase 8 behavior.
5. ~~`test/whatsapp-flow.e2e-spec.ts` fails locally with a Redis "Connection is closed" error~~ — **Resolved 2026-07-14.** Root cause: the webhook handler dispatches bot processing fire-and-forget (`WebhookController.dispatchMessage`, never awaited), and the test's free-text "Hello" message triggered the real AI-dispatch fallback, which made live Ollama/OpenAI HTTP calls that took ~1.6s to fail — far longer than the test's fixed 100ms wait. The test would move on, fail its assertion, and tear down (`app.close()` → `redis.quit()`) before the background dispatch finished; when it finally did, `ConversationStateService` tried to write to an already-closed Redis connection. Fixed by overriding `AIService` in the e2e test with a fast-rejecting mock, removing the dependency on live external AI network calls. See `.github/workflows/ci.yml` and the Sprint 1 fixes in `docs/ANALYSIS_REPORT.md`.
6. **Found and resolved 2026-07-14:** the working-tree copy of root `docker-compose.yml` had real-looking WhatsApp Cloud API credentials (`WA_ACCESS_TOKEN`, `WA_APP_SECRET`, `WA_WEBHOOK_VERIFY_TOKEN`) hardcoded as `${VAR:-default}` fallbacks — never committed (the tracked `HEAD` version has empty defaults), but a live leak risk had it been committed. Moved the values into a gitignored root `.env` and reverted `docker-compose.yml`'s fallbacks to empty, matching the pattern used for every other secret in that file. If these credentials were ever used against the real Meta Cloud API, rotate them.

---

## Addendum — 2026-07-14: Remaining `.claude/task-backlog.md` Phase 12 items closed

The pass above (2026-06-30) covered RBAC, audit logging, rate-limiting registration, and DTO validation. The detailed 18-item Phase 12 checklist in `.claude/task-backlog.md` had further items not yet addressed; this addendum closes them and **supersedes** a few statements above.

- **A02/A07 — supersedes "Logout is stateless... no server-side token revocation":** that is no longer accurate. `AdminUser.tokenVersion` (migration `20260714122214_add_admin_token_version`) is now embedded in every JWT payload and checked on every request (`JwtStrategy.validate`) and every refresh (`AuthService.refreshToken`). `POST /auth/logout` and every refresh increment it, which immediately invalidates **all** outstanding access and refresh tokens for that admin — not just the one presented. Verified live: refreshing rotates the cookie and instantly 401s the pre-rotation access token; logging out 401s the just-issued access token on the next request and rejects the old refresh cookie.
- **A02 — refresh token delivery:** moved from the JSON response body to an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production), scoped to path `/api/v1/auth` so it's never sent to unrelated routes. Verified live via `Set-Cookie` header inspection.
- **A05 — rate limiting corrected:** `/auth/login` and `/auth/refresh` throttle is **10 req/min** (not 5 — the earlier note above undersold the spec'd value). The WhatsApp webhook POST handler is separately throttled at 300 req/min (previously fell through to the 30/min global default, which would have 403'd legitimate burst traffic from Meta). Verified live: the 11th login attempt within 60s returns `429`.
- **A03 — input sanitization:** a global `SanitizePipe` (`backend/src/common/pipes/sanitize.pipe.ts`) now runs before `ValidationPipe`, trimming whitespace and stripping HTML tags from every string in request bodies.
- **A03 — phone number validation:** technician phone input is now validated against an E.164-tolerant Indian mobile pattern (`IsIndianPhone`, `backend/src/common/validators/`) and normalized via the existing `normalizePhone()` before persistence — closes a latent bug where an admin-entered `+91...`-prefixed number would never match the digits-only format used to look up technicians by WhatsApp sender ID.
- **A04 — webhook rejection visibility:** `WebhookHmacGuard` now logs every rejected signature attempt to `AuditLog` (`WEBHOOK_SIGNATURE_REJECTED`, with reason/IP/path) instead of only a stdout `Logger` call.
- **A09 — blanket audit coverage:** a new `AuditInterceptor` is applied to every mutating admin controller, guaranteeing every `POST`/`PATCH`/`PUT`/`DELETE` admin call lands in `AuditLog` even where a controller doesn't (yet) make its own richer, action-specific `log()` call — a safety net alongside the existing 11 manually-logged actions, not a replacement for them.
- **A05 — HTTPS/HSTS:** addressed as part of Phase 13's production nginx config (`infrastructure/nginx/nginx.prod.conf.template`) — HTTP→HTTPS redirect and `Strict-Transport-Security: max-age=31536000; includeSubDomains` on both domains, plus `helmet({ hsts })` enabled when `NODE_ENV=production`. The dev-mode `infrastructure/nginx/nginx.conf` intentionally stays HTTP-only.

All of the above verified with `npx jest` (427 tests passing, up from 417) and live `curl` exercises against the running dev stack (login → refresh rotation → old-token rejection → logout → cookie clearing; rate-limit 429 on the 11th auth request).
