Program (monorepo)
# Program (monorepo)

## Requirements
- Node.js 22+
- pnpm 10+ (Corepack ok)
- Docker Desktop

## Project structure
- `apps/api` – NestJS + Prisma + PostgreSQL
- `apps/web` – Vite + React + TS

## Setup
```bash
pnpm install

Environment

Create local env files (do not commit them):

apps/api/.env

apps/web/.env

Examples:

apps/api/.env.example

apps/web/.env.example

Database (Postgres in Docker)

From repo root:

docker compose up -d


Note: DB port is mapped to 5435 (avoid conflicts with local Postgres).

Prisma (migrations + client)

From repo root:

pnpm -C apps/api exec prisma migrate dev
pnpm -C apps/api exec prisma generate

Run (dev)

API:

pnpm dev:api


WEB:

pnpm dev:web


Open:

API: http://localhost:3000

WEB: http://localhost:5173

Useful

Stop DB:

docker compose down


Reset DB (deletes volume):

docker compose down -v
docker compose up -d