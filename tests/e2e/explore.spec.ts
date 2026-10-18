import { expect, test } from "@playwright/test";
import { withDb } from "./db";

/** The explorer: pivots, tree selection, detail pane, and themes built by dragging highlights. */
const THEME = "E2E theme: spreadsheets stand in for simulators";
const SUB = "E2E sub-theme";

test.afterAll(async () => {
  await withDb(async (c) => { await c.query(`delete from "Theme" where title in ($1, $2)`, [THEME, SUB]); });
});

test("tree, list and detail pane work across pivots", async ({ page }) => {
  await page.goto("/explore");
  await page.waitForLoadState("networkidle"); // hydrated before clicking
  const total = await withDb(async (c) => (await c.query(`select count(*)::int as n from "Highlight" where status = 'ACTIVE'`)).rows[0].n);
  await expect(page.getByRole("button", { name: /All highlights/ })).toContainText(String(total));
  // Projects pivot: expand the first area, pick the first project, list narrows and detail shows context.
  const firstArea = page.locator("aside ul > li").nth(1);
  await firstArea.getByRole("button", { name: "Expand" }).click();
  const project = firstArea.locator("ul > li").first();
  const projectLabel = (await project.locator("button").nth(1).locator("span").first().textContent())!;
  const projectCount = Number(await project.locator("button").nth(1).locator("span").last().textContent());
  await project.locator("button").nth(1).click();
  await expect(page).toHaveURL(/node=project%3A|node=project:/);
  await expect(page.getByRole("heading", { level: 2, name: projectLabel })).toBeVisible();
  const cards = page.locator("ol [data-id]");
  expect(await cards.count()).toBe(Math.min(projectCount, 60));
  await cards.first().click();
  await expect(page.getByText("In context")).toBeVisible();
  await expect(page.getByText("Open transcript")).toBeVisible();
  // Keyboard moves the selection.
  const firstId = await cards.first().getAttribute("data-id");
  await page.keyboard.press("j");
  await expect(cards.nth(1)).toHaveClass(/bg-accent/);
  await expect(cards.first()).not.toHaveClass(/bg-accent/);
  expect(firstId).not.toBeNull();
  // Tags pivot renders groups; People pivot renders segments.
  await page.getByRole("button", { name: "Tags", exact: true }).click();
  await expect(page).toHaveURL(/pivot=tags/);
  await expect(page.getByRole("button", { name: /Untagged/ })).toBeVisible();
  await page.getByRole("button", { name: "People", exact: true }).click();
  await expect(page).toHaveURL(/pivot=people/);
  await expect(page.locator("aside ul > li").nth(1)).toBeVisible();
});

test("themes: create, drag a highlight in, add via picker, nest, remove, delete", async ({ page }) => {
  await page.goto("/explore?pivot=themes");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "New theme" }).click();
  await page.getByLabel("Finding").fill(THEME);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.waitForURL(/node=theme/);
  await expect(page.getByRole("heading", { name: THEME }).first()).toBeVisible();
  await expect(page.getByText("Nothing here yet.")).toBeVisible();

  // Drag a highlight from "Not in any theme" onto the theme node.
  await page.getByRole("button", { name: /Not in any theme/ }).click();
  const card = page.locator("ol [data-id]").first();
  const cardId = (await card.getAttribute("data-id"))!;
  const themeNode = page.locator("aside li").filter({ has: page.getByRole("button", { name: new RegExp(THEME) }) }).first();
  await card.dragTo(themeNode);
  await expect(page.getByText(/Added to/)).toBeVisible();
  const linked = await withDb(async (c) => (await c.query(`select count(*)::int as n from "ThemeHighlight" th join "Theme" t on t.id = th."themeId" where t.title = $1 and th."highlightId" = $2`, [THEME, cardId])).rows[0].n);
  expect(linked).toBe(1);

  // Add a second highlight through the detail pane picker.
  await page.locator("ol [data-id]").nth(1).click();
  await page.getByRole("button", { name: /Add to theme/ }).click();
  await page.getByRole("option", { name: THEME }).click();
  await expect(page.getByText(/Added to/).first()).toBeVisible();

  // Open the theme: both highlights listed, count on the node is 2.
  await page.getByRole("button", { name: new RegExp(THEME) }).first().click();
  await expect(page.locator("ol [data-id]")).toHaveCount(2);
  await expect(page.locator("aside").getByRole("button", { name: new RegExp(THEME) }).first()).toContainText("2");

  // Nest a sub-theme under it from the picker's "New theme…" path.
  await page.locator("ol [data-id]").first().click();
  await page.getByRole("button", { name: /Add to theme/ }).click();
  await page.getByRole("option", { name: "New theme…" }).click();
  await page.getByLabel("Finding").fill(SUB);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("heading", { name: SUB }).first()).toBeVisible();
  const sub = await withDb(async (c) => (await c.query(`select p.title as parent from "Theme" t join "Theme" p on p.id = t."parentId" where t.title = $1`, [SUB])).rows[0]);
  expect(sub?.parent).toBe(THEME);

  // Remove a highlight from the parent theme, then delete the parent: the sub-theme moves to top level.
  await page.getByRole("button", { name: new RegExp(THEME) }).first().click();
  await page.locator("ol [data-id]").first().click();
  await page.getByRole("button", { name: `Remove from ${THEME}` }).click();
  await expect(page.locator("ol [data-id]")).toHaveCount(1);
  await page.getByRole("button", { name: "Delete theme" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: THEME })).toHaveCount(0);
  const after = await withDb(async (c) => ({
    parentLeft: (await c.query(`select count(*)::int as n from "Theme" where title = $1`, [THEME])).rows[0].n,
    subParent: (await c.query(`select "parentId" from "Theme" where title = $1`, [SUB])).rows[0]?.parentId,
  }));
  expect(after.parentLeft).toBe(0);
  expect(after.subParent).toBeNull();
});

test("the top-bar search narrows the list and the tree counts, with the sidebar present", async ({ page }) => {
  await page.goto("/explore");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("link", { name: "Participants" })).toBeVisible();
  const before = Number(await page.getByRole("button", { name: /All highlights/ }).locator("span").last().textContent());
  await page.getByRole("searchbox", { name: "Search highlights" }).fill("spreadsheet");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=spreadsheet/);
  await expect(page.getByRole("heading", { level: 2, name: /matching “spreadsheet”/ })).toBeVisible();
  const after = Number(await page.getByRole("button", { name: /All highlights/ }).locator("span").last().textContent());
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
  const texts = await page.locator("ol [data-id] blockquote").allTextContents();
  expect(texts.every((t) => /spreadsheet/i.test(t))).toBe(true);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page).not.toHaveURL(/q=/);
});
