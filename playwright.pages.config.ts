import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/pages",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    baseURL: "http://localhost:3102/GraphLive/",
  },
  webServer: {
    command: "node scripts/serve-pages.mjs",
    url: "http://localhost:3102/GraphLive/",
    reuseExistingServer: !process.env.CI,
  },
});
