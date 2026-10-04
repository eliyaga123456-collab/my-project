# EAR* — Eliya's Anonymous Replies

Anonymous Q&A you can actually trust: get a personal link, start an anonymous **round** with its own question, share it, read what people
really think, reply publicly if you want, and stay in control with filters, hidden words, blocking and reporting.
English and Hebrew (עברית, full RTL) everywhere. `* For Liron 💛`

| Part | Where | Stack |
|---|---|---|
| API | `apps/api` | Fastify 5, TypeScript, Drizzle ORM, PostgreSQL 16 |
| Web | `apps/web` | Next.js 16 (App Router), Tailwind v4, installable as a PWA (`/install`) |
| Admin | `apps/admin` | Vite + React 19 |
| Mobile | `apps/mobile` | Expo SDK 57, React Native, expo-router |
| Shared | `packages/{shared,api-client,tokens}` | zod schemas/DTOs, typed API client, design tokens |

## Quick start (local)
```bash
npm install
bash scripts/db-up.sh            # local PostgreSQL (or: docker compose -f .devcontainer/docker-compose.yml up -d db)
npm run db:migrate               # create tables
npm run db:seed -w @unsaid/api   # first admin (see apps/api/.env.example; change the password)
npm run dev:api                  # http://localhost:4000
npm run dev:web                  # http://localhost:3000
npm run dev:admin                # http://localhost:3100
npm run dev:mobile               # Expo (see apps/mobile/README.md)
```
No setup at all: open the repo in **GitHub Codespaces** (`docs/CODESPACES.md`) and get a public link.

## Checks
```bash
npm run typecheck                # all workspaces
npm test                         # unit + integration (needs the local Postgres)
npm run test:e2e -w @unsaid/web  # Playwright against the running stack
```

## Docs
`docs/PLAN.md` plan and decisions · `docs/ARCHITECTURE.md` · `docs/API.md` · `docs/DATABASE.md` · `docs/SECURITY.md` ·
`docs/TESTING.md` · `docs/DEPLOY_FREE.he.md` (free launch in minutes, Hebrew) · `docs/DEPLOYMENT.md` (free-tier hosting, more options) · `docs/CODESPACES.md` · `docs/DESIGN.md` · `FINAL_REPORT.md`

## Principles
Anonymous for the sender, safe for the recipient. Recipients never see sender IP, account, or ids; abuse control uses only a keyed hash that is
deleted after 30 days. Moderation is layered (client → server → rules → rate limits → reports → admin). We never claim to identify senders.
