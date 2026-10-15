import "server-only";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/authz";
import { Prisma, type User } from "@/generated/prisma/client";
import { formatKey, NONE, parseKey, type NodeKey, type Pivot, type TreeNode } from "@/lib/explore";
import { tagSelect } from "@/server/queries/tags";

/** Highlights the user may see: ACTIVE, in a visible project, and matching the keyword when one is set. */
const visibleHighlights = (user: User, matchIds?: string[] | null): Prisma.HighlightWhereInput => ({
  status: "ACTIVE",
  source: { project: visibleProjectsWhere(user) },
  ...(matchIds ? { id: { in: matchIds } } : {}),
});

/** Ids of highlights whose text matches a websearch query; null when there is no query. */
export async function keywordMatchIds(q: string): Promise<string[] | null> {
  const query = q.trim();
  if (!query) return null;
  const rows = await db.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Highlight" WHERE "search" @@ websearch_to_tsquery('english', ${query})`;
  return rows.map((r) => r.id);
}

const keywordSql = (q: string) => (q.trim() ? Prisma.sql`AND h."search" @@ websearch_to_tsquery('english', ${q.trim()})` : Prisma.empty);

export const explorerHighlightSelect = {
  id: true, text: true, startSegmentId: true, startOffset: true, endSegmentId: true, endOffset: true, createdAt: true, note: true,
  source: { select: { id: true, title: true, date: true, recordingPath: true, recordingMime: true, durationMs: true, project: { select: { id: true, name: true, productArea: true } }, participants: { select: { participant: { select: { id: true, name: true, role: true, company: true, segment: true } } } } } },
  startSegment: { select: { speaker: true, startMs: true, order: true } },
  tags: { select: { tag: { select: tagSelect } } },
  themes: { select: { theme: { select: { id: true, title: true } } } },
} as const;
export type ExplorerHighlight = Prisma.HighlightGetPayload<{ select: typeof explorerHighlightSelect }>;

// ---------- trees ----------

type Row = Record<string, string | null> & { n: bigint | number };
const num = (v: bigint | number) => Number(v);

function group<T extends Row>(rows: T[], by: (r: T) => string | null) {
  const m = new Map<string | null, T[]>();
  for (const r of rows) { const k = by(r); m.set(k, [...(m.get(k) ?? []), r]); }
  return m;
}
const sum = (rows: Row[]) => rows.reduce((a, r) => a + num(r.n), 0);
const byLabel = (a: TreeNode, b: TreeNode) => a.label.localeCompare(b.label);

function accessSql(user: User) {
  return user.isAdmin
    ? Prisma.sql`TRUE`
    : Prisma.sql`(p."access" = 'OPEN' OR p."ownerId" = ${user.id} OR EXISTS (SELECT 1 FROM "ProjectMember" pm WHERE pm."projectId" = p."id" AND pm."userId" = ${user.id}))`;
}

export async function buildTree(user: User, pivot: Pivot, q = ""): Promise<TreeNode[]> {
  const access = accessSql(user);
  const kw = keywordSql(q);
  const matchIds = await keywordMatchIds(q);
  if (pivot === "projects") {
    const rows = await db.$queryRaw<Row[]>`
      SELECT p."productArea" AS area, p."id" AS pid, p."name" AS pname, s."id" AS sid, s."title" AS stitle, g."speaker" AS speaker, count(*) AS n
      FROM "Highlight" h JOIN "Source" s ON s."id" = h."sourceId" JOIN "Project" p ON p."id" = s."projectId" JOIN "Segment" g ON g."id" = h."startSegmentId"
      WHERE h."status" = 'ACTIVE' AND ${access} ${kw}
      GROUP BY 1,2,3,4,5,6`;
    return [...group(rows, (r) => r.area).entries()].map(([area, ar]) => ({
      key: formatKey({ kind: "area", id: area ?? NONE }), label: area ?? "No product area", count: sum(ar),
      children: [...group(ar, (r) => r.pid).entries()].map(([pid, pr]) => ({
        key: formatKey({ kind: "project", id: pid! }), label: pr[0].pname!, count: sum(pr),
        children: [...group(pr, (r) => r.sid).entries()].map(([sid, sr]) => ({
          key: formatKey({ kind: "source", id: sid! }), label: sr[0].stitle!, count: sum(sr),
          children: sr.map((r) => ({ key: formatKey({ kind: "speaker", id: sid!, extra: r.speaker ?? NONE }), label: r.speaker ?? "No speaker", count: num(r.n) })).sort(byLabel),
        })).sort(byLabel),
      })).sort(byLabel),
    })).sort(byLabel);
  }
  if (pivot === "tags") {
    const rows = await db.$queryRaw<Row[]>`
      SELECT tg."id" AS gid, tg."name" AS gname, t."id" AS tid, t."name" AS tname, count(*) AS n
      FROM "HighlightTag" ht JOIN "Tag" t ON t."id" = ht."tagId" LEFT JOIN "TagGroup" tg ON tg."id" = t."groupId"
      JOIN "Highlight" h ON h."id" = ht."highlightId" JOIN "Source" s ON s."id" = h."sourceId" JOIN "Project" p ON p."id" = s."projectId"
      WHERE h."status" = 'ACTIVE' AND t."archivedAt" IS NULL AND ${access} ${kw}
      GROUP BY 1,2,3,4`;
    const untagged = await db.highlight.count({ where: { ...visibleHighlights(user, matchIds), tags: { none: {} } } });
    const groups = [...group(rows, (r) => r.gid).entries()].map(([gid, gr]) => ({
      key: formatKey({ kind: "group", id: gid ?? NONE }), label: gr[0].gname ?? "Ungrouped", count: sum(gr),
      children: gr.map((r) => ({ key: formatKey({ kind: "tag", id: r.tid! }), label: r.tname!, count: num(r.n) })).sort(byLabel),
    })).sort(byLabel);
    return untagged ? [...groups, { key: "untagged", label: "Untagged", count: untagged }] : groups;
  }
  if (pivot === "people") {
    const rows = await db.$queryRaw<Row[]>`
      SELECT pa."segment" AS seg, pa."company" AS company, pa."id" AS paid, pa."name" AS paname, count(DISTINCT h."id") AS n
      FROM "Highlight" h JOIN "Source" s ON s."id" = h."sourceId" JOIN "Project" p ON p."id" = s."projectId"
      JOIN "SourceParticipant" sp ON sp."sourceId" = s."id" JOIN "Participant" pa ON pa."id" = sp."participantId"
      WHERE h."status" = 'ACTIVE' AND ${access} ${kw}
      GROUP BY 1,2,3,4`;
    const none = await db.highlight.count({ where: { ...visibleHighlights(user, matchIds), source: { ...(visibleHighlights(user).source as object), participants: { none: {} } } } });
    const segs = [...group(rows, (r) => r.seg).entries()].map(([seg, sr]) => ({
      key: formatKey({ kind: "segment", id: seg ?? NONE }), label: seg ?? "No segment", count: sum(sr),
      children: [...group(sr, (r) => r.company).entries()].map(([company, cr]) => ({
        key: formatKey({ kind: "company", id: company ?? NONE }), label: company ?? "No company", count: sum(cr),
        children: cr.map((r) => ({ key: formatKey({ kind: "participant", id: r.paid! }), label: r.paname!, count: num(r.n) })).sort(byLabel),
      })).sort(byLabel),
    })).sort(byLabel);
    return none ? [...segs, { key: "noparticipant", label: "No participant linked", count: none }] : segs;
  }
  // themes
  const [themes, counts, unthemed] = await Promise.all([
    db.theme.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true, title: true, parentId: true, confidence: true, productArea: true } }),
    db.$queryRaw<Row[]>`
      SELECT th."themeId" AS tid, count(*) AS n FROM "ThemeHighlight" th
      JOIN "Highlight" h ON h."id" = th."highlightId" JOIN "Source" s ON s."id" = h."sourceId" JOIN "Project" p ON p."id" = s."projectId"
      WHERE h."status" = 'ACTIVE' AND ${access} ${kw} GROUP BY 1`,
    db.highlight.count({ where: { ...visibleHighlights(user, matchIds), themes: { none: {} } } }),
  ]);
  const countOf = new Map(counts.map((r) => [r.tid, num(r.n)]));
  const build = (parentId: string | null): TreeNode[] =>
    themes.filter((t) => t.parentId === parentId).map((t) => {
      const children = build(t.id);
      return { key: formatKey({ kind: "theme", id: t.id }), label: t.title, count: countOf.get(t.id) ?? 0, children: children.length ? children : undefined, meta: { confidence: t.confidence, productArea: t.productArea } };
    });
  return [...build(null), { key: "unthemed", label: "Not in any theme", count: unthemed }];
}

// ---------- highlights under a node ----------

function nodeWhere(key: NodeKey): Prisma.HighlightWhereInput {
  const v = (x?: string) => (x === NONE ? null : x);
  switch (key.kind) {
    case "root": return {};
    case "area": return { source: { project: { productArea: v(key.id) } } };
    case "project": return { source: { projectId: key.id } };
    case "source": return { sourceId: key.id };
    case "speaker": return { sourceId: key.id, startSegment: { speaker: v(key.extra) } };
    case "group": return { tags: { some: { tag: { groupId: v(key.id), archivedAt: null } } } };
    case "tag": return { tags: { some: { tagId: key.id } } };
    case "untagged": return { tags: { none: {} } };
    case "segment": return { source: { participants: { some: { participant: { segment: v(key.id) } } } } };
    case "company": return { source: { participants: { some: { participant: { company: v(key.id) } } } } };
    case "participant": return { source: { participants: { some: { participantId: key.id } } } };
    case "noparticipant": return { source: { participants: { none: {} } } };
    case "theme": return { themes: { some: { themeId: key.id } } };
    case "unthemed": return { themes: { none: {} } };
  }
}

export const LIST_PAGE = 60;

export async function listHighlightsUnder(user: User, rawKey: string, q = "", page = 1) {
  const key = parseKey(rawKey);
  const matchIds = await keywordMatchIds(q);
  const where: Prisma.HighlightWhereInput = { AND: [visibleHighlights(user, matchIds), nodeWhere(key)] };
  const orderBy: Prisma.HighlightOrderByWithRelationInput[] = key.kind === "theme"
    ? [{ createdAt: "asc" }]
    : [{ source: { date: "desc" } }, { source: { title: "asc" } }, { startSegment: { order: "asc" } }, { startOffset: "asc" }];
  const [rows, total] = await Promise.all([
    db.highlight.findMany({ where, orderBy, take: LIST_PAGE, skip: (page - 1) * LIST_PAGE, select: explorerHighlightSelect }),
    db.highlight.count({ where }),
  ]);
  if (key.kind === "theme") {
    // Theme order is the order highlights were added.
    const pos = await db.themeHighlight.findMany({ where: { themeId: key.id }, select: { highlightId: true, position: true, createdAt: true } });
    const rank = new Map(pos.map((p) => [p.highlightId, p.position * 1e13 + p.createdAt.getTime()]));
    rows.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }
  return { rows, total };
}

export async function countVisible(user: User, q = "") {
  return db.highlight.count({ where: visibleHighlights(user, await keywordMatchIds(q)) });
}

export async function getTheme(id: string) {
  return db.theme.findUnique({ where: { id }, include: { createdBy: { select: { id: true, name: true, email: true } }, parent: { select: { id: true, title: true } }, _count: { select: { highlights: true, children: true } } } });
}

/** Flat list for pickers. */
export async function listThemes() {
  return db.theme.findMany({ orderBy: [{ title: "asc" }], select: { id: true, title: true, parentId: true } });
}

/** A highlight with the segments around it, for the detail pane. */
export async function highlightContext(user: User, id: string) {
  const h = await db.highlight.findFirst({ where: { id, source: { project: visibleProjectsWhere(user) } }, select: { ...explorerHighlightSelect, endSegment: { select: { order: true } } } });
  if (!h) return null;
  const from = Math.max(0, h.startSegment.order - 2);
  const to = h.endSegment.order + 2;
  const segments = await db.segment.findMany({ where: { sourceId: h.source.id, order: { gte: from, lte: to } }, orderBy: { order: "asc" }, select: { id: true, order: true, speaker: true, startMs: true, text: true } });
  return { highlight: h, segments };
}

export type HighlightContext = NonNullable<Awaited<ReturnType<typeof highlightContext>>>;
