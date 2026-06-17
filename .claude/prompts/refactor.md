# Prompt: Refactor

Use this prompt when improving existing code without changing behaviour.

---

## Prompt Template

```
Refactor [FILE_OR_MODULE] in Sevagan.

Goal:
[What specific quality problem are you solving?]
Examples:
- Extract duplicated WhatsApp message sending into a shared helper
- Split a service method that does too many things
- Rename types to match the domain language in docs/BRD.md
- Remove dead code from [file]

Constraints:
- Do NOT change public interfaces or API response shapes
- Do NOT add new features or handle new cases
- All existing tests must still pass after refactor
- If you rename anything, update all call sites
- If you extract a utility, put it in backend/src/common/ (backend) or frontend/src/lib/ (frontend)
- Do not add comments explaining what the refactored code does — names should be self-explanatory
```

---

## Refactor Checklist

- [ ] Identified the specific smell (duplication, long method, wrong abstraction level, etc.)
- [ ] All tests pass before starting
- [ ] Changed only what's needed — no scope creep
- [ ] All tests pass after
- [ ] No new public API surface added
- [ ] No feature flags, no backwards-compat shims

## What NOT to Refactor Without Reason

- Working code just because it "looks old"
- Infrastructure adapters (they're intentionally low-level)
- Translation service internals (they're simple by design)
- Prisma service (thin wrapper, keep it thin)
