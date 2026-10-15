import { expect, test } from "@playwright/test";
import { withDb } from "./db";

/** Tag management: rename, merge (highlight count preserved, tag count minus one), archive. */
const A = "E2E Merge Source";
const B = "E2E Merge Target";
test.beforeAll(async () => {
  await withDb(async (c) => {
    await c.query(`delete from "Tag" where name in ($1, $2, $3)`, [A, B, "E2E Renamed"]);
    const a = (await c.query(`insert into "Tag" (id, name) values (gen_random_uuid()::text, $1) returning id`, [A])).rows[0].id;
    const b = (await c.query(`insert into "Tag" (id, name) values (gen_random_uuid()::text, $1) returning id`, [B])).rows[0].id;
    const hs = (await c.query(`select id from "Highlight" where status = 'ACTIVE' order by id limit 3`)).rows.map((r) => r.id);
    // h0 and h1 carry A; h1 and h2 carry B → after merging A into B, all three carry B exactly once.
    await c.query(`insert into "HighlightTag" ("highlightId", "tagId") values ($1, $3), ($2, $3), ($2, $4), ($5, $4)`, [hs[0], hs[1], a, b, hs[2]]);
  });
});

test.afterAll(async () => {
  await withDb(async (c) => { await c.query(`delete from "Tag" where name in ($1, $2, $3)`, [A, B, "E2E Renamed"]); });
});

test("admin merges one tag into another without losing highlights", async ({ page }) => {
  const tagsBefore = await withDb(async (c) => (await c.query(`select count(*)::int as n from "Tag"`)).rows[0].n);
  await page.goto("/tags");
  await page.getByRole("button", { name: `Merge ${A} into another tag` }).click();
  await page.getByLabel("Find target tag").fill("E2E Merge Target");
  await page.getByRole("option", { name: /E2E Merge Target/ }).click();
  await page.getByRole("button", { name: /^Merge into/ }).click();
  await expect(page.getByText(`Merged “${A}” into “${B}”`)).toBeVisible();
  await expect(page.getByRole("button", { name: `Merge ${A} into another tag` })).toHaveCount(0);

  const after = await withDb(async (c) => ({
    tags: (await c.query(`select count(*)::int as n from "Tag"`)).rows[0].n,
    tagged: (await c.query(`select count(*)::int as n from "HighlightTag" ht join "Tag" t on t.id = ht."tagId" where t.name = $1`, [B])).rows[0].n,
    distinct: (await c.query(`select count(distinct "highlightId")::int as n from "HighlightTag" ht join "Tag" t on t.id = ht."tagId" where t.name = $1`, [B])).rows[0].n,
    sourceLeft: (await c.query(`select count(*)::int as n from "Tag" where name = $1`, [A])).rows[0].n,
  }));
  expect(after.tags).toBe(tagsBefore - 1);
  expect(after.sourceLeft).toBe(0);
  expect(after.distinct).toBe(3);
  expect(after.tagged).toBe(3);
});

test("admin renames and archives a tag", async ({ page }) => {
  await page.goto("/tags");
  await page.getByRole("button", { name: `Rename ${B}` }).click();
  const input = page.locator('input[value="E2E Merge Target"]');
  await input.fill("E2E Renamed");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Tag renamed")).toBeVisible();
  await expect(page.getByText("E2E Renamed", { exact: true })).toBeVisible();

  await page.getByRole("listitem").filter({ hasText: "E2E Renamed" }).getByRole("button", { name: "Archive tag" }).click();
  await expect(page.getByText("Tag archived")).toBeVisible();
  const archived = await withDb(async (c) => (await c.query(`select "archivedAt" from "Tag" where name = 'E2E Renamed'`)).rows[0].archivedAt);
  expect(archived).not.toBeNull();
});
