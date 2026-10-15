# Project rules for coding agents

- Every non-obvious decision goes into `documentation/decisions.md` (numbered, dated, with the why). Append; never rewrite history.
- Read `node_modules/next/dist/docs/01-app/` before writing a new Next.js area. This is Next 16: `params`/`searchParams` are Promises, Turbopack is the default, `middleware.ts` is replaced by `proxy.ts`.
- Do not add a `proxy.ts`. It buffers request bodies and truncates them at 10 MB, which breaks uploads (decision D12). If one is ever needed, its matcher must exclude `/api/upload` and `/api/media`.
- Every mutation goes through `projectAction` or `authedAction` in `src/server/action.ts`; never query without a role check.
- Highlights anchor to `(segmentId, offset)`. Never store whole-transcript positions.
- Seed data is synthetic (`fixtures/mirror`). Never copy content from `~/dovetail_mirror` into this repo.
- Prisma stays on major 7 (`^7.10`); do not upgrade to the 8 release candidate.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
- If `next dev` starts reloading every page continuously ("[Fast Refresh] rebuilding" with no file changes), stop it, `rm -rf .next`, and start it again. Stale state in `.next` (after a production build or `prisma generate` while dev was running) causes it; it is not a code problem.
- Adding a new export to a server module that `next dev` has already compiled can leave the running server with the old module ("X is not a function" although the export exists). Restart `next dev` after adding exports to existing server files.
