-- Full-text search columns. Prisma's init migration created plain "search" tsvector columns
-- (schema uses Unsupported("tsvector")); replace them with generated columns and index them.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "Segment" DROP COLUMN "search";
ALTER TABLE "Segment" ADD COLUMN "search" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("text", ''))) STORED;

ALTER TABLE "Highlight" DROP COLUMN "search";
ALTER TABLE "Highlight" ADD COLUMN "search" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce("text", '') || ' ' || coalesce("note", ''))) STORED;

CREATE INDEX "Segment_search_idx" ON "Segment" USING GIN ("search");
CREATE INDEX "Highlight_search_idx" ON "Highlight" USING GIN ("search");

-- Language-neutral substring fallback (ILIKE) for exact phrases and non-English transcripts.
CREATE INDEX "Segment_text_trgm_idx" ON "Segment" USING GIN ("text" gin_trgm_ops);

-- Tag names are unique case-insensitively (Prisma's @unique covers the exact-case case).
CREATE UNIQUE INDEX "Tag_name_lower_key" ON "Tag" (lower("name"));
