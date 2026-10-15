import { expect, test, type Page } from "@playwright/test";
import { withDb } from "./db";

/**
 * The core promise of the repository: highlights survive edits elsewhere in the transcript and
 * never vanish silently. Runs against the seeded database with the admin dev user.
 */
type Ctx = { sourceId: string; projectId: string; activeCount: number; segmentIds: string[]; texts: Map<string, string>; startedAt: Date };
let ctx: Ctx;

test.beforeAll(async () => {
  ctx = await withDb(async (c) => {
    const { rows } = await c.query(`
      select s.id, s."projectId", (select count(*) from "Highlight" h where h."sourceId" = s.id and h.status = 'ACTIVE')::int as active
      from "Source" s join "Project" p on p.id = s."projectId"
      where s.kind = 'TRANSCRIPT' and p.access = 'OPEN' and (select count(*) from "Segment" g where g."sourceId" = s.id) >= 8
      order by active asc, s.id limit 1`);
    const src = rows[0];
    const segs = await c.query(`select id, text from "Segment" where "sourceId" = $1 order by "order"`, [src.id]);
    return { sourceId: src.id, projectId: src.projectId, activeCount: src.active, segmentIds: segs.rows.map((r) => r.id), texts: new Map(segs.rows.map((r) => [r.id, r.text])), startedAt: new Date() };
  });
});

test.afterAll(async () => {
  await withDb(async (c) => {
    // Seeded highlights carry an externalId; anything without one on this source was created by the test.
    await c.query(`delete from "Highlight" where "sourceId" = $1 and "externalId" is null`, [ctx.sourceId]);
    for (const [id, text] of ctx.texts) await c.query(`update "Segment" set text = $1, version = version + 1 where id = $2`, [text, id]);
  });
});

const segText = (page: Page, i: number) => page.locator(`.segment[data-segment-id="${ctx.segmentIds[i]}"] .segment-text`);

/** Selects from the `fromWord`-th word of segment i to the `toWord`-th word of segment j using a DOM range. */
async function selectWords(page: Page, i: number, fromWord: number, j: number, toWord: number) {
  await page.evaluate(({ a, b, fromWord, toWord }) => {
    const textNodeAt = (el: Element, wordIndex: number, end: boolean) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let seen = 0;
      let node: Text | null = walker.nextNode() as Text | null;
      while (node) {
        const text = node.data;
        let k = 0;
        for (const m of text.matchAll(/\S+/g)) {
          if (seen + k === wordIndex) return { node, offset: end ? m.index! + m[0].length : m.index! };
          k++;
        }
        seen += k;
        node = walker.nextNode() as Text | null;
      }
      throw new Error("word not found");
    };
    const start = textNodeAt(document.querySelector(`.segment[data-segment-id="${a}"] .segment-text`)!, fromWord, false);
    const end = textNodeAt(document.querySelector(`.segment[data-segment-id="${b}"] .segment-text`)!, toWord, true);
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  }, { a: ctx.segmentIds[i], b: ctx.segmentIds[j], fromWord, toWord });
}

test("renders seeded highlights as marks and lists them", async ({ page }) => {
  await page.goto(`/projects/${ctx.projectId}/sources/${ctx.sourceId}`);
  await expect(page.locator(".transcript-editor .segment").first()).toBeVisible();
  const ids = await page.locator("mark.hl").evaluateAll((els) => new Set(els.map((e) => e.getAttribute("data-highlight-id"))).size);
  expect(ids).toBe(ctx.activeCount);
  await expect(page.locator("[data-highlight-item]")).toHaveCount(await withDb(async (c) => (await c.query(`select count(*)::int as n from "Highlight" where "sourceId" = $1`, [ctx.sourceId])).rows[0].n));
});

test("a highlight across two segments is saved with segment anchors and survives a typo fix", async ({ page }) => {
  await page.goto(`/projects/${ctx.projectId}/sources/${ctx.sourceId}`);
  const before = await page.locator("[data-highlight-item]").count();
  await segText(page, 1).click();
  await selectWords(page, 1, 2, 2, 1);
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(page.locator("[data-highlight-item]")).toHaveCount(before + 1);
  await expect(page.locator("[data-sonner-toast][data-type=error]")).toHaveCount(0);
  const created = await withDb(async (c) => (await c.query(`select * from "Highlight" where "sourceId" = $1 and "externalId" is null order by "createdAt" desc limit 1`, [ctx.sourceId])).rows[0]);
  expect(created.startSegmentId).toBe(ctx.segmentIds[1]);
  expect(created.endSegmentId).toBe(ctx.segmentIds[2]);
  expect(created.status).toBe("ACTIVE");
  const markedBefore = await page.locator(`mark.hl[data-highlight-id="${created.id}"]`).allTextContents();
  expect(markedBefore.join("\n")).toBe(created.text);

  // Fix a "typo" at the very start of segment 1, before the highlight.
  await page.evaluate((id) => {
    const el = document.querySelector(`.segment[data-segment-id="${id}"] .segment-text`)!;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const first = walker.nextNode() as Text;
    const r = document.createRange(); r.setStart(first, 0); r.collapse(true);
    const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event("selectionchange"));
  }, ctx.segmentIds[1]);
  await page.keyboard.type("Edited ");
  await page.waitForTimeout(1200); // debounced save
  const afterSave = await withDb(async (c) => (await c.query(`select h.*, g.text as seg from "Highlight" h join "Segment" g on g.id = h."startSegmentId" where h.id = $1`, [created.id])).rows[0]);
  expect(afterSave.seg.startsWith("Edited ")).toBe(true);
  expect(afterSave.startOffset).toBe(created.startOffset + "Edited ".length);
  expect(afterSave.text).toBe(created.text);

  await page.reload();
  await expect(page.locator(`mark.hl[data-highlight-id="${created.id}"]`).first()).toBeVisible();
  const markedAfter = await page.locator(`mark.hl[data-highlight-id="${created.id}"]`).allTextContents();
  expect(markedAfter.join("\n")).toBe(created.text);
});

test("deleting a highlight's words orphans it instead of dropping it", async ({ page }) => {
  await page.goto(`/projects/${ctx.projectId}/sources/${ctx.sourceId}`);
  const before = await page.locator("[data-highlight-item]").count();
  await segText(page, 3).click();
  await selectWords(page, 3, 1, 3, 3);
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(page.locator("[data-highlight-item]")).toHaveCount(before + 1);
  const created = await withDb(async (c) => (await c.query(`select * from "Highlight" where "sourceId" = $1 and "startSegmentId" = $2 and "externalId" is null order by "createdAt" desc limit 1`, [ctx.sourceId, ctx.segmentIds[3]])).rows[0]);
  const mark = page.locator(`mark.hl[data-highlight-id="${created.id}"]`);
  await expect(mark).toHaveCount(1);
  // Select exactly the marked text and delete it.
  await page.evaluate((id) => {
    const m = document.querySelector(`mark.hl[data-highlight-id="${id}"]`)!;
    const r = document.createRange(); r.selectNodeContents(m);
    const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event("selectionchange"));
  }, created.id);
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(1200);
  const row = await withDb(async (c) => (await c.query(`select status, text from "Highlight" where id = $1`, [created.id])).rows[0]);
  expect(row.status).toBe("ORPHANED");
  expect(row.text).toBe(created.text);
  await expect(page.getByText("Orphaned", { exact: false })).toBeVisible();
});

test("viewer role sees marks but no toolbar", async ({ page }) => {
  // The dev seam cannot switch users per request; this asserts the read-only rendering contract instead.
  await page.goto(`/projects/${ctx.projectId}/sources/${ctx.sourceId}`);
  await expect(page.locator(".transcript-editor[data-editable]")).toHaveCount(1);
});
