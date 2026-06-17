MULTILINGUAL SUPPORT IS A CORE MVP REQUIREMENT.

Every customer-facing and technician-facing WhatsApp interaction must support:

- English (EN)
- Tamil (TA)

All message templates must be localized.

Language preference must be persisted.

AI Dispatcher must detect and respond in the user's preferred language.

No business service may contain hardcoded message strings.
All messages must pass through the TranslationService.

---

PHASE PROGRESS TRACKING IS MANDATORY.

SEVAGAN_DEV_INSTRUCTIONS.MD Section 18 is the single source of truth for development progress.

Rules:
- Whenever a phase task or sub-task is completed, immediately update its status in Section 18 from ❌ to ✅.
- Whenever a phase is fully complete (all tasks ✅), update the phase status line to ✅ COMPLETE and update the Progress Overview table at the top of Section 18.
- Whenever work on a phase begins but is not yet complete, mark the phase status as 🔄 IN PROGRESS and update the Progress Overview table.
- The "Last Updated" date in the Progress Overview table must be updated every time any change is made to Section 18.
- Never report a phase or task as complete without updating Section 18 first.
- Do not move on to the next phase until the current phase's Section 18 entry is fully updated.