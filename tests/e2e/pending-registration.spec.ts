import { expect, test } from '@playwright/test';

test('shows a visible result when checking a pending registration', async ({ page }) => {
  await page.goto('/pending');

  await expect(page.getByRole('heading', { name: /Demande en cours d'examen|Account approval in progress/i })).toBeVisible();
  await expect(page.getByText(/Examen en cours|Review in progress/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Retour à la connexion|Back to sign in/i })).toBeVisible();
});
