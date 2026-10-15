/*
  Replaces the unused Insight / InsightHighlight tables with nestable Theme / ThemeHighlight.

  Hand-edited twice (decision D48): Prisma also emitted DROP INDEX / DROP DEFAULT for the generated
  "search" columns it cannot represent. Its first, non-transactional run dropped the GIN indexes before
  failing, so this version is idempotent and recreates them.
*/
DO $$ BEGIN
  CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE IF EXISTS "Insight" DROP CONSTRAINT IF EXISTS "Insight_createdById_fkey";
ALTER TABLE IF EXISTS "Insight" DROP CONSTRAINT IF EXISTS "Insight_projectId_fkey";
ALTER TABLE IF EXISTS "InsightHighlight" DROP CONSTRAINT IF EXISTS "InsightHighlight_highlightId_fkey";
ALTER TABLE IF EXISTS "InsightHighlight" DROP CONSTRAINT IF EXISTS "InsightHighlight_insightId_fkey";
DROP TABLE IF EXISTS "InsightHighlight";
DROP TABLE IF EXISTS "Insight";

CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confidence" "Confidence",
    "productArea" TEXT,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThemeHighlight" (
    "themeId" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ThemeHighlight_pkey" PRIMARY KEY ("themeId","highlightId")
);

CREATE INDEX "Theme_parentId_idx" ON "Theme"("parentId");
CREATE INDEX "ThemeHighlight_highlightId_idx" ON "ThemeHighlight"("highlightId");

ALTER TABLE "Theme" ADD CONSTRAINT "Theme_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThemeHighlight" ADD CONSTRAINT "ThemeHighlight_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThemeHighlight" ADD CONSTRAINT "ThemeHighlight_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "Highlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restore the full-text indexes from the search_vectors migration.
CREATE INDEX IF NOT EXISTS "Segment_search_idx" ON "Segment" USING GIN ("search");
CREATE INDEX IF NOT EXISTS "Highlight_search_idx" ON "Highlight" USING GIN ("search");
CREATE INDEX IF NOT EXISTS "Segment_text_trgm_idx" ON "Segment" USING GIN ("text" gin_trgm_ops);
