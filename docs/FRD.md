# Functional Requirements Document — Sevagan

**Version:** 1.0  
**Depends On:** docs/BRD.md

---

## 1. Customer WhatsApp Bot

### 1.1 Language Selection (First Interaction)

**Trigger:** Customer sends any message for the first time.

**Flow:**
```
Bot: "Please choose your language: / மொழியை தேர்வு செய்யவும்:
     1. English
     2. தமிழ்"

Customer: "2"

System: Stores language = TA on customer record
Bot: Responds in Tamil from this point forward
```

**Language change:** Customer sends `LANGUAGE` or `மொழி` at any time to reset.

### 1.2 Service Request Flow

```
Customer: "Need AC repair" / "ஏசி சர்வீஸ் வேண்டும்"

Bot: [Service category list as interactive list]
     "What service do you need?"

Customer: [Selects from list]

Bot: "Please share your location / இருப்பிடத்தை பகிரவும்"

Customer: "Allampatti" / [Location text]

Bot: "Preferred date and time? / விருப்பமான நேரம்?"

Customer: "Today 4 PM" / "இன்று 4 மணி"

Bot: "Your request has been created.
     Job Number: JOB2026-001
     We will notify you when a technician is assigned."
```

### 1.3 Job Tracking

```
Customer: "TRACK JOB2026-001"
Bot: "Job JOB2026-001
     Service: AC Repair
     Status: Assigned to Rajan K
     Technician will arrive by 4 PM"
```

### 1.4 Job Cancellation

```
Customer: "CANCEL JOB2026-001"
Bot: "Job JOB2026-001 has been cancelled."
```
_(Only allowed while status = NEW or ASSIGNED)_

### 1.5 Amount Confirmation (Post-Completion)

```
Bot: "Technician reported job amount: ₹1,200
     Payment mode: Cash

     Is this correct?
     1. Yes, correct
     2. No, incorrect"

Customer: "1"
Bot: "Thank you! Please rate your experience (1–5):"

Customer: "No, incorrect" or "2"
Bot: "We've noted the dispute. Our team will contact you shortly."
```

### 1.6 Rating

```
Bot: "Please rate the service (1–5):"
Customer: "4"
Bot: "Thank you for your feedback!"
```

### 1.7 Help Command

```
Customer: "HELP" / "உதவி"
Bot: "Commands:
     TRACK [Job Number] — Track your job
     CANCEL [Job Number] — Cancel your job
     LANGUAGE — Change language
     HELP — Show this menu"
```

---

## 2. Technician WhatsApp Workflow

### 2.1 New Job Notification

```
Bot → Technician:
"🔔 New Job / புதிய வேலை

Customer: Rajesh Kumar
Service: AC Repair
Location: Allampatti, Main Street
Time: Today 4 PM

Reply:
1 Accept / ஏற்கவும்
2 Reject / நிராகரிக்கவும்"
```

### 2.2 Accept / Reject

```
Technician: "1"
Bot: "Job accepted. Customer has been notified."

— Customer receives notification —
Bot → Customer: "Technician assigned: Rajan K. ETA: 4 PM"
```

```
Technician: "2"
Bot: "Job rejected. Looking for another technician..."

System: Assigns to next technician in ranking
```

### 2.3 Start Job

```
Technician: "START"
Bot: "Job started. Customer has been notified."

— Customer receives —
Bot → Customer: "Your technician has arrived and started work."
```

### 2.4 Complete Job

```
Technician: "COMPLETE 1200 CASH"
           or
           "COMPLETE 1200 UPI"

Bot: "Job marked complete.
     Amount: ₹1,200
     Mode: Cash
     Commission: ₹20
     Your settlement: ₹1,180

     Customer confirmation pending."
```

### 2.5 Status Check

```
Technician: "STATUS"
Bot: "Your active job:
     Job: JOB2026-001
     Customer: Rajesh Kumar
     Status: IN_PROGRESS"
```

---

## 3. Assignment Engine

**V1 Logic (Phase 7):**

1. Filter technicians with matching `service_category` and `service_area`
2. Filter by `status = AVAILABLE`
3. Rank by `trust_score DESC`, then `rating DESC`
4. Assign to top-ranked technician
5. If rejected, move to next in ranking
6. If no technicians available, notify admin

---

## 4. Trust Score Engine

**Initial score:** 100

| Event | Delta |
|-------|-------|
| Customer confirms amount correct | 0 |
| Customer disputes amount | −5 |
| Amount mismatch detected | −10 |
| Fraud detection trigger | −25 |
| Positive rating (4–5 stars) | +2 |

Assignment engine prioritises technicians with higher trust scores.

---

## 5. Commission Engine

| Payment Mode | Commission Type | Default Value |
|-------------|----------------|--------------|
| CASH | Flat | ₹20 |
| UPI | Percentage | 5% |

Rules are configurable by admin via dashboard. `CommissionRule` records store history with `effective_from` dates. Commission applied at job completion uses the current active rule.

---

## 6. Admin Dashboard

### Pages (Phase 8)

| Page | Description |
|------|-------------|
| Dashboard | KPIs: Jobs Today, Revenue, Commission, Active Technicians |
| Customers | List, search, view detail |
| Technicians | List, add, edit, assign skills, view trust score |
| Jobs | List, filter by status, view detail, manually assign/cancel |
| Settlements | Generate, mark as paid, history |
| Commission Rules | Configure CASH and UPI commission |
| Reports | Revenue (daily/weekly/monthly), Ratings, Jobs |
| Disputes | View open disputes, resolve |

### Auth

- Email + password login for admin users
- JWT token (7-day expiry)
- Roles: `ADMIN` (full access), `OPERATOR` (no commission config or user management)

---

## 7. Invoice & Payments (Phase 9)

- Auto-generate PDF invoice on job completion
- Store invoice PDF in MinIO
- Send invoice PDF to customer via WhatsApp

---

## 8. AI Dispatcher (Phase 10)

| Capability | Description |
|-----------|-------------|
| Intent classification | Map free-text to service category |
| Language detection | Auto-detect EN vs TA from message |
| FAQ responses | Working hours, pricing, coverage area |
| Follow-up scheduling | Post-job completion check-ins |

Primary model: Ollama (qwen3). Fallback: OpenAI API.
