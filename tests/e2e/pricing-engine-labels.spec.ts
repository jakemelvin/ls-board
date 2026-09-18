import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';
const COMPANY_ID = 42;

test.use({ locale: 'fr-FR' });

test('pricing engine shows user-facing labels and saves a grid', async ({ page }) => {
  let savedPayload: unknown = null;

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK',
        token: 'pricing-test-token',
        userId: 2,
        role: 'ADMIN_COMPANY',
        firstName: 'Alice',
        lastName: 'Admin',
        username: 'alice.admin',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/delivery/users/me/company') {
      await json({
        id: COMPANY_ID,
        name: 'TransCam',
        phone: '690000000',
        companyUrl: 'https://transcam.example',
        country: { code: 'CM', name: 'Cameroun', callingCode: '+237', currency: 'XAF' },
        city: 'Douala',
        paymentCollectionMode: 'COMPANY_PREPAID',
        approved: true,
        exploitable: true,
        adminId: 2,
        adminUsername: 'alice.admin',
      });
      return;
    }
    if (url.pathname.startsWith('/api/delivery/companies/42/dashboard')) {
      await json({ companyId: COMPANY_ID, companyName: 'TransCam' });
      return;
    }
    if (url.pathname === `/api/delivery/companies/${COMPANY_ID}/operational-readiness`) {
      await json({ exploitable: true, checkedAt: '2026-09-01T10:00:00', missingItems: [] });
      return;
    }
    if (url.pathname === `/api/delivery/companies/${COMPANY_ID}/transport-modes`) {
      await json({
        companyId: COMPANY_ID,
        transportModeCount: 1,
        transportModes: [{ id: 3, name: 'Air' }],
      });
      return;
    }
    if (url.pathname === `/api/delivery/companies/${COMPANY_ID}/parcel-types`) {
      await json({
        companyId: COMPANY_ID,
        companyName: 'TransCam',
        parcelTypeCount: 2,
        parcelTypes: [
          { id: 11, name: 'Enveloppe' },
          { id: 12, name: 'Textile' },
        ],
      });
      return;
    }
    if (url.pathname === `/api/delivery/companies/${COMPANY_ID}/collection-points`) {
      await json([
        { id: 7, name: 'Point 1' },
        { id: 9, name: 'Point 2' },
      ]);
      return;
    }
    if (url.pathname === `/api/delivery/companies/${COMPANY_ID}/pricing`) {
      await json([]);
      return;
    }
    if (
      url.pathname ===
      `/api/delivery/companies/${COMPANY_ID}/pricing/3/requirements`
    ) {
      await json({
        companyId: COMPANY_ID,
        transportModeId: 3,
        transportModeName: 'Air',
        selectedCriteria: ['FIXED'],
        availableRoutes: [{ originCollectionPointId: 7, destinationCollectionPointId: 9, originCollectionPointName: 'Point 1', destinationCollectionPointName: 'Point 2' }],
        availableParcelTypes: [{ id: 11, name: 'Enveloppe' }],
        fixedPriceRequired: false,
        weightRulesRequired: false,
        volumeRulesRequired: false,
        weightApplicationModeRequired: false,
        volumeApplicationModeRequired: false,
        defaultInsurancePrice: 0,
      });
      return;
    }
    if (method === 'PUT' && url.pathname === `/api/delivery/companies/${COMPANY_ID}/pricing/3`) {
      savedPayload = request.postDataJSON();
      await json({
        id: 99,
        transportModeId: 3,
        originCollectionPointId: 7,
        destinationCollectionPointId: 9,
        parcelTypeId: 11,
        selectedCriteria: ['FIXED'],
        fixedPrice: 1500,
        expressSurcharge: 0,
        weightRules: [],
        volumeRules: [],
        insurancePrice: 0,
      });
      return;
    }

    await json({});
  });

  await page.goto('/login');
  await page.locator('#username').fill('alice.admin');
  await page.locator('#password').fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  if (isMobile) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Moteur de tarification|Pricing engine/ }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Moteur de tarification|Pricing engine/ }).click();
  }

  await expect(page.getByRole('heading', { name: /Moteur de tarification|Pricing engine/ })).toBeVisible();

  // The screen must show user-facing labels, never dev jargon.
  await expect(page.getByText('Configuration requise')).toBeVisible();
  await expect(page.getByText('Configurations enregistrées')).toBeVisible();
  await expect(page.getByText(/backend/i)).toHaveCount(0);
  await expect(page.getByText(/fourni par l'API/i)).toHaveCount(0);

  // Full walkthrough: pick the combination and save.
  await page.getByRole('button', { name: 'Point 1 -> Point 2' }).click();
  await page.getByRole('button', { name: 'Prix fixe' }).first().click();
  // The fixed-price field is the last number input of the form (no weight/volume section in this scenario).
  await page.locator('input[type="number"]').last().fill('1500');
  await page.getByRole('button', { name: /Enregistrer/ }).click();

  await expect.poll(() => savedPayload).toBeTruthy();
  expect(savedPayload).toMatchObject({
    originCollectionPointId: 7,
    destinationCollectionPointId: 9,
    parcelTypeId: 11,
    selectedCriteria: ['FIXED'],
    fixedPrice: 1500,
  });
  await expect(page.getByText('Tarification enregistrée')).toBeVisible();
});
