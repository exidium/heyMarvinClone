import { expect, test } from "@playwright/test";

/**
 * Real sessions. The dev server must run with AUTH_DISABLED=false; the spec is skipped otherwise:
 *   AUTH_E2E=1 pnpm exec playwright test tests/e2e/auth.spec.ts
 */
test.skip(process.env.AUTH_E2E !== "1", "set AUTH_E2E=1 and AUTH_DISABLED=false to run");

test("signed-out users are sent to /login; wrong password is rejected; login and logout work", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill("editor@local");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form p[role=alert]")).toHaveText(/Wrong email or password/);

  await page.getByLabel("Password").fill("password12");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/projects$/);
  await expect(page.getByText("Dev Editor")).toBeVisible();
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0); // not an admin

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login$/);
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/login$/);
});

test("admin sees the users page; direct action calls are refused when signed out", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@local");
  await page.getByLabel("Password").fill("password12");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/projects$/);
  await page.getByRole("link", { name: "Users" }).click();
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
  await expect(page.getByText("admin@local")).toBeVisible();
  // An anonymous request to an upload route is refused.
  const res = await request.put("/api/upload/anything/transcript", { headers: { "x-filename": "a.vtt" }, data: "WEBVTT" });
  expect(res.status()).toBe(401);
});
