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

## M2 · Synthetic mirror, importer, seed (2026-10-15)

- `scripts/generate-synthetic-mirror.ts` writes `fixtures/mirror/` with seeded faker data in the Dovetail-mirror shape: 6 projects, 4–6 files each (one note file per project), 24–36 highlights per project with tags, 8 tag groups, duplicate project-scoped tags, and a `participants.json` extension per project carrying role, company, segment and tools.
- `src/lib/transcript/parse-dovetail-md.ts` parses `**Speaker (m:ss):**` turns (also `h:mm:ss`), joins continuation lines, and classifies files with fewer than three turns as notes.
- `src/lib/transcript/locate.ts` finds quoted text inside segments: exact, then whitespace/case-normalised, then by time overlap; otherwise the highlight is imported as ORPHANED.
- `src/server/import/dovetail.ts` upserts everything by external id (idempotent); tags are deduplicated case-insensitively and remember every mirror id in `externalIds`.
- `prisma/seed.ts` truncates content tables, upserts the three dev users, imports `MIRROR_DIR`, and makes the Block Diagramming project RESTRICTED with editor@local as EDITOR.
- Verified: 17 unit tests pass; seed reports 6 projects, 30 sources, 955 segments, 30 participants, 41 tags in 8 groups, 174 highlights (146 exact, 19 normalised, 7 by time, 2 orphaned). A SQL check confirms every ACTIVE single-segment highlight's text equals the slice of its segment at the stored offsets.
