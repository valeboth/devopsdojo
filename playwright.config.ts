import { defineConfig, devices } from '@playwright/test';

// Mobile-first is law (PROMPT §13): every critical flow runs on both phone
// viewports. There is no desktop project — desktop is "it works there too".
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Miniflare backs D1 with one SQLite file; concurrent workers kill workerd on
  // startup with SQLITE_BUSY. Fails at 4 and 7, clean at 1.
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'iphone-se',
      use: { ...devices['iPhone SE'], viewport: { width: 375, height: 667 } },
    },
    {
      name: 'iphone-14',
      use: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    // prepare.mjs writes a throwaway .dev.vars and applies the migrations; both
    // must happen before the server reads them, hence the same command.
    command: 'node tests/e2e/prepare.mjs && npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
