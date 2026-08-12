# SkillBridge (skillbridge-next)

Reverse-hiring marketplace connecting university students with companies.
Monorepo: Next.js frontend (`apps/web`) + Express API (`apps/api`), with a
shared PostgreSQL (Prisma) database.

## Prerequisites

- Node 18+, pnpm 11 (pinned via `packageManager`)
- PostgreSQL 16 (local demo uses the Homebrew `postgresql@16` service)

## Quick start (local demo)

```bash
# 1. Install deps
pnpm install

# 2. Set up the API env (copy the example, it points at your local PG)
cp apps/api/.env.example apps/api/.env

# 3. Sync the database schema + generate Prisma client
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma db push

# 4. (First time only) seed realistic demo data
pnpm --filter api seed

# 5. Boot Postgres + web + API together
pnpm run dev:full
```

- Web:  http://localhost:3000  (Next.js, proxies `/api/v1` → API)
- API:  http://localhost:3001  (Express, health check at `/health`)

> `pnpm run dev:full` starts Postgres (Homebrew), the web dev server, and the
> API in parallel. If Postgres is already running it no-ops.

### Demo logins

Password for **all** seeded accounts is `Password123!`:

| Role     | Email                          |
|----------|--------------------------------|
| Student  | `chan.dara@skillbridge.demo`   |
| Employer | `mekong.studio@skillbridge.demo` |
| Admin    | (any `@skillbridge.demo` user with `admin` role) |

## How it fits together

```
Browser ── http://localhost:3000 ── Next.js (apps/web)
                                     │  rewrites /api/v1/* ──┐
                                     ▼                       │
                              Express API (apps/api) ◄────────┘
                                     │
                                     ▼
                            PostgreSQL (Prisma)
```

`apps/web/next.config.ts` rewrites `/api/v1/:path*` →
`http://localhost:3001/api/v1/:path*`, so the frontend and API share one
origin in dev (no CORS/CSP headaches). In production, set
`NEXT_PUBLIC_API_URL` to your deployed API base URL instead.

## Useful scripts

| Command              | What it does                                  |
|----------------------|-----------------------------------------------|
| `pnpm dev`           | Web only                                      |
| `pnpm dev:api`       | API only                                      |
| `pnpm dev:all`       | Web + API (assumes Postgres already up)       |
| `pnpm run dev:full`  | Postgres + Web + API (one command)            |
| `pnpm --filter api seed` | (re)seed demo data                       |
| `pnpm run build`     | Build the web app                             |
| `pnpm run lint`      | Lint the web app                              |

## Production deployment

- Frontend: Vercel, Root Directory `apps/web`, framework `nextjs`.
- API: deploy separately (Railway / Render / Vercel), set `DATABASE_URL`,
  `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`.
- See `apps/api/.env.example` for the full env list.
