# API Specification — Sevagan

**Base URL:** `/api/v1`  
**Auth:** Bearer JWT (except health and webhook endpoints)  
**Swagger UI:** `http://localhost:3001/api/docs` (development only)  
**Content-Type:** `application/json`

---

## Response Envelope

All successful responses are wrapped by `TransformInterceptor`:

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-06-15T10:00:00.000Z",
    "path": "/api/v1/jobs"
  }
}
```

All errors are shaped by `HttpExceptionFilter`:

```json
{
  "statusCode": 404,
  "message": "Job JOB2026-999 not found",
  "timestamp": "2026-06-15T10:00:00.000Z",
  "path": "/api/v1/jobs/JOB2026-999"
}
```

---

## Health

### GET /health
No auth required.

**Response 200:**
```json
{ "status": "ok", "info": { "database": { "status": "up" }, "redis": { "status": "up" } } }
```

---

## WhatsApp Webhook

### GET /webhooks/whatsapp
Meta webhook verification handshake. No auth — verified via `hub.verify_token`.

### POST /webhooks/whatsapp
Inbound WhatsApp messages. Verified via HMAC-SHA256 (`X-Hub-Signature-256` header).

---

## Customers

### POST /customers
Create customer.

**Body:**
```json
{ "phone": "+919876543210", "name": "Rajesh Kumar", "language": "EN" }
```

**Response 201:** Customer object

### GET /customers
List all customers. Auth required.

### GET /customers/:id
Get customer by ID. Auth required.

### PATCH /customers/:id
Update customer. Auth required.

```json
{ "name": "Rajesh K", "address": "Allampatti", "language": "TA" }
```

---

## Technicians

### POST /technicians
Register technician. Auth required (Admin only).

**Body:**
```json
{
  "name": "Rajan K",
  "phone": "+919876543211",
  "serviceArea": "Virudhunagar",
  "language": "TA",
  "skills": ["category-uuid-1", "category-uuid-2"]
}
```

### GET /technicians
List technicians. Auth required. Query params: `?status=AVAILABLE&serviceArea=Virudhunagar`

### GET /technicians/:id
Get technician. Auth required.

### PATCH /technicians/:id
Update technician profile. Auth required.

### PATCH /technicians/:id/status
Update availability status.

```json
{ "status": "OFFLINE" }
```

---

## Service Categories

### GET /service-categories
List all active service categories. No auth (used by customer bot).

### POST /service-categories
Create category. Auth required (Admin only).

### PATCH /service-categories/:id
Update category. Auth required (Admin only).

---

## Jobs

### POST /jobs
Create job (called by CustomerBotService).

**Body:**
```json
{
  "customerId": "uuid",
  "serviceCategoryId": "uuid",
  "location": "Allampatti",
  "scheduledTime": "2026-06-15T10:00:00.000Z",
  "description": "AC not cooling"
}
```

**Response 201:** Job with `jobNumber`

### GET /jobs
List jobs. Auth required. Query params: `?status=NEW&customerId=uuid&page=1&limit=20`

### GET /jobs/:id
Get job detail. Auth required.

### PATCH /jobs/:id/assign
Manually assign job to technician. Auth required.

```json
{ "technicianId": "uuid" }
```

### PATCH /jobs/:id/cancel
Cancel job. Auth required or bot.

### PATCH /jobs/:id/complete
Mark job complete with amount. Called by TechnicianBotService.

```json
{ "jobAmount": 1200, "paymentMode": "CASH" }
```

---

## Assignments

### GET /assignments
List assignments. Auth required.

### GET /assignments/:id
Get assignment. Auth required.

---

## Commission

### GET /commission/rules
List commission rules. Auth required.

### POST /commission/rules
Create commission rule. Auth required (Admin only).

```json
{
  "paymentMode": "CASH",
  "commissionType": "FLAT",
  "commissionValue": 25
}
```

### GET /commission/calculate
Calculate commission for given amount.

```json
{ "jobAmount": 1200, "paymentMode": "CASH" }
```

**Response:**
```json
{
  "jobAmount": 1200,
  "commissionAmount": 20,
  "technicianAmount": 1180,
  "paymentMode": "CASH"
}
```

---

## Settlements

### POST /settlements/generate
Generate settlement for technician (batch of completed jobs). Auth required.

```json
{ "technicianId": "uuid", "fromDate": "2026-06-01", "toDate": "2026-06-15" }
```

### PATCH /settlements/:id/pay
Mark settlement as paid. Auth required.

### GET /settlements
List settlements. Auth required. Query: `?technicianId=uuid&status=PENDING`

---

## Reports

### GET /reports/revenue
Revenue summary. Auth required.

Query: `?period=daily|weekly|monthly&from=2026-06-01&to=2026-06-15`

### GET /reports/jobs
Job statistics. Auth required.

### GET /reports/technicians
Technician performance. Auth required.

---

## Admin Auth

### POST /auth/login
No auth required.

**Body:**
```json
{ "email": "admin@sevagan.ai", "password": "secure-password" }
```

**Response 200:**
```json
{ "accessToken": "eyJhbGci...", "expiresIn": "7d" }
```

---

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Bad Request |
| 401 | Unauthorized (missing/invalid JWT) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable Entity (validation error) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |
