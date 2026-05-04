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

## Onboarding Mechanism (Updated)
- Onboarding is **ORG-only**. Researchers do **not** need onboarding.
- Researcher account flow:
  1) register as `RESEARCHER`
  2) verify email
  3) login directly to researcher dashboard
- Organization account flow:
  1) register as `COMPANY`
  2) verify email
  3) login -> onboarding step `CHOOSE_PATH`
  4) choose one:
     - create a new organization
     - join an existing organization via invite token/code
     - open and accept a unique invite URL

## Invitation Rules
- Organization invitation URL/token is unique per invitation.
- Invitations can be bound to a specific user account (`userId`), so only that account can accept.
- If invitation is email-based (not bound), signed-in email must match invite email.
- Invitation acceptance completes membership and moves user onboarding to `COMPLETE`.

## Recent Changes (Auth / Onboarding / Frontend)
- `apps/api/src/modules/auth/auth.service.ts`
  - `verifyEmail()` now **does not force** `onboardingStep = CHOOSE_PATH`.
  - It preserves the step already decided at registration and returns `nextStep` from DB.
- `apps/api/src/modules/auth/__tests__/verify-email-onboarding.test.ts`
  - Updated test to assert onboarding step is preserved after verification.
- `apps/api/src/modules/onboarding/onboarding.service.ts`
  - `skipInviteWait()` now rejects skipping (org onboarding cannot be bypassed).
  - User must either create org or accept an invitation.
- `apps/api/src/modules/onboarding/__tests__/onboarding.service.test.ts`
  - Updated skip-onboarding test to assert rejection.
- `frontend/src/pages/onboarding/OnboardingChoice.tsx`
  - Removed "continue as researcher" path.
  - Added org-only actions: create org, or accept invite token/code.
  - Added invite acceptance call to `/invites/accept/:token`.
- `frontend/src/pages/auth/Login.tsx`
  - Added post-login return handling for invite URLs (`/invites/accept?...`) to complete acceptance flow.
- `frontend/src/pages/auth/VerifyEmail.tsx`
  - Updated UX copy: onboarding is organization-only.
- `frontend/src/pages/auth/Register.tsx`
  - Updated researcher subtitle to explicitly state no onboarding.

## Remaining To Do
- Add backend endpoint for invite-code pre-validation (optional UX improvement).
- Add E2E tests for:
  - researcher register -> verify -> login (no onboarding redirect)
  - company register -> verify -> login (onboarding redirect)
  - login from invite URL -> accept -> org redirect
- Decide whether `/onboarding/skip` route should be removed entirely or kept as disabled/deprecated.
