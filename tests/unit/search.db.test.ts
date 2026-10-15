/**
 * Runs the raw full-text search SQL against the seeded local database for every filter.
 * Skipped when DATABASE_URL is not set. Needs `pnpm db:seed` to have run.
 */
import "dotenv/config";
import { beforeAll, describe, expect, it } from "vitest";
import { EMPTY_FILTERS, type SearchFilters } from "@/lib/validation/search";

const hasDb = !!process.env.DATABASE_URL;
const d = describe.skipIf(!hasDb);

d("search SQL against the seeded database", async () => {
  const { db } = await import("@/lib/db");
  const { searchHighlights, searchSegments } = await import("@/server/queries/search");
  let admin: Awaited<ReturnType<typeof db.user.findUniqueOrThrow>>;
  let viewer: typeof admin;
  let tagId: string;
  let tagId2: string;
  let restrictedId: string;
  let company: string;
  const f = (patch: Partial<SearchFilters>): SearchFilters => ({ ...EMPTY_FILTERS, ...patch });

  beforeAll(async () => {
    admin = await db.user.findUniqueOrThrow({ where: { email: "admin@local" } });
    viewer = await db.user.findUniqueOrThrow({ where: { email: "viewer@local" } });
    const tags = await db.highlightTag.groupBy({ by: ["tagId"], _count: { _all: true }, orderBy: { _count: { tagId: "desc" } }, take: 2 });
    [tagId, tagId2] = tags.map((t) => t.tagId);
    restrictedId = (await db.project.findFirstOrThrow({ where: { access: "RESTRICTED" } })).id;
    company = (await db.participant.findFirstOrThrow({ where: { company: { not: null }, sources: { some: {} } } })).company!;
  });

  it("keyword search ranks and snippets highlights", async () => {
    const r = await searchHighlights(admin, f({ q: "spreadsheet" }));
    expect(r.total).toBeGreaterThan(0);
    expect(r.hits[0].snippet).toContain("⟦");
    expect(r.hits[0].rank).toBeGreaterThan(0);
    expect(r.hits.every((h) => /spreadsheet/i.test(h.text))).toBe(true);
  });

  it("keyword search over transcript lines works too", async () => {
    const r = await searchSegments(admin, f({ q: "spreadsheet", scope: "transcript" }));
    expect(r.total).toBeGreaterThan(0);
    expect(r.hits[0].snippet).toContain("⟦");
  });

  it("phrase and negation syntax reach websearch_to_tsquery", async () => {
    const all = await searchHighlights(admin, f({ q: "data sheet" }));
    const phrase = await searchHighlights(admin, f({ q: '"data sheet"' }));
    const neg = await searchHighlights(admin, f({ q: "data -sheet" }));
    expect(phrase.total).toBeLessThanOrEqual(all.total);
    expect(neg.hits.every((h) => !/sheet/i.test(h.text))).toBe(true);
  });

  it("tag ANY is a superset of tag ALL", async () => {
    const any = await searchHighlights(admin, f({ tagIds: [tagId, tagId2], tagMode: "any" }));
    const all = await searchHighlights(admin, f({ tagIds: [tagId, tagId2], tagMode: "all" }));
    expect(any.total).toBeGreaterThan(0);
    expect(all.total).toBeLessThanOrEqual(any.total);
    expect(any.hits.every((h) => h.tags.some((t) => t.id === tagId || t.id === tagId2))).toBe(true);
  });

  it("project, product area, date and participant filters all execute and narrow", async () => {
    const base = await searchHighlights(admin, f({ tagIds: [tagId] }));
    const byProject = await searchHighlights(admin, f({ tagIds: [tagId], projectIds: [restrictedId] }));
    expect(byProject.hits.every((h) => h.projectId === restrictedId)).toBe(true);
    const byArea = await searchHighlights(admin, f({ productAreas: ["RF"] }));
    expect(byArea.hits.every((h) => h.productArea === "RF")).toBe(true);
    const byDate = await searchHighlights(admin, f({ dateFrom: "2026-01-01", dateTo: "2026-06-30" }));
    expect(byDate.hits.every((h) => h.sourceDate && h.sourceDate >= new Date("2026-01-01") && h.sourceDate < new Date("2026-07-01"))).toBe(true);
    const byCompany = await searchHighlights(admin, f({ companies: [company] }));
    expect(byCompany.total).toBeGreaterThan(0);
    expect(byCompany.total).toBeLessThanOrEqual((await searchHighlights(admin, f({ q: "" , projectIds: [] }))).total || Infinity);
    void base;
  });

  it("tag filter on transcript lines keeps only lines covered by a tagged highlight", async () => {
    const r = await searchSegments(admin, f({ scope: "transcript", tagIds: [tagId] }));
    expect(r.total).toBeGreaterThan(0);
  });

  it("viewers never see restricted projects", async () => {
    const a = await searchHighlights(admin, f({ projectIds: [restrictedId] }));
    const v = await searchHighlights(viewer, f({ projectIds: [restrictedId] }));
    expect(a.total).toBeGreaterThan(0);
    expect(v.total).toBe(0);
    const vAll = await searchHighlights(viewer, f({ q: "the" }));
    expect(vAll.hits.every((h) => h.projectId !== restrictedId)).toBe(true);
  });

  it("paginates", async () => {
    const p1 = await searchHighlights(admin, f({ q: "the", page: 1 }));
    const p2 = await searchHighlights(admin, f({ q: "the", page: 2 }));
    if (p1.total > 25) {
      expect(p2.hits.length).toBeGreaterThan(0);
      expect(new Set([...p1.hits, ...p2.hits].map((h) => h.id)).size).toBe(p1.hits.length + p2.hits.length);
    }
  });
});
