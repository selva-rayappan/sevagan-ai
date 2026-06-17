# Prompt: Fix Bug

Use this prompt when diagnosing and fixing a bug.

---

## Prompt Template

```
Fix the following bug in Sevagan:

Description:
[What is wrong — observed behaviour vs expected behaviour]

Reproduction steps:
1. [Step 1]
2. [Step 2]
3. [Result]

Error output (if any):
[Paste stack trace or error message]

Suspected location:
[File path or module if known]

Constraints:
- Do not add error handling for cases that can't happen
- Do not add fallbacks that mask the root cause
- Fix the root cause, not the symptom
- If the fix changes user-facing behaviour, verify translation keys are correct
- Write or update a test that would have caught this bug
- Do not break existing passing tests
```

---

## Debugging Checklist

1. **Read the error** — full stack trace, not just the first line
2. **Locate the layer** — is it Controller, Service, Repository, Infrastructure, or WhatsApp flow?
3. **Check conversation state** — if it's a WhatsApp bot issue, trace the state machine in `ConversationStateService`
4. **Check translations** — if a wrong message was sent, verify the translation key and locale files
5. **Check Prisma** — if it's a DB error, read `schema.prisma` and the migration to understand the constraint
6. **Write a failing test first** — then fix until it passes

## Common Bug Areas

| Symptom | Look Here |
|---------|-----------|
| Wrong language in WhatsApp message | Translation key missing in `ta.json` or EN fallback triggered |
| Webhook not received | HMAC verification failing — check `WA_APP_SECRET` |
| Conversation stuck in wrong state | `ConversationStateService` — state transition not handled |
| Prisma unique constraint violation | Schema index + seed data conflict |
| Redis connection error | `REDIS_URL` env var or Redis container not running |
| 422 from NestJS | `ValidationPipe` rejecting request — check DTO decorators |
