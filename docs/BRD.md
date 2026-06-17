# Business Requirements Document — Sevagan (சேவகன்)

**Version:** 1.0  
**Status:** Approved  
**Target Market:** Virudhunagar, Tamil Nadu  
**Launch Timeline:** 6–8 Weeks (MVP)

---

## 1. Product Vision

Sevagan is a WhatsApp-first marketplace connecting customers with local home service professionals in Virudhunagar.

**Problem:** Customers struggle to find reliable, local technicians quickly. Technicians lack a structured channel for receiving and managing jobs.

**Solution:** Use WhatsApp — the dominant communication platform in the target market — as the entire UX layer. No apps to install, no accounts to create, no learning curve.

---

## 2. MVP Service Categories

| Service | Notes |
|---------|-------|
| Electrician | Wiring, fitting, repairs |
| Plumbing | Leak repair, installation |
| AC Service | Service, repair, installation |
| Carpentry | Furniture, doors, fixtures |
| Painting | Interior, exterior |
| Appliance Repair | Washing machine, fridge, etc. |
| RO Service | Water purifier service |
| CCTV Installation | Setup and maintenance |

---

## 3. Users

### Customer
- Requests services via WhatsApp
- Receives job status updates via WhatsApp
- Confirms job amount after technician reports completion
- Provides star rating after job

### Technician
- Receives job assignments via WhatsApp
- Accepts or rejects jobs via WhatsApp
- Updates job status (Start, Complete) via WhatsApp
- Reports job amount on completion

### Operations Admin
- Views and manages all jobs via web dashboard
- Manages technician profiles and skills
- Views revenue and commission reports
- Configures commission rules
- Manages settlements with technicians
- Handles customer/technician disputes

---

## 4. Revenue Model

### Cash Jobs
Customer pays technician directly in cash.

```
Commission = ₹20 flat (default, configurable by Admin)
Technician keeps: Job Amount − ₹20
Sevagan collects: ₹20 settlement from technician periodically
```

### UPI Jobs
Customer pays Sevagan via UPI. Sevagan settles with technician.

```
Commission = 5% of job amount (default, configurable by Admin)
Sevagan receives: Full job amount
Technician settlement: Job Amount × 95%
```

### Examples

| Job Amount | Mode | Commission | Technician Keeps |
|-----------|------|-----------|-----------------|
| ₹1,200 | Cash | ₹20 | ₹1,180 |
| ₹1,200 | UPI | ₹60 (5%) | ₹1,140 |
| ₹500 | Cash | ₹20 | ₹480 |
| ₹500 | UPI | ₹25 (5%) | ₹475 |

---

## 5. Language Requirements

**All customer-facing and technician-facing interactions must support:**
- English (EN)
- Tamil (TA)

User language preference is captured at first interaction and persisted. Users can change language anytime by sending `LANGUAGE` or `மொழி`.

Admin dashboard is English-only for MVP.

---

## 6. MVP Deliberate Exclusions

| Excluded | Reason |
|----------|--------|
| Customer mobile app | WhatsApp covers the full customer journey |
| Technician mobile app | WhatsApp covers the full technician journey |
| Payment gateway (Razorpay/Stripe) | Manual UPI reconciliation sufficient for MVP scale |
| Multi-city support | Virudhunagar only for MVP validation |
| Customer self-registration portal | WhatsApp bot handles onboarding |
| Live technician tracking/GPS | Future phase |
| Automated settlement | Manual admin action for MVP |

---

## 7. Success Criteria (MVP)

- [ ] Customer can request a service via WhatsApp in Tamil or English
- [ ] Technician receives job notification and accepts/rejects via WhatsApp
- [ ] Admin can view all jobs and manage technicians via dashboard
- [ ] Commission is calculated correctly on job completion
- [ ] Admin can view daily/weekly/monthly revenue reports
- [ ] System handles 50+ concurrent WhatsApp conversations
