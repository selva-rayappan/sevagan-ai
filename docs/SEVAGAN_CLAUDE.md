# SEVAGAN CLAUDE CODE MASTER SPEC

## Purpose
This is the single source of truth for the product. Claude Code must always read this document first.

## Contents
1. [Product Vision](#1-product-vision)
2. [Business Rules](#2-business-rules)
3. [Functional Requirements](#3-functional-requirements)
4. [Language & Localization Framework](#4-language--localization-framework)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [API Design](#7-api-design)
8. [Security](#8-security)
9. [Coding Standards](#9-coding-standards)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Product Vision
- What Sevagan is
- Target users
- Business goals
- MVP scope
- Future roadmap

## 2. Business Rules
### Customer Rules
- Service request flow
- Job tracking
- Rating process

### Technician Rules
- Acceptance rules
- Rejection rules
- Completion rules

### Revenue Rules
#### Cash Jobs
- Flat commission
- Admin configurable

#### UPI Jobs
- Percentage commission
- Admin configurable
- Customer confirmation mandatory.

## 3. Functional Requirements
- Customer WhatsApp Bot
- Technician WhatsApp Workflow
- Assignment Engine
- Revenue Engine
  - Commission Engine
  - Settlement Engine
  - Trust Score Engine
- Admin Dashboard
- Reports
- AI Dispatcher

## 4. Language & Localization Framework
### Supported Languages
- English
- Tamil

### Language Preference Stored For
- Customers
- Technicians

### Notes
- All messages localized.
- TranslationService mandatory.

## 5. System Architecture
- High Level Architecture
- Deployment Architecture
- Integration Architecture

## 6. Database Design
- Complete ERD
- Tables
- Relationships
- Indexes
- Constraints

## 7. API Design
- REST APIs
- DTOs
- Validation
- OpenAPI

## 8. Security
- JWT
- RBAC
- Rate Limiting
- Audit Logs
- Encryption

## 9. Coding Standards
- NestJS standards
- NextJS standards
- Testing standards
- Documentation standards

## 10. Acceptance Criteria
- Product-level acceptance criteria.

---
*This file changes only when requirements change.*