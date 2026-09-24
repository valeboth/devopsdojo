import { defineConfig, devices } from '@playwright/test';

// Mobile-first is law (PROMPT §13): every critical flow runs on both phone
// viewports. There is no desktop project — desktop is "it works there too".
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
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
    // adapter-cloudflare gives the preview server a real `platform.env`, so
    // Better Auth initialises on every request — and throws on a missing
    // secret, which turns every page into a 500. These are throwaway values for
    // a throwaway server: the anonymous flows never reach a provider, and the
    // D1 binding is Miniflare's local file. Real credentials, if the shell has
    // them, win.
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
