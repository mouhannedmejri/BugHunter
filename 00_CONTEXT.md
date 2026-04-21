# BugHuntr Platform — Shared Context (load once per session)

## Stack
- **Backend**: Node.js 20 + TypeScript, Fastify, Prisma ORM
- **DB**: PostgreSQL 16 (primary), Redis 7 (cache/queue/sessions)
- **Queue**: BullMQ (email, notifications, webhooks, virus scan)
- **Storage**: S3-compatible (attachments, exports)
- **Auth**: JWT (access 15m) + refresh token (httpOnly cookie 30d), TOTP (2FA)
- **Frontend**: Next.js 14 App Router, Tailwind CSS, shadcn/ui, React Query
- **API**: REST under `/api/v1/`, versioned
- **Email**: Resend (transactional), React Email templates
- **Payments**: Stripe (cards/bank), Wise API (intl transfers), manual crypto
- **Search**: PostgreSQL full-text + pg_trgm (MVP), Meilisearch (Phase 2)
- **Testing**: Vitest (unit), Playwright (E2E), Supertest (API)
- **Infra**: Docker Compose (dev), Kubernetes (prod), GitHub Actions CI
- **frontend** : found in /frontend folder 

## Naming Conventions
- DB: snake_case tables/columns
- API: camelCase JSON keys, kebab-case URL segments
- Code: PascalCase classes, camelCase functions/vars
- Files: kebab-case

## Core Abbreviations (used in all prompts)
- **R** = Researcher/Hunter
- **PM** = Program Manager
- **SA** = Super Admin
- **OA** = Org Admin
- **RV** = Reviewer/Validator
- **FP** = Finance/Payout Manager
- **SUP** = Support Agent
- **AUD** = Auditor
- **Rpt** = Report (vulnerability submission)
- **Org** = Organization (company on platform)
- **Prog** = Bug Bounty Program
- **SLA** = Service Level Agreement timer
- **CVSS** = severity scoring system
- **KYC** = identity verification for payouts

## Severity Levels (enum, used everywhere)
`CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL`

## Report Statuses (enum)
`DRAFT | SUBMITTED | RECEIVED | NEEDS_INFO | TRIAGING | ACCEPTED | DUPLICATE | INFORMATIVE | NOT_APPLICABLE | OUT_OF_SCOPE | RESOLVED | REWARDED | CLOSED | ESCALATED`

## Payout Statuses
`PENDING_APPROVAL | APPROVED | PROCESSING | COMPLETED | FAILED | CANCELLED`

## Program Types
`PUBLIC | PRIVATE | CAMPAIGN | CHALLENGE | EMERGENCY`

## Asset Types
`DOMAIN | SUBDOMAIN | IP_RANGE | MOBILE_APP | API | REPOSITORY | CLOUD | THIRD_PARTY | PHYSICAL`

## Permission System
RBAC via `role` field on `OrganizationMember`. Platform-level role on `User.platformRole`.
Platform roles: `SUPER_ADMIN | SUPPORT | AUDITOR | USER`
Org roles: `ORG_ADMIN | PROGRAM_MANAGER | REVIEWER | FINANCE | VIEWER`
Researchers have no org role — they interact via program membership.

## Key Rules
1. All monetary amounts stored as integers (cents/smallest unit)
2. All timestamps UTC ISO-8601
3. Soft-delete pattern: `deleted_at` nullable timestamp
4. Every mutation creates an audit_log entry
5. File uploads: virus-scan queue before making accessible
6. Private program assets hidden from Rs not invited
7. Duplicate detection runs on submission (async, within 60s)
8. SLA timers: first response 24h, triage decision 5d, fix 30/60/90d by severity
