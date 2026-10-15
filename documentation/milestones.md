# Milestone log

What each milestone delivered and how it was verified. Decisions live in `decisions.md`.

## M0 · Scaffold (2026-10-15)

- Next.js 16.4 + TypeScript app, Tailwind 4, shadcn UI kit copied from the sibling project, Prisma 7.10 with the pg adapter, vitest, playwright.
- `/api/health` checks the database. `/projects` placeholder page behind the app shell with sidebar.
- Local database `research` on Homebrew Postgres 17.
- Verified: `pnpm dev`, `curl /api/health` → `{"ok":true,"db":"up"}`, `/projects` → 200, typecheck and lint clean.

## M1 · Schema and role seam (2026-10-15)

- Full Prisma schema for v1 plus the v2 insight tables (`prisma/schema.prisma`).
- Migration `init` (Prisma-generated) and `search_vectors` (hand-written): generated `tsvector` columns on Segment and Highlight with GIN indexes, `pg_trgm` index on segment text, unique index on `lower(Tag.name)`.
- `src/lib/auth.ts`: dev-user seam (`AUTH_DISABLED`, `DEV_USER=admin|editor|viewer`), refused in production.
- `src/lib/authz.ts`: pure `resolveRole`, `requireProjectRole`, `visibleProjectsWhere`, lookups from source/highlight/segment to project.
- `src/server/action.ts`: `authedAction` and `projectAction` wrappers; every mutation goes through them.
- Seed creates three dev users.
- Verified: `prisma migrate status` up to date; `\d "Segment"` shows the generated column and indexes; 7 unit tests for the role matrix pass.
