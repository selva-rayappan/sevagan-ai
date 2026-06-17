# Sevagan AI (சேவகன்)
### WhatsApp-First Home Services Marketplace

> No apps. No friction. Customers and technicians interact entirely through WhatsApp.

---

## Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 10 + TypeScript 5.8 |
| Admin Dashboard | Next.js 15 + TailwindCSS + TanStack Table |
| Database | PostgreSQL 16 + Prisma 6 |
| Cache | Redis 7 |
| Storage | MinIO (S3-compatible) |
| AI | Ollama (qwen3) + OpenAI fallback |
| Messaging | Meta WhatsApp Cloud API |
| Deployment | Docker Compose + Nginx + Let's Encrypt on EC2 |

---

## Quick Start

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, WA_* credentials

# 2. Start all infrastructure
npm run docker:up

# 3. Install dependencies
npm install

# 4. Run database migrations
npm run prisma:migrate

# 5. Seed initial data
npm run prisma:seed

# 6. Start development servers
npm run dev:api   # http://localhost:3001 | Swagger: http://localhost:3001/api/docs
npm run dev:web   # http://localhost:3000
```

---

## Project Structure

```
sevagan-ai/
├── backend/                      # NestJS API (port 3001)
│   ├── src/
│   │   ├── config/               # Typed config + env validation
│   │   ├── common/               # Filters, interceptors
│   │   ├── domain/               # Entities, enums (no deps)
│   │   ├── infrastructure/
│   │   │   ├── database/         # PrismaService
│   │   │   ├── cache/            # RedisService
│   │   │   ├── i18n/             # TranslationService + locales/
│   │   │   ├── messaging/        # MetaWhatsAppProvider
│   │   │   └── storage/          # MinioService
│   │   └── modules/
│   │       ├── health/
│   │       ├── customers/
│   │       ├── technicians/
│   │       ├── jobs/
│   │       ├── assignments/
│   │       ├── service-categories/
│   │       └── whatsapp/         # Webhook, CustomerBot, TechnicianBot
│   └── prisma/
│       └── schema.prisma
│
├── frontend/                     # Next.js 15 Admin Dashboard (port 3000)
│   └── src/
│       ├── app/                  # App Router
│       └── lib/                  # API client, utilities
│
├── infrastructure/
│   └── nginx/                    # Reverse proxy config
│
├── docs/                         # Project documentation
│   ├── BRD.md                    # Business requirements
│   ├── FRD.md                    # Functional requirements
│   ├── ARCHITECTURE.md           # System architecture
│   ├── DATABASE.md               # Database design
│   ├── API_SPEC.md               # API specification
│   ├── EXECUTION_PLAN.md         # Dev phases + progress (Section 18)
│   ├── RELEASE_PLAN.md           # Release milestones
│   └── DEPLOYMENT.md             # Production deployment guide
│
├── .claude/                      # Claude Code knowledge base
│   ├── CLAUDE.md                 # Claude instructions
│   ├── project-context.md        # Project overview for Claude
│   ├── coding-standards.md       # Code style rules
│   ├── architecture-principles.md# Architecture decisions
│   ├── workflow-rules.md         # Dev workflow
│   ├── task-backlog.md           # Task-level progress
│   ├── decisions.md              # Architectural decision records
│   ├── prompts/                  # Reusable Claude prompts
│   └── templates/                # Code templates
│
├── docker-compose.yml
├── package.json                  # npm workspaces root
└── .env.example
```

---

## Architecture

```
Customer/Technician (WhatsApp)
        │
Meta WhatsApp Cloud API
        │
Nginx (SSL + Rate Limiting) :80/:443
        │
   ┌────┴────┐
   │         │
NestJS API  Next.js Admin
  :3001        :3000
   │
┌──┼──┐
│  │  │
DB Redis MinIO
│  │
PG Session
   State
```

---

## Phase Progress

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Architecture & Skeleton | ✅ |
| 1 | Docker + PostgreSQL + Redis + MinIO | ✅ |
| 2 | Prisma Schema + Migrations | ✅ |
| 3 | WhatsApp Integration | ✅ |
| 4 | Customer WhatsApp Bot | ✅ |
| 5 | Technician WhatsApp Workflow | ✅ |
| 6 | Commission + Trust Score + Settlements | ❌ Next |
| 7–13 | Assignment Engine → Production | ❌ |

Full details: `docs/EXECUTION_PLAN.md` Section 18

---

## Development Commands

```bash
npm run dev:api          # NestJS watch mode
npm run dev:web          # Next.js with Turbopack
npm run test:api         # Jest unit tests
npm run test:api:cov     # With 80% coverage gate
npm run docker:up        # Start all infra containers
npm run docker:down      # Stop containers
npm run docker:logs      # Follow container logs
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Run pending migrations (dev)
npm run prisma:seed      # Seed initial data
npm run lint             # Lint all workspaces
```

---

## API Reference

Swagger UI: `http://localhost:3001/api/docs` (development only)  
Base URL: `/api/v1`  
Spec: `docs/API_SPEC.md`
