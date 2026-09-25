import { defineConfig, devices } from '@playwright/test';

// Mobile-first is law (PROMPT §13): every critical flow runs on both phone
// viewports. There is no desktop project — desktop is "it works there too".
export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
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
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    // preview gets a real platform.env, so Better Auth initialises and 500s on a
    // missing secret. Throwaway values; real ones from the shell win.
    env: {
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'e2e-only-not-a-real-secret',
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4173',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? 'e2e',
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? 'e2e',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? 'e2e',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? 'e2e',
    },
  },
});
