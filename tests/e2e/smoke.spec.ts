import { expect, test } from '@playwright/test';

/**
 * The anonymous path on both phone viewports: landing → login. Assertions are
 * about layout rules, not wording — copy changes, a 40px tap target is a bug.
 */

test('landing renders and leads to login', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('devopsdojo');

  const start = page.getByRole('link', { name: /start/i });
  await expect(start).toBeVisible();

  // §13: nothing tappable is smaller than 44px.
  const box = await start.boundingBox();
  expect(box, 'the call to action should have a layout box').not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  await start.click();
  await expect(page).toHaveURL(/\/login$/);
});

test('login offers both providers and no password field', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: /github/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /google/i })).toBeVisible();

  // OAuth-only by design (ADR 002). A password input appearing here would mean
  // someone reintroduced credential auth.
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('no horizontal scroll on either viewport', async ({ page }) => {
  for (const path of ['/', '/login']) {
    await page.goto(path);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflows, `${path} should not scroll sideways`).toBe(false);
  }
});

test('the CSP lets the login form reach the providers', async ({ page }) => {
  // Regression: with `form-action 'self'` the browser silently dropped the 303 to
  // the provider, so the button did nothing and no log showed a failure.
  const response = await page.goto('/login');
  const csp = response?.headers()['content-security-policy'] ?? '';
  const formAction = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith('form-action'));

  expect(formAction, 'the login page should send a form-action directive').toBeTruthy();
  expect(formAction).toContain('https://github.com');
  expect(formAction).toContain('https://accounts.google.com');
});

test('pressing the GitHub button starts the OAuth redirect', async ({ page }) => {
  // CSP is enforced before the request leaves the browser, so a blocked
  // submission never produces this request at all.
  await page.goto('/login');
  const authorize = page.waitForRequest(
    (req) => req.url().startsWith('https://github.com/login/oauth/authorize'),
    { timeout: 15_000 },
  );
  await page.getByRole('button', { name: /github/i }).click();

  const url = (await authorize).url();
  expect(url).toContain('state=');
  expect(url).toContain('code_challenge=');
});

test('the login form works without JavaScript', async ({ browser }) => {
  // The critical flows are form actions precisely so they survive a failed or
  // slow bundle (ADR 001). If this breaks, login is JS-dependent again.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/login');

  const form = page.locator('form[method="POST"]');
  await expect(form).toHaveCount(1);
  await expect(form.locator('button[name="provider"][value="github"]')).toHaveCount(1);

  await context.close();
});
