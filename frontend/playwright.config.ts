import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      command:
        "node -e \"require('fs').closeSync(require('fs').openSync('prisma/e2e.db','a'))\" && npx prisma generate && npx prisma db push --skip-generate && npm run dev",
      cwd: "../backend",
      url: "http://127.0.0.1:3000/api/tickets",
      env: {
        DATABASE_URL: "file:./e2e.db"
      },
      reuseExistingServer: false,
      timeout: 120000
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173",
      cwd: ".",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 120000
    }
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
