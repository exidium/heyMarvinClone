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

## M3 · Projects, participants, sources (2026-10-15)

- Pages: `/projects` (list, show archived toggle, new project dialog), `/projects/[id]` (header, goal, sources table, participants, members panel, edit/archive/delete), `/projects/[id]/sources/[id]` (read-only transcript until M5, edit/delete), `/participants` (search, new), `/participants/[id]` (attributes, sources, edit/delete). Placeholders for `/search` and `/tags`.
- Server actions in `src/server/actions/{projects,participants,sources}.ts`, all through `authedAction`/`projectAction`; zod schemas in `src/lib/validation/`; queries in `src/server/queries/`.
- `ParticipantPicker` searches existing participants and creates one inline, so a person is reused across projects without retyping.
- Members panel adds users by email with a role; restricted projects are hidden from the list, detail and participant source lists for non-members.
- Verified: typecheck and lint clean; every page returns 200 for the admin dev user; the restricted project returns 404 for viewer@local and is absent from their list; the "New source" button only renders for editor and admin.

## M4 · Upload, parsers, media (2026-10-15)

- `src/lib/storage.ts`: files under `UPLOAD_DIR/sources/<sourceId>/`, streamed through a byte limiter to a temp file and renamed on success; path-escape guards.
- Parsers in `src/lib/transcript/`: VTT (voice tags, NOTE/STYLE blocks, markup stripped, entities decoded), SRT (comma timings, `{\an8}` and HTML stripped), DOCX via mammoth (`Name:` prefix, optional leading or inline timestamp), plus `coalesce.ts` that merges fine-grained cues into utterances (D18) and `parse-file.ts` dispatching on extension.
- `PUT /api/upload/[sourceId]/[kind]`: raw-body upload (D13), extension allowlist (415), size limit (413), highlight lock (409, D20), parse and replace segments, FAILED status with message on parse errors. Replacing a file deletes the previous one.
- `GET/HEAD /api/media/[sourceId]/[kind]`: single-range streaming (206/416) for recordings, attachment download for transcripts, VIEWER role required.
- UI: upload panel with drag-and-drop, progress and download links; media player bound to a small zustand store; transcript view where clicking a line seeks and the playing line is marked. Duration is persisted once from the browser's `loadedmetadata`, no ffprobe.
- Verified: 30 unit tests (parsers, coalescing, storage limiter); curl run on a scratch source: VTT parsed into 5 segments with two speakers, DOCX replace, `.pdf` → 415, 5 KB recording stored, `Range: 100-199` → 206 with correct `Content-Range`, bad range → 416, downloaded bytes identical, viewer gets 403 on upload and 200 on playback, seeded source with highlights → 409.

## M5 · Transcript editor and highlights (2026-10-15)

- `src/lib/transcript/schema.ts` (doc > segment+ > text, highlight mark with `excludes: ""` so highlights can overlap) and `doc.ts` (build the editor document from rows, selection → anchors, mark ranges → offsets, anchors → positions), both pure and unit-tested.
- `src/components/transcript/editor-extensions.ts`: plain-DOM segment node view with speaker and time gutter; Enter/Backspace/Delete at boundaries are no-ops; a `filterTransaction` plugin rejects any transaction that changes the number or order of segments (D6); paste is plain text.
- `TranscriptEditor.tsx`: TipTap editor, floating selection toolbar (highlight, or highlight with a tag), highlight side panel (tags, delete, orphaned section), speaker popover (rename one line or all lines, link a participant), click-to-seek and playback marking, `?highlight=` deep link selection.
- Server actions in `src/server/actions/highlights.ts`: `createHighlight` (validates anchors, text = slice), `setHighlightTags`, `deleteHighlight`, `saveSegment` (version check; re-anchors highlights that start or end in the edited segment from the editor's mark ranges; orphans single-segment highlights whose marks vanished; shifts multi-segment ones to the neighbouring boundary), `renameSpeaker`. `createTag` lets editors add tags inline.
- Verified: 36 unit tests; Playwright `tests/e2e/transcript.spec.ts` (4 tests) against the seeded DB: seeded highlights render as marks and panel items; a highlight across two segments is stored with segment anchors; typing before it shifts only its start offset and leaves its text unchanged after reload; deleting a highlight's words marks it ORPHANED with the text kept; the test cleans up after itself.
- Fixed along the way: a `"use server"` module may only export async functions (moved `highlightSelect` to `src/server/queries/highlights.ts`); Playwright needed a newer Chromium build.

## M6 · Tag management (2026-10-15)

- `/tags`: groups in order (rename inline, move up/down, delete keeps tags), tags per group with usage counts, inline rename (case-insensitive clash is reported), colour picker, move between groups, merge dialog, archive/restore (archived hidden by default, still shown on existing highlights), delete with confirmation. Non-admins see the list read-only.
- Actions in `src/server/actions/tags.ts`, all `requireAdmin` except `createTag` (editors create tags while highlighting). Query `listTagsAdmin` in `src/server/queries/tags.ts`.
- Verified: Playwright `tests/e2e/tags.spec.ts`: merging a tag into another keeps every highlight tagged exactly once, removes the source tag, and lowers the tag count by one; rename and archive update the row and the database. Typecheck and lint clean.
- Note: the dev server briefly served the tags page in a Fast Refresh reload loop right after new server actions were added; it cleared after other pages were visited. Restarting `next dev` after adding a `"use server"` module avoids it.

## M7 · Search and saved views (2026-10-15)

- `src/lib/validation/search.ts` is the one filter shape; `src/lib/search-params.ts` maps it to short URL keys with nuqs (`q`, `scope`, `project`, `area`, `tag`, `tags=any|all`, `role`, `company`, `segment`, `tool`, `from`, `to`, `page`).
- `src/server/queries/search.ts`: two `$queryRaw` queries (highlights, transcript lines) with ranking, `ts_headline` snippets, access clause, project/product-area/date/participant filters, tag ANY/ALL, offset pagination (25 per page).
- `/search`: filter bar (keyword, scope toggle, project, product area, tags with any/all, role, company, segment, tool, dates, clear), result cards linking to `?highlight=` or `?segment=` on the source page, pagination, save view. `/views/[id]` redirects to the search; the sidebar lists own and shared views; a view can be deleted from its search page.
- Verified: 8 DB-backed vitest cases over the SQL (keyword, phrase and negation, tag ANY ⊇ ALL, project/area/date/company narrowing, tag filter on lines, viewer never sees the restricted project, pagination) plus 3 Playwright tests (result → highlighted moment selected in the editor; transcript result → segment flashed; filter in URL → saved view → reopened from sidebar → deleted).

## M8 · Deploy preparation (2026-10-15)

- `Dockerfile` (multi-stage, standalone output, non-root), `docker-compose.prod.yml` (app, db, `migrate` and `backup` tool profiles, named volumes for Postgres and uploads), `deploy/Caddyfile`, `deploy/.env.prod.example`, `scripts/backup.sh` for cron, and `documentation/deploy.md` with the one-time setup, release steps, first admin and restore notes.
- The app shell is `force-dynamic` so a production build never prerenders a database page. `UPLOAD_DIR` resolution carries a `turbopackIgnore` hint so the standalone bundle does not trace the whole project.
- Verified: `pnpm build` passes with every app route dynamic and no trace warning; `node .next/standalone/server.js` answers `/api/health`, redirects `/projects` to `/login` when signed out, and serves `/login`. Docker itself is verified on the server (not installed locally, D4).

## M9 · Login and users (2026-10-15)

- `src/lib/password.ts` (argon2id via `@node-rs/argon2`), `src/lib/session.ts` (random token in an HttpOnly cookie, SHA-256 stored, 30 days), `src/lib/auth.ts` now resolves the dev seam or the session; `requirePageUser` vs `requireUser` (D35).
- `/login` (form with `useActionState`, generic error, keeps the email), sign-out in the sidebar, `/users` admin page (create with initial password, toggle admin, set password, delete with project reassignment), `scripts/create-user.ts` for the first admin. Seed gives dev users the password `password12` (override with `DEV_PASSWORD`).
- Verified: `AUTH_E2E=1` Playwright spec with `AUTH_DISABLED=false`: signed-out redirect, wrong password rejected without clearing the email, editor signs in and out and never sees Users, admin sees Users, anonymous `PUT /api/upload` gets 401. Standalone production server refuses the dev seam in production.
