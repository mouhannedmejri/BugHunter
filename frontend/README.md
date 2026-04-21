# BugHuntr Frontend

Frontend application for the BugHuntr platform (researcher, organization, and admin panels).

## Stack

- Vite + React + TypeScript
- React Router
- TanStack Query
- shadcn/ui + Tailwind CSS

## Project Location

This frontend is located in `frontend/`.

## Run Locally

1. Install dependencies:
   - `npm install`
2. Copy environment file:
   - `cp .env.example .env` (or create `.env` manually on Windows)
3. Start frontend:
   - `npm run dev`
4. Frontend URL:
   - `http://localhost:8080`

## Backend Integration

The frontend is connected to the implemented Fastify backend API under `/api/v1`.

- Default API base:
  - `VITE_API_BASE_URL=/api/v1`
- API client:
  - `src/lib/api.ts`
- Dev proxy:
  - `vite.config.ts` proxies `/api` to `http://localhost:3000`

So in development:
- Frontend calls `/api/v1/...`
- Vite forwards requests to backend at `http://localhost:3000/api/v1/...`

## Required Backend

Start the backend before using authenticated/real data screens:

- API service (`apps/api`) should run on `http://localhost:3000`
- Ensure backend env and DB/Redis are configured from root `.env`

## Implemented Backend Areas Used By Frontend

The frontend routes are already aligned with backend modules that were implemented:

- Auth and sessions
- Organizations, members, programs, assets
- Triage and comments
- Notifications
- Rewards and payouts
- Analytics and search
- Admin dashboards/tools
- Integrations (webhooks, API keys, ticket push, SSO config)

## Build

- Production build: `npm run build`
- Preview build: `npm run preview`

## Notes

- Access token is stored in memory by the frontend API client.
- Refresh token is cookie-based (`credentials: "include"`).
- All API responses are expected as `{ data: ... }` with backend error format support.
