# Prompt: Implement Feature

Use this prompt when adding a new end-to-end feature (backend module + optional frontend).

---

## Prompt Template

```
Implement the [FEATURE_NAME] feature for Sevagan.

Context:
- Phase: [PHASE_NUMBER] — [PHASE_NAME]
- Spec reference: docs/[RELEVANT_DOC].md
- Current task in backlog: .claude/task-backlog.md

Requirements:
[Paste the relevant section from docs/FRD.md or docs/EXECUTION_PLAN.md]

Stack constraints:
- NestJS: Controller → Service → Repository → Domain pattern
- All user-facing WhatsApp messages must use TranslationService
- Add EN + TA translations for any new message keys
- Tests required (80% coverage gate)
- Update .claude/task-backlog.md and docs/EXECUTION_PLAN.md Section 18 on completion

Deliverables:
1. backend/src/modules/[feature]/[feature].module.ts
2. backend/src/modules/[feature]/[feature].service.ts
3. backend/src/modules/[feature]/[feature].repository.ts
4. backend/src/modules/[feature]/[feature].service.spec.ts
5. backend/src/modules/[feature]/[feature].repository.spec.ts
6. Translation keys added to en.json and ta.json
7. Module imported in app.module.ts
```

---

## Checklist Before Marking Complete

- [ ] Module, Service, Repository created
- [ ] Unit tests written and passing
- [ ] `npm run test:api:cov` passes (≥80%)
- [ ] Translation keys added for both EN and TA
- [ ] Module imported in `app.module.ts`
- [ ] `.claude/task-backlog.md` updated
- [ ] `docs/EXECUTION_PLAN.md` Section 18 updated
