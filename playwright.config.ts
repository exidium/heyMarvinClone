import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1, // specs share one seeded database
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", viewport: { width: 1440, height: 900 } },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: "pnpm dev --port 3000", url: "http://localhost:3000/api/health", reuseExistingServer: true, timeout: 120_000 },
});
