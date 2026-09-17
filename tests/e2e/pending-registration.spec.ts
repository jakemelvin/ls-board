import { expect, test } from '@playwright/test';

test('shows a visible result when checking a pending registration', async ({ page }) => {
  await page.goto('/pending');

  const checkStatus = page.getByRole('button', { name: /Vérifier le statut|Check status/ });
  await expect(checkStatus).toBeVisible();
  await checkStatus.click();

  await expect(
    page.getByRole('status').filter({ hasText: /toujours en cours d'examen|still under review/i }),
  ).toBeVisible();
});
