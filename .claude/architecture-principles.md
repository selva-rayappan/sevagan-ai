# Architecture Principles — Sevagan

## Core Principles

### 1. WhatsApp-First, Zero Apps
All customer and technician interactions happen via WhatsApp. No mobile apps in MVP.
This means the NestJS webhook handler is the primary user-facing surface — not REST endpoints consumed by a client app.

### 2. Conversation State Lives in Redis
Each WhatsApp session is keyed by phone number in Redis with a TTL.
`ConversationStateService` manages state machine transitions (e.g., `AWAITING_LOCATION` → `AWAITING_TIME`).
Never store conversation state in PostgreSQL — it's ephemeral.

### 3. TranslationService Is the Only Message Gateway
No business service may produce a user-facing string directly.
All messages route through `TranslationService.translate(key, language, params?)`.
This keeps business logic language-agnostic and makes adding a third language a config change, not a code change.

### 4. WhatsApp Provider Is an Interface
```typescript
interface IWhatsAppProvider {
  sendText(phone: string, message: string): Promise<void>;
  sendInteractiveList(phone: string, ...): Promise<void>;
  // ...
}
```
`MetaWhatsAppProvider` is the current implementation. Future providers (Twilio, etc.) require no changes to business services.

### 5. Prisma Migrations Are Source of Truth
Schema changes always happen via `prisma migrate dev`.
Never edit the DB directly.
`schema.prisma` is the authoritative database definition.

### 6. Domain Layer Has Zero Dependencies
`backend/src/domain/` contains only:
- Plain TypeScript entity types
- Enums
- Value objects

No NestJS decorators, no Prisma types, no infrastructure imports. Domain types are consumed by all other layers but depend on nothing.

### 7. Global Infrastructure Modules
`PrismaModule`, `RedisModule`, `TranslationModule`, `MessagingModule`, `MinioModule` are all `@Global()`.
Feature modules import them automatically without explicit listing.

### 8. URI Versioning
All routes: `/api/v1/...`
Swagger available at `/api/docs` (dev only).
`rawBody: true` in NestFactory is required for HMAC webhook signature verification — do not remove.

### 9. Rate Limiting by Default
`ThrottlerModule` applies 30 req/min globally.
WhatsApp webhook is excluded (Meta sends bursts).
Admin endpoints use stricter per-route `@Throttle()` decorators.

### 10. AI — Local First, Cloud Fallback
Ollama runs locally in Docker (qwen3 by default).
OpenAI is the fallback if Ollama is unavailable or slow.
AI Dispatcher (Phase 10) must be designed so switching the model requires only env var changes.

### 11. Commission Is Always Calculated, Never Cached
`CommissionRule` rows are read at job completion time.
There is no pre-computed commission cache — the rule may change between job creation and completion.
`JobCommission` records the values at the time of settlement.

### 12. Trust Score Is Append-Only
Trust score adjustments are events, not direct mutations.
The technician's `trust_score` column reflects the current value.
Audit trail for changes must be logged (Phase 12 — Security).

---

## What Deliberately Does NOT Exist in MVP

| Feature | Reason |
|---------|--------|
| Mobile apps | Cost and time — WhatsApp covers both user types |
| Real-time push notifications | WhatsApp IS the notification channel |
| Multi-tenancy | Single operator (Sevagan) for MVP |
| GraphQL | REST + Swagger is simpler for the team |
| Microservices | Single NestJS monolith; split later if needed |
| Event sourcing | Overkill for MVP scale |
| Payment gateway integration | Cash + manual UPI reconciliation for MVP |
