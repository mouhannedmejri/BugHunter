# AI Agent Reference for This Project

Use this file as the default orientation for any new AI agent working on this codebase.

## 1) Project Snapshot
- Platform: **BugHuntr**
- Monorepo with backend API, frontend app, and worker services
- Main goal: bug bounty and vulnerability report lifecycle management

### Tech Stack
- Backend: Node.js 20, TypeScript, Fastify, Prisma
- DB/Infra: PostgreSQL, Redis, BullMQ, S3-compatible storage
- Frontend: Next.js 14 (App Router), React, Tailwind, shadcn/ui
- Auth: JWT access token + refresh cookie, optional 2FA
- Tests: Vitest, Supertest, Playwright

## 2) Key Business Rules
- All money stored as integers (smallest currency unit).
- All timestamps are UTC ISO-8601.
- Soft delete uses nullable `deleted_at`.
- Every mutation should create an audit log entry.
- Researchers do not complete onboarding.
- Organization users must complete org onboarding path.

## 3) Important Enums
- Severity: `CRITICAL | HIGH | MEDIUM | LOW | INFORMATIONAL`
- Report status: `DRAFT | SUBMITTED | RECEIVED | NEEDS_INFO | TRIAGING | ACCEPTED | DUPLICATE | INFORMATIVE | NOT_APPLICABLE | OUT_OF_SCOPE | RESOLVED | REWARDED | CLOSED | ESCALATED`
- Program type: `PUBLIC | PRIVATE | CAMPAIGN | CHALLENGE | EMERGENCY`
- Payout status: `PENDING_APPROVAL | APPROVED | PROCESSING | COMPLETED | FAILED | CANCELLED`

## 4) Roles and Permissions
- Platform role on `User.platformRole`:
  - `SUPER_ADMIN | SUPPORT | AUDITOR | USER`
- Organization role on `OrganizationMember.role`:
  - `ORG_ADMIN | PROGRAM_MANAGER | REVIEWER | FINANCE | VIEWER`
- Researchers usually interact through program participation, not org roles.

## 5) Current Auth + Onboarding Flow

### Researcher
1. Register as `RESEARCHER`
2. Verify email
3. Login directly to researcher dashboard

### Company/Organization User
1. Register as `COMPANY`
2. Verify email
3. Login and continue onboarding (`CHOOSE_PATH`)
4. Choose one:
   - create organization
   - join with invite token/code
   - accept unique invite URL

## 6) API and Routing Conventions
- API base path: `/api/v1/`
- JSON keys: camelCase
- URL segments: kebab-case
- DB naming: snake_case

## 7) Coding Conventions
- Files: kebab-case
- Classes/types: PascalCase
- Variables/functions: camelCase
- Prefer small focused services and schema-validated routes.
- Keep changes consistent with existing module structure.

## 8) Agent Working Rules
- Do not break onboarding logic:
  - researcher: no onboarding wall
  - company: onboarding required
- Preserve backward-compatible API behavior unless explicitly changing contract.
- Add/update tests when changing auth, onboarding, reports, or role-sensitive logic.
- Avoid broad refactors unless requested.
- Keep security-sensitive changes explicit and reviewed (auth, tokens, invites, role checks).

## 9) Safe First Tasks for a New Agent
- Run tests around edited modules first.
- Validate auth/onboarding branch behavior after changes.
- Add missing tests for invite acceptance and onboarding redirects.
- Improve error messages and request validation for edge cases.

## 10) Suggested Kickoff Prompt for Any New Agent
Use this prompt when starting a fresh AI coding session:

```text
You are working in the BugHuntr monorepo.
Read 00_CONTEXT.md first, then inspect only files relevant to the requested task.
Preserve current onboarding behavior:
- RESEARCHER: verify email -> login dashboard (no onboarding)
- COMPANY: verify email -> onboarding flow required
Follow current stack and naming conventions, and add tests for changed logic.
For auth/onboarding/report changes, explicitly list risk of regression and how you validated behavior.
```

## 11) Quick File Pointers
- Shared context: `00_CONTEXT.md`
- API modules: `apps/api/src/modules/`
- Frontend pages: `frontend/src/pages/`
- Worker/email logic: `apps/worker/src/`

---
If behavior in code and this document ever disagree, **code + tests are the source of truth**, then update this file.
