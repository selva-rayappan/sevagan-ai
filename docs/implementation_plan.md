# Phase 9 & 10 — Invoice/Payments + AI Dispatcher

Implement the remaining two feature phases (Milestone 6) that bridge the gap between operational MVP and production launch.

## Current State

| Phase | Status | Tests |
|-------|--------|-------|
| 0–8 | ✅ COMPLETE | 230 tests, 25 suites passing |
| 9 (Invoice & Payments) | ❌ NOT STARTED | — |
| 10 (AI Dispatcher) | ❌ NOT STARTED | — |

Database tables `Invoice`, `Payment`, and `AuditLog` already exist in Prisma schema. Docker Compose already includes Ollama and MinIO containers. Environment variables for `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OPENAI_API_KEY` are pre-configured.

---

## Proposed Changes

### Phase 9 — Invoice & Payments

#### 9.1 New Dependencies

Install `pdfkit` + `@types/pdfkit` for server-side PDF generation. PDFKit is lightweight (no headless browser), generates professional PDFs, and runs cleanly in Docker Alpine containers.

---

#### 9.2 WhatsApp Document Sending

##### [MODIFY] [whatsapp.provider.interface.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/infrastructure/messaging/whatsapp.provider.interface.ts)
- Add `sendDocument(options: SendDocumentOptions): Promise<void>` method to the interface

##### [MODIFY] [outbound-message.types.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/infrastructure/messaging/types/outbound-message.types.ts)
- Add `SendDocumentOptions` type: `{ to: string; link: string; filename: string; caption?: string }`

##### [MODIFY] [meta-whatsapp.provider.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/infrastructure/messaging/meta-whatsapp.provider.ts)
- Implement `sendDocument()` using Meta Cloud API document message type (link-based, not media ID)

---

#### 9.3 Invoice Module (Backend)

##### [NEW] `backend/src/modules/invoice/invoice.module.ts`
- NestJS module importing `PrismaModule`, `MinioModule`, `MessagingModule`, `CommissionModule`
- Providers: `InvoiceService`, `InvoiceRepository`, `PdfGeneratorService`
- Exports: `InvoiceService`

##### [NEW] `backend/src/modules/invoice/invoice.repository.ts`
- `create(data)`: Create Invoice record
- `findById(id)`: Find by ID with Job + Customer includes
- `findByJobId(jobId)`: Find by job
- `findAll(filters)`: Paginated list with filters (status, date range)
- `updateStatus(id, status)`: Update invoice status
- `setPdfUrl(id, pdfUrl)`: Set PDF URL after generation

##### [NEW] `backend/src/modules/invoice/pdf-generator.service.ts`
- `generateInvoicePdf(data: InvoicePdfData): Promise<Buffer>` — Uses PDFKit to render:
  - Sevagan branding header
  - Invoice number, date
  - Customer name, phone
  - Service category, job number
  - Amount breakdown (gross, commission, technician net)
  - Payment mode
  - Footer with support info
- Bilingual: renders EN or TA based on customer language preference
- Returns raw PDF buffer (caller handles storage)

##### [NEW] `backend/src/modules/invoice/invoice.service.ts`
- `generateInvoice(jobId: string): Promise<Invoice>`
  1. Load job with customer, commission, assignment.technician
  2. Generate `invoiceNumber` via Redis INCR: `INV-YYYYMMDD-NNNN`
  3. Create Invoice record (status: `DRAFT`)
  4. Call `PdfGeneratorService.generateInvoicePdf()`
  5. Upload PDF to MinIO: `invoices/{invoiceNumber}.pdf`
  6. Update Invoice with `pdfUrl`, set status to `SENT`
  7. Get presigned URL from MinIO
  8. Send PDF to customer via `whatsapp.sendDocument()`
  9. Return Invoice
- `getInvoicePdfUrl(invoiceId: string): Promise<string>` — returns presigned MinIO URL

##### [NEW] `backend/src/modules/invoice/dto/` — DTOs for create, filter queries

---

#### 9.4 Payment Module (Backend)

##### [NEW] `backend/src/modules/payment/payment.module.ts`
- Providers: `PaymentService`, `PaymentRepository`

##### [NEW] `backend/src/modules/payment/payment.repository.ts`
- `create(data)`: Create Payment record
- `findByInvoiceId(invoiceId)`: Find payment for invoice
- `updateStatus(id, status)`: Update payment status

##### [NEW] `backend/src/modules/payment/payment.service.ts`
- `recordCashPayment(invoiceId)`: Create Payment with status `COMPLETED`, method `CASH`
- `recordUpiPayment(invoiceId)`: Create Payment with status `PENDING`, method `UPI`
- `confirmUpiPayment(paymentId)`: Update status to `COMPLETED`
- `generateUpiDeepLink(amount, jobNumber)`: Returns `upi://pay?pa=sevagan@upi&am={amount}&tn={jobNumber}`

---

#### 9.5 Integration into Customer Bot Flow

##### [MODIFY] [customer-bot.service.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/modules/whatsapp/customer-bot/customer-bot.service.ts)
- In `handleAmountConfirmation()` reply `'1'` (confirmed) path:
  - After `commissionService.recordCommission()`, call `invoiceService.generateInvoice(jobId)` (fire-and-forget with error logging)
  - For UPI jobs: also call `paymentService.recordUpiPayment()` and send UPI deep link to customer
  - For CASH jobs: call `paymentService.recordCashPayment()` automatically

##### [MODIFY] [whatsapp.module.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/modules/whatsapp/whatsapp.module.ts)
- Import `InvoiceModule` and `PaymentModule`

---

#### 9.6 Admin Invoice APIs

##### [NEW] `backend/src/modules/admin/invoices.controller.ts`
- `GET /api/v1/admin/invoices` — paginated list
- `GET /api/v1/admin/invoices/:id` — detail with job/customer
- `GET /api/v1/admin/invoices/:id/pdf` — redirect to presigned PDF URL
- `POST /api/v1/admin/invoices/:id/confirm-payment` — admin confirms UPI payment

##### [MODIFY] [admin.module.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/modules/admin/admin.module.ts)
- Import `InvoiceModule`, `PaymentModule`; register `InvoicesController`

---

#### 9.7 App Module Wiring

##### [MODIFY] [app.module.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/app.module.ts)
- Import `InvoiceModule` and `PaymentModule`

---

#### 9.8 i18n Keys

##### [MODIFY] `backend/src/infrastructure/i18n/locales/en.json`
##### [MODIFY] `backend/src/infrastructure/i18n/locales/ta.json`
- Add keys:
  - `customer.invoice_sent` — "Your invoice {{invoiceNumber}} has been sent."
  - `customer.upi_payment_link` — "Pay ₹{{amount}} via UPI: {{upiLink}}"
  - `customer.payment_confirmed` — "Payment received. Thank you!"

---

### Phase 10 — AI Dispatcher

#### 10.1 AI Infrastructure

##### [NEW] `backend/src/infrastructure/ai/ai.provider.interface.ts`
```typescript
export interface AIProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
}
```

##### [NEW] `backend/src/infrastructure/ai/ollama.provider.ts`
- Implements `AIProvider`
- Uses `axios` to call `POST {OLLAMA_BASE_URL}/api/chat`
- Model from `OLLAMA_MODEL` config
- 10-second timeout

##### [NEW] `backend/src/infrastructure/ai/openai.provider.ts`
- Implements `AIProvider`
- Uses `axios` to call OpenAI Chat Completions API
- Activated on Ollama failure or when `OPENAI_API_KEY` is set

##### [NEW] `backend/src/infrastructure/ai/ai.service.ts`
- `chat(messages, options)`: tries Ollama first, falls back to OpenAI
- Logs which provider was used per request

##### [NEW] `backend/src/infrastructure/ai/ai.module.ts`
- Global module, exports `AIService`

---

#### 10.2 Intent Classifier

##### [NEW] `backend/src/modules/ai-dispatcher/intent-classifier.service.ts`
- `classifyIntent(message, language): Promise<IntentResult>`
  - Intents: `REQUEST_SERVICE`, `TRACK_JOB`, `CANCEL_JOB`, `FAQ_HOURS`, `FAQ_PRICING`, `FAQ_COVERAGE`, `UNKNOWN`
  - System prompt defines intents + output JSON format
  - Returns `{ intent, confidence, detectedLanguage }`

##### [NEW] `backend/src/modules/ai-dispatcher/category-mapper.service.ts`
- `mapToServiceCategory(message): Promise<ServiceCategory | null>`
- System prompt lists all 8 categories with EN + TA synonyms
- Returns matched category or null

##### [NEW] `backend/src/modules/ai-dispatcher/language-detector.service.ts`
- `detectLanguage(text): Promise<Language>`
- Single AI call returning `"EN"` or `"TA"`

##### [NEW] `backend/src/modules/ai-dispatcher/ai-dispatcher.module.ts`
- Imports `AIModule`, `ServiceCategoriesModule`
- Providers: `IntentClassifierService`, `CategoryMapperService`, `LanguageDetectorService`
- Exports all three

---

#### 10.3 Integration into Customer Bot

##### [MODIFY] [customer-bot.service.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/modules/whatsapp/customer-bot/customer-bot.service.ts)
- In `AWAITING_SERVICE` state: if input doesn't match numbered menu (1–8), pass to `CategoryMapperService`
  - If AI returns a match → proceed with that category
  - If AI returns null → show full category menu again
- In `handleCommand()`: if no keyword match, pass to `IntentClassifierService`
  - `REQUEST_SERVICE` → enter service flow
  - `TRACK_JOB` / `CANCEL_JOB` → extract job number via AI, delegate
  - `FAQ_*` → return translated FAQ response from `TranslationService`
  - `UNKNOWN` → fall through to existing state router
- Keyword commands (`HELP`, `TRACK JOB-xxx`, `CANCEL JOB-xxx`) remain as fast-path overrides (no AI call)

##### [MODIFY] [whatsapp.module.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/modules/whatsapp/whatsapp.module.ts)
- Import `AIDispatcherModule`

---

#### 10.4 FAQ i18n Keys

##### [MODIFY] `backend/src/infrastructure/i18n/locales/en.json`
##### [MODIFY] `backend/src/infrastructure/i18n/locales/ta.json`
- Add keys:
  - `faq.hours` — "We operate 8 AM to 8 PM, Monday to Saturday."
  - `faq.pricing` — "Pricing depends on the service. Please create a request and the technician will provide an estimate."
  - `faq.coverage` — "We currently serve Virudhunagar and surrounding areas."

---

#### 10.5 App Module Wiring

##### [MODIFY] [app.module.ts](file:///c:/Users/selvakumar.rayappan/Documents/sevagan-ai/backend/src/app.module.ts)
- Import `AIModule` (global) and `AIDispatcherModule`

---

## User Review Required

> [!IMPORTANT]
> **UPI Merchant ID**: The UPI deep link uses `sevagan@upi` as a placeholder payee VPA. Please confirm the actual UPI VPA to use for production, or if this should remain configurable via environment variable.

> [!IMPORTANT]
> **PDF Branding**: The invoice PDF will use text-based Sevagan branding (no logo image). If you have a logo file, please provide it and I'll embed it in the PDF template.

> [!WARNING]
> **Ollama Model Pull**: The Docker Compose Ollama container starts empty. On first use, the `qwen3` model must be pulled (`ollama pull qwen3`), which is a ~4GB download. The AI Dispatcher will gracefully fall back to OpenAI if Ollama is unavailable, but the OpenAI fallback requires a valid `OPENAI_API_KEY`.

## Open Questions

1. **Invoice branding** — Should invoices include any specific terms & conditions, GSTIN, or legal footer text?
2. **UPI confirmation** — Should UPI payments auto-expire if not confirmed within a configurable time window (e.g. 24 hours)?

---

## Verification Plan

### Automated Tests
- New unit tests for: `InvoiceService`, `InvoiceRepository`, `PdfGeneratorService`, `PaymentService`, `PaymentRepository`
- New unit tests for: `AIService`, `IntentClassifierService`, `CategoryMapperService`, `LanguageDetectorService`
- Updated tests for: `CustomerBotService` (invoice + payment in confirmation flow, AI dispatch in service selection)
- Run full suite: `npm run test:api` — target: all 270+ tests passing
- Run coverage: `npm run test:api:cov` — maintain ≥80% threshold

### Manual Verification
- `nest build` compiles cleanly
- Invoice PDF renders correctly (check via MinIO console download)
- Admin invoice API endpoints return correct data
