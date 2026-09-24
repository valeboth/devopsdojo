import { expect, test } from '@playwright/test';

/**
 * The anonymous path, on both phone viewports: landing → login. Everything past
 * the login screen needs real OAuth credentials, so that is where Phase 0 stops.
 *
 * These assertions are deliberately about layout rules rather than wording:
 * copy changes often, but a tap target under 44px or a page that scrolls
 * sideways at 375px is always a bug (§13).
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
