import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
      },
    },
  ],
  webServer:
    process.env.PLAYWRIGHT_EXTERNAL_SERVER === "true"
      ? undefined
      : {
          command:
            "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
          url: "http://localhost:3100",
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
          env: {
            AUTH_ENABLED: "false",
            DATA_DIR: "../../work/e2e-data",
            NEXTAUTH_URL: "http://localhost:3100",
          },
        },
});
