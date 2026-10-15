# Architecture

One Next.js 16 app (frontend + API), one Postgres 17 database, files on server disk. See `decisions.md` for the why behind each choice.

## Layout

```
src/
  app/
    (app)/                      authenticated shell (sidebar); layout calls the auth seam
      projects/…                list, new, [projectId] overview, settings
      projects/[projectId]/sources/[sourceId]/   transcript editor page
      participants/…            global participant list and detail
      tags/                     admin tag manager
      search/                   filters in the URL (nuqs), two result tabs
      views/[viewId]            redirects to /search?… from a saved view
    (auth)/login                last milestone
    api/health                  liveness + DB check
    api/upload/[sourceId]/[kind]   PUT raw body, streamed to disk (kind = transcript | recording)
    api/media/[sourceId]/[kind]    GET/HEAD with HTTP Range support
  lib/
    db.ts                       Prisma client singleton (pg adapter)
    auth.ts                     who is the current user (dev seam until login exists)
    authz.ts                    project role resolution and enforcement
    storage.ts                  UPLOAD_DIR paths, safe joins, atomic writes
    validation/                 zod schemas shared by actions and forms
    transcript/                 pure parsers (vtt, srt, docx, dovetail-md), coalesce, locate, doc builder, anchors
  server/
    action.ts                   authedAction + projectAction wrappers (single enforcement seam)
    actions/                    server actions per entity
    queries/                    read queries, including raw full-text search
    import/dovetail.ts          mirror-shaped importer used by the seed
  components/                   ui (shadcn), shell, and feature folders
prisma/                         schema + migrations (search_vectors migration is hand-edited SQL)
scripts/generate-synthetic-mirror.ts   writes fixtures/mirror (synthetic data)
fixtures/mirror/                committed synthetic seed in Dovetail-mirror shape
uploads/                        gitignored; transcripts and recordings per source
documentation/                  this folder: decisions, architecture, milestone notes
```

## Data model in one sentence

A Project has Sources; a Source is split into ordered Segments (speaker, start, end, text); a Highlight anchors to a start and end Segment plus character offsets and carries Tags; Participants are global and linked to Sources; Insights (v2) collect Highlights from any project.

## Highlight anchoring

Highlights store `(startSegmentId, startOffset, endSegmentId, endOffset)`. In the editor each segment is one block node and each highlight is a mark. When a segment's text is edited, the client sends the new text plus the mark ranges inside that segment, and the server recomputes only the anchors of highlights that start or end there. Editing one segment can never move a highlight in another segment.

## Next.js 16 rules that matter here

- `params` and `searchParams` are Promises; use the generated `PageProps<'/route'>` and `RouteContext<'/api/…'>` types. `pnpm typecheck` runs `next typegen` first.
- No `proxy.ts` (see D12). Auth gating happens in the `(app)` layout and in every server action through `projectAction`.
- Uploads never go through server actions or `formData()`; see `api/upload`.
- Read `node_modules/next/dist/docs/01-app/` before writing a new area; the framework differs from older versions.
