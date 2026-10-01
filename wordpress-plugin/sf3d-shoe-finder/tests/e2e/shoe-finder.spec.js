// تست E2E (Playwright): فوکوس، فیلتر، افزودن به سبد
// اجرا: SF3D_URL=https://your-site.test/shop-page npx playwright test
import { test, expect } from '@playwright/test';

const URL = process.env.SF3D_URL || 'http://localhost:3000/';

test.beforeEach(async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('.sf3d-island')).toBeVisible();
});

test('فوکوس با کیبورد و بستن با Escape', async ({ page }) => {
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.locator('.sf3d-card.is-open')).toBeVisible();
  await expect(page).toHaveURL(/#product-\d+/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.sf3d-card.is-open')).toHaveCount(0);
});

test('Deep link محصول را فوکوس می‌کند', async ({ page }) => {
  await page.goto(URL + '#product-101');
  await expect(page.locator('.sf3d-card.is-open .sf3d-card__title')).toBeVisible();
});

test('فیلتر چندانتخابی و ریست', async ({ page }) => {
  await page.getByRole('button', { name: /فیلتر/ }).click();
  const chip = page.locator('.sf3d-chip[aria-pressed]').first();
  await chip.click();
  await expect(page).toHaveURL(/filter=/);
  await page.getByRole('button', { name: /پاک/ }).click();
  await expect(page).not.toHaveURL(/filter=/);
});

test('افزودن به سبد (محصول متغیر)', async ({ page }) => {
  await page.goto(URL + '#product-101');
  await page.locator('.sf3d-select').first().selectOption({ index: 3 });
  await page.locator('.sf3d-swatch:not(.is-disabled)').first().click();
  const add = page.locator('.sf3d-card__add');
  await expect(add).toBeEnabled();
  await add.click();
  await expect(page.locator('.sf3d-badge')).not.toHaveClass(/is-empty/);
});
