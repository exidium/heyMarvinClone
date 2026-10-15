# Project rules for coding agents

- Every non-obvious decision goes into `documentation/decisions.md` (numbered, dated, with the why). Append; never rewrite history.
- Read `node_modules/next/dist/docs/01-app/` before writing a new Next.js area. This is Next 16: `params`/`searchParams` are Promises, Turbopack is the default, `middleware.ts` is replaced by `proxy.ts`.
- Do not add a `proxy.ts`. It buffers request bodies and truncates them at 10 MB, which breaks uploads (decision D12). If one is ever needed, its matcher must exclude `/api/upload` and `/api/media`.
- Every mutation goes through `projectAction` or `authedAction` in `src/server/action.ts`; never query without a role check.
- Highlights anchor to `(segmentId, offset)`. Never store whole-transcript positions.
- Seed data is synthetic (`fixtures/mirror`). Never copy content from `~/dovetail_mirror` into this repo.
- Prisma stays on major 7 (`^7.10`); do not upgrade to the 8 release candidate.
