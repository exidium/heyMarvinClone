import { expect, test } from "@playwright/test";
import { withDb } from "./db";

/** Search → open the moment in the source → save the search as a view → reopen from the sidebar → delete. */
const VIEW = "E2E spreadsheet view";

test.afterAll(async () => {
  await withDb(async (c) => { await c.query(`delete from "SavedView" where name = $1`, [VIEW]); });
});

test("a keyword search leads to the highlighted moment in the transcript", async ({ page }) => {
  await page.goto("/search?q=spreadsheet");
  await expect(page.getByText(/\d+ highlights?/)).toBeVisible();
  const first = page.locator("ol li").first();
  const marked = first.locator("mark").first();
  await expect(marked).toContainText(/spreadsheet/i);
  const href = await first.locator("a").first().getAttribute("href");
  expect(href).toMatch(/\/projects\/.+\/sources\/.+\?highlight=/);
  await first.locator("a").first().click();
  await page.waitForURL(/\?highlight=/);
  const id = new URL(page.url()).searchParams.get("highlight")!;
  const mark = page.locator(`mark.hl[data-highlight-id="${id}"]`).first();
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute("data-selected", "true");
  await expect(page.locator(`[data-highlight-item="${id}"]`)).toBeVisible();
});

test("transcript-line results deep-link to the segment", async ({ page }) => {
  await page.goto("/search?q=spreadsheet&scope=transcript");
  await expect(page.getByText(/\d+ lines?/)).toBeVisible();
  await page.locator("ol li a").first().click();
  await page.waitForURL(/\?segment=/);
  const id = new URL(page.url()).searchParams.get("segment")!;
  await expect(page.locator(`.segment[data-segment-id="${id}"]`)).toHaveAttribute("data-active", "true");
});

test("filters live in the URL and can be saved as a shared view", async ({ page }) => {
  await page.goto("/search?q=spreadsheet");
  await page.getByRole("button", { name: "Product area" }).click();
  await page.getByRole("option", { name: "RF" }).click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/area=RF/);
  await page.getByRole("button", { name: "Save view" }).click();
  await page.getByLabel("Name").fill(VIEW);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL(/\/search\?.*view=/);
  await expect(page.getByRole("heading", { name: VIEW })).toBeVisible();
  await expect(page).toHaveURL(/q=spreadsheet/);
  await expect(page).toHaveURL(/area=RF/);
  // Reopen from the sidebar
  await page.goto("/projects");
  await page.getByRole("link", { name: VIEW }).click();
  await page.waitForURL(/\/search\?.*view=/);
  await expect(page.getByRole("heading", { name: VIEW })).toBeVisible();
  // Delete it
  await page.getByRole("button", { name: "Delete view" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.waitForURL(/\/search$/);
  await expect(page.getByRole("link", { name: VIEW })).toHaveCount(0);
});
