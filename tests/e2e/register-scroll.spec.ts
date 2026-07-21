import { expect, test } from '@playwright/test';

test('the registration form scrolls with the mouse wheel', async ({ page }) => {
  await page.setViewportSize({ width: 842, height: 867 });
  await page.goto('/register');

  const scrollArea = page.locator('main');
  await expect(scrollArea).toHaveCSS('overflow-y', 'auto');

  const initialScrollTop = await scrollArea.evaluate((element) => element.scrollTop);
  await page.mouse.move(420, 430);
  await page.mouse.wheel(0, 500);

  await expect
    .poll(() => scrollArea.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(initialScrollTop);
  await expect(page.locator('form button[type="submit"]')).toBeInViewport();
});

test('phone fields request the telephone keyboard', async ({ page }) => {
  await page.goto('/register');

  const companyPhone = page.locator('#comp-phone');
  await expect(companyPhone).toHaveAttribute('type', 'tel');
  await expect(companyPhone).toHaveAttribute('inputmode', 'tel');
  await expect(companyPhone).toHaveAttribute('autocomplete', 'tel');
});
