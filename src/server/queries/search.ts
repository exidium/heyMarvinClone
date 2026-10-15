import "server-only";
import { db } from "@/lib/db";
import { Prisma, type User } from "@/generated/prisma/client";
import type { SearchFilters } from "@/lib/validation/search";
import { tagSelect } from "@/server/queries/tags";

export const PAGE_SIZE = 25;
/** Snippet delimiters that cannot appear in transcripts; the UI splits on them instead of trusting HTML. */
export const SNIP_OPEN = "⟦";
export const SNIP_CLOSE = "⟧";
const HEADLINE_OPTS = `StartSel=${SNIP_OPEN},StopSel=${SNIP_CLOSE},MaxFragments=2,MaxWords=28,MinWords=12,FragmentDelimiter= … `;

export type HighlightHit = {
  id: string; text: string; snippet: string; status: "ACTIVE" | "ORPHANED"; createdAt: Date;
  sourceId: string; sourceTitle: string; sourceDate: Date | null; projectId: string; projectName: string; productArea: string | null;
  participants: string | null; startSegmentId: string; startMs: number | null; rank: number;
  tags: { id: string; name: string; color: string | null; group: { id: string; name: string; color: string | null } | null }[];
};
export type SegmentHit = {
  id: string; snippet: string; speaker: string | null; startMs: number | null; order: number;
  sourceId: string; sourceTitle: string; sourceDate: Date | null; projectId: string; projectName: string; productArea: string | null; rank: number;
};

const sql = Prisma.sql;
const join = Prisma.join;

function accessClause(user: User) {
  if (user.isAdmin) return sql`TRUE`;
  return sql`(p."access" = 'OPEN' OR p."ownerId" = ${user.id} OR EXISTS (SELECT 1 FROM "ProjectMember" pm WHERE pm."projectId" = p."id" AND pm."userId" = ${user.id}))`;
}

/** Filters shared by both scopes; `s` = Source, `p` = Project aliases. */
function commonClauses(f: SearchFilters, user: User) {
  const c: Prisma.Sql[] = [accessClause(user)];
  if (f.projectIds.length) c.push(sql`p."id" IN (${join(f.projectIds)})`);
  if (f.productAreas.length) c.push(sql`p."productArea" IN (${join(f.productAreas)})`);
  if (f.dateFrom) c.push(sql`s."date" >= ${new Date(f.dateFrom)}`);
  if (f.dateTo) c.push(sql`s."date" < ${new Date(new Date(f.dateTo).getTime() + 86_400_000)}`);
  const pa: Prisma.Sql[] = [];
  if (f.roles.length) pa.push(sql`pa."role" IN (${join(f.roles)})`);
  if (f.companies.length) pa.push(sql`pa."company" IN (${join(f.companies)})`);
  if (f.segments.length) pa.push(sql`pa."segment" IN (${join(f.segments)})`);
  if (f.tools.length) pa.push(sql`pa."toolsUsed" && ${f.tools}::text[]`);
  if (pa.length) c.push(sql`EXISTS (SELECT 1 FROM "SourceParticipant" sp JOIN "Participant" pa ON pa."id" = sp."participantId" WHERE sp."sourceId" = s."id" AND ${join(pa, " AND ")})`);
  return c;
}

/** Tag condition on a highlight alias `h`. */
function tagClause(f: SearchFilters, h: Prisma.Sql) {
  if (!f.tagIds.length) return null;
  if (f.tagMode === "all") {
    return sql`(SELECT count(DISTINCT ht."tagId") FROM "HighlightTag" ht WHERE ht."highlightId" = ${h}."id" AND ht."tagId" IN (${join(f.tagIds)})) = ${f.tagIds.length}`;
  }
  return sql`EXISTS (SELECT 1 FROM "HighlightTag" ht WHERE ht."highlightId" = ${h}."id" AND ht."tagId" IN (${join(f.tagIds)}))`;
}

const tsquery = (q: string) => sql`websearch_to_tsquery('english', ${q})`;

export async function searchHighlights(user: User, f: SearchFilters): Promise<{ hits: HighlightHit[]; total: number }> {
  const where = commonClauses(f, user);
  if (f.q) where.push(sql`h."search" @@ ${tsquery(f.q)}`);
  const tc = tagClause(f, sql`h`);
  if (tc) where.push(tc);
  const whereSql = join(where, " AND ");
  const from = sql`FROM "Highlight" h JOIN "Source" s ON s."id" = h."sourceId" JOIN "Project" p ON p."id" = s."projectId" WHERE ${whereSql}`;
  const rank = f.q ? sql`ts_rank_cd(h."search", ${tsquery(f.q)})` : sql`0`;
  const snippet = f.q ? sql`ts_headline('english', h."text", ${tsquery(f.q)}, ${HEADLINE_OPTS})` : sql`left(h."text", 320)`;
  const order = f.q ? sql`rank DESC, h."createdAt" DESC` : sql`s."date" DESC NULLS LAST, h."createdAt" DESC`;

  const [rows, count] = await Promise.all([
    db.$queryRaw<Omit<HighlightHit, "tags">[]>`
      SELECT h."id", h."text", ${snippet} AS "snippet", h."status", h."createdAt", h."startSegmentId",
             s."id" AS "sourceId", s."title" AS "sourceTitle", s."date" AS "sourceDate",
             p."id" AS "projectId", p."name" AS "projectName", p."productArea",
             (SELECT string_agg(pa."name", ', ' ORDER BY pa."name") FROM "SourceParticipant" sp JOIN "Participant" pa ON pa."id" = sp."participantId" WHERE sp."sourceId" = s."id") AS "participants",
             (SELECT g."startMs" FROM "Segment" g WHERE g."id" = h."startSegmentId") AS "startMs",
             ${rank}::float AS "rank"
      ${from}
      ORDER BY ${order}
      LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n ${from}`,
  ]);
  const tagRows = rows.length
    ? await db.highlightTag.findMany({ where: { highlightId: { in: rows.map((r) => r.id) } }, select: { highlightId: true, tag: { select: tagSelect } } })
    : [];
  const tagsBy = new Map<string, HighlightHit["tags"]>();
  for (const t of tagRows) tagsBy.set(t.highlightId, [...(tagsBy.get(t.highlightId) ?? []), t.tag]);
  return { hits: rows.map((r) => ({ ...r, tags: tagsBy.get(r.id) ?? [] })), total: Number(count[0]?.n ?? 0) };
}

export async function searchSegments(user: User, f: SearchFilters): Promise<{ hits: SegmentHit[]; total: number }> {
  const where = commonClauses(f, user);
  if (f.q) where.push(sql`g."search" @@ ${tsquery(f.q)}`);
  const tc = tagClause(f, sql`h`);
  if (tc) {
    // A segment matches a tag filter when a tagged highlight covers it.
    where.push(sql`EXISTS (SELECT 1 FROM "Highlight" h JOIN "Segment" s1 ON s1."id" = h."startSegmentId" JOIN "Segment" s2 ON s2."id" = h."endSegmentId"
      WHERE h."sourceId" = g."sourceId" AND s1."order" <= g."order" AND g."order" <= s2."order" AND ${tc})`);
  }
  const whereSql = join(where, " AND ");
  const from = sql`FROM "Segment" g JOIN "Source" s ON s."id" = g."sourceId" JOIN "Project" p ON p."id" = s."projectId" WHERE ${whereSql}`;
  const rank = f.q ? sql`ts_rank_cd(g."search", ${tsquery(f.q)})` : sql`0`;
  const snippet = f.q ? sql`ts_headline('english', g."text", ${tsquery(f.q)}, ${HEADLINE_OPTS})` : sql`left(g."text", 320)`;
  const order = f.q ? sql`rank DESC, s."date" DESC NULLS LAST, g."order" ASC` : sql`s."date" DESC NULLS LAST, g."order" ASC`;
  const [rows, count] = await Promise.all([
    db.$queryRaw<SegmentHit[]>`
      SELECT g."id", ${snippet} AS "snippet", g."speaker", g."startMs", g."order",
             s."id" AS "sourceId", s."title" AS "sourceTitle", s."date" AS "sourceDate",
             p."id" AS "projectId", p."name" AS "projectName", p."productArea", ${rank}::float AS "rank"
      ${from}
      ORDER BY ${order}
      LIMIT ${PAGE_SIZE} OFFSET ${(f.page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n ${from}`,
  ]);
  return { hits: rows, total: Number(count[0]?.n ?? 0) };
}
