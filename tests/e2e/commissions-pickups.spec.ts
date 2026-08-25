import { expect, test, type Page, type Route } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function loginCompany(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('alice.admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');
}

async function navigate(page: Page, label: RegExp) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: label }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: label }).click();
  }
}

function installCompanyBaseRoutes(page: Page, handler: (route: Route, url: URL) => Promise<boolean>) {
  return page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (await handler(route, url)) return;
    if (url.pathname === '/api/delivery/auth/login') {
      await json(route, { message: 'OK', token: 'company-feature-token', userId: 7, role: 'ADMIN_COMPANY', firstName: 'Alice', lastName: 'Admin', username: 'alice.admin' });
      return;
    }
    if (url.pathname === '/api/delivery/users/me/company') {
      await json(route, { id: 17, name: 'Express Delivery', phone: '+237690000000', companyUrl: 'express-delivery', country: { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' }, city: 'Douala', paymentCollectionMode: 'PLATFORM', approved: true, exploitable: true, adminId: 7, adminUsername: 'alice.admin' });
      return;
    }
    if (url.pathname === '/api/delivery/billing/companies/17/dashboard') {
      await json(route, { companyId: 17, companyName: 'Express Delivery', operationalSubscriptionReady: true, quotaBlocked: false, activeSubscription: { id: 1, companyId: 17, planId: 2, planTitle: 'Pro', billingCycle: 'MONTHLY', amountXaf: 25000, status: 'ACTIVE', autoRenew: true, features: ['SHIPMENT_SENDING', 'PARCEL_PICKUP'], shipmentScope: 'BOTH', monthlyShipmentLimit: null, unlimitedShipments: true }, currentUsage: { usedShipments: 0, remainingShipments: null, usagePercentage: null, nationalShipments: 0, internationalShipments: 0, monthlyShipmentLimit: null, unlimitedShipments: true, quotaReached: false, shipmentScope: 'BOTH', shipmentSendingEnabled: true, parcelPickupEnabled: true }, availablePlans: [], recentInvoices: [] });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json(route, { unreadCount: 0 });
      return;
    }
    await json(route, {});
  });
}

test('company declares a commission batch without marking it paid', async ({ page }) => {
  let batchPayload: { commissionIds?: number[]; note?: string } | null = null;
  await installCompanyBaseRoutes(page, async (route, url) => {
    if (url.pathname === '/api/delivery/companies/17/commissions/dashboard') {
      await json(route, { companyId: 17, periodStart: '2026-08-01', periodEnd: '2026-08-31', toPayAmount: 1500, toPayCount: 2, awaitingConfirmationAmount: 400, awaitingConfirmationCount: 1, paidAmount: 9000, paidCount: 9, collectorAmount: 6000, collectorCount: 5, transporterAmount: 4900, transporterCount: 7, currency: 'XAF' });
      return true;
    }
    if (url.pathname === '/api/delivery/companies/17/commissions') {
      await json(route, { content: [
        { id: 101, reference: 'COM-101', companyId: 17, shipmentId: 801, shipmentReference: 'SHP-801', beneficiaryId: 42, beneficiaryFullName: 'Pierre Van', beneficiaryType: 'TRANSPORTER', baseAmount: 12000, percentageSnapshot: 7.5, amount: 900, currency: 'XAF', sourceLabel: 'Validation destination', status: 'ACCRUED', accruedAt: '2026-08-14T09:42:18' },
        { id: 102, reference: 'COM-102', companyId: 17, shipmentId: 802, shipmentReference: 'SHP-802', beneficiaryId: 42, beneficiaryFullName: 'Pierre Van', beneficiaryType: 'TRANSPORTER', baseAmount: 8000, percentageSnapshot: 7.5, amount: 600, currency: 'XAF', sourceLabel: 'Validation destination', status: 'PAYMENT_DISPUTED', accruedAt: '2026-08-15T09:42:18' },
      ], totalPages: 1, totalElements: 2, number: 0, size: 20, first: true, last: true, empty: false });
      return true;
    }
    if (url.pathname === '/api/delivery/companies/17/commission-payment-batches' && route.request().method() === 'GET') {
      await json(route, { content: [], totalPages: 0, totalElements: 0, number: 0, size: 20, first: true, last: true, empty: true });
      return true;
    }
    if (url.pathname === '/api/delivery/companies/17/commission-payment-batches' && route.request().method() === 'POST') {
      batchPayload = route.request().postDataJSON();
      await json(route, { id: 9, reference: 'CBATCH-9', companyId: 17, beneficiaryId: 42, beneficiaryFullName: 'Pierre Van', totalAmount: 1500, currency: 'XAF', status: 'AWAITING_BENEFICIARY_CONFIRMATION', createdAt: '2026-08-16T10:00:00', commissions: [] });
      return true;
    }
    return false;
  });

  await loginCompany(page);
  await navigate(page, /Commissions/);
  await expect(page.getByRole('heading', { name: /Commissions/ })).toBeVisible();
  await expect(page.getByText(/Confirmation attendue|Awaiting confirmation/).first()).toBeVisible();
  const checkboxes = page.getByRole('checkbox', { name: /Déclarer le paiement|Declare payment/ });
  await checkboxes.nth(0).click();
  await checkboxes.nth(1).click();
  await page.getByRole('button', { name: /Déclarer le paiement|Declare payment/ }).last().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel(/Note/).fill('Règlement août 2026');
  await dialog.getByRole('button', { name: /Déclarer le paiement|Declare payment/ }).click();
  await expect.poll(() => batchPayload).not.toBeNull();
  const submittedBatch = batchPayload as unknown as { commissionIds: number[]; note: string };
  expect(submittedBatch.commissionIds).toEqual([101, 102]);
  expect(submittedBatch.note).toBe('Règlement août 2026');
  await expect(page.getByText(/confirmation du bénéficiaire|beneficiary confirmation/i)).toBeVisible();
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await expect(page.locator('table:visible')).toHaveCount(0);
    expect(await page.locator('main').evaluate((element) => element.scrollWidth > element.clientWidth + 1)).toBe(false);
  }
});

test('company pickup view trusts server capacity and accepts a proposal', async ({ page }) => {
  let decisionPayload: { messageId?: number } | null = null;
  let servedCityLoads = 0;
  await installCompanyBaseRoutes(page, async (route, url) => {
    if (url.pathname === '/api/delivery/pickups/negotiation-messages') { await json(route, [{ id: 23, intervenant: 'COMPANY', language: 'FR', text: 'Montant confirmé.', active: true }]); return true; }
    if (url.pathname === '/api/delivery/pickups/companies/17/opportunities') {
      await json(route, { content: [{ id: 31, reference: 'PUO-31', companyId: 17, companyName: 'Express Delivery', originCityId: 1, originCity: 'Douala', destinationCityId: 2, destinationCity: 'Yaoundé', vehicleType: 'VAN', maxAvailableVolumeM3: 18.5, availableVolumeM3: 16, price: 30000, currency: 'XAF', travelDate: '2026-08-25', publicationStartsAt: '2026-08-15T08:00:00', status: 'ACTIVE', driverFullName: 'Jean Driver', driverContactVisible: false, createdAt: '2026-08-14T08:00:00' }], totalPages: 1, totalElements: 1, number: 0, size: 20, first: true, last: true, empty: false });
      return true;
    }
    if (url.pathname === '/api/delivery/pickups/companies/17/negotiations' && route.request().method() === 'GET') {
      await json(route, { content: [{ activityType: 'PARCEL_PICKUP', id: 55, reference: 'PUN-55', opportunity: { id: 31, reference: 'PUO-31', companyId: 17, companyName: 'Express Delivery', originCityId: 1, originCity: 'Douala', destinationCityId: 2, destinationCity: 'Yaoundé', vehicleType: 'VAN', maxAvailableVolumeM3: 18.5, availableVolumeM3: 16, price: 30000, currency: 'XAF', travelDate: '2026-08-25', publicationStartsAt: '2026-08-15T08:00:00', status: 'ACTIVE', driverFullName: 'Jean Driver', driverContactVisible: false, createdAt: '2026-08-14T08:00:00' }, clientId: 99, clientName: 'Client Test', parcelTypeId: 3, parcelTypeName: 'Cartons', proposalType: 'COUNTER_OFFER', requestedVolumeM3: 2.5, proposedPrice: 25000, currency: 'XAF', status: 'PENDING_COMPANY_REVIEW', actionRequiredBy: 'COMPANY', canCounterOffer: true, contactsUnlocked: false, trackingHistory: [], createdAt: '2026-08-16T08:00:00' }], totalPages: 1, totalElements: 1, number: 0, size: 20, first: true, last: true, empty: false });
      return true;
    }
    if (url.pathname === '/api/delivery/pickups/companies/17/negotiations/55/accept') {
      decisionPayload = route.request().postDataJSON();
      await json(route, { id: 55, reference: 'PUN-55', status: 'AWAITING_DEPOSIT_PAYMENT', agreedPrice: 25000, depositAmount: 6250, remainingAmount: 18750, contactsUnlocked: false });
      return true;
    }
    if (url.pathname === '/api/countries/operational-served') {
      await json(route, [{ countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' }]);
      return true;
    }
    if (url.pathname === '/api/cities/countries/1/operational-served') {
      servedCityLoads += 1;
      await json(route, [
        { cityId: 1, cityName: 'Douala', countryId: 1, countryName: 'Cameroun' },
        { cityId: 2, cityName: 'Yaoundé', countryId: 1, countryName: 'Cameroun' },
      ]);
      return true;
    }
    if (url.pathname === '/api/delivery/companies/17/employees') { await json(route, []); return true; }
    return false;
  });

  await loginCompany(page);
  await navigate(page, /Ramassages|Pickups/);
  await expect(page.getByRole('heading', { name: /Ramassages|Pickups/ })).toBeVisible();
  await expect.poll(() => servedCityLoads).toBe(1);
  await page.getByRole('button', { name: /Publier un trajet|Publish a trip/ }).click();
  const opportunityDialog = page.getByRole('dialog');
  await opportunityDialog.getByRole('combobox', { name: /Ville de départ|Origin city/ }).click();
  await page.getByPlaceholder(/Rechercher une ville|Search for a city/).filter({ visible: true }).fill('dou');
  await page.getByRole('option', { name: /Douala/ }).click();
  await expect(
    opportunityDialog.getByRole('combobox', { name: /Ville de départ|Origin city/ }),
  ).toContainText('Douala');
  await opportunityDialog.getByRole('combobox', { name: /Ville d’arrivée|Destination city/ }).click();
  await page.getByPlaceholder(/Rechercher une ville|Search for a city/).filter({ visible: true }).fill('yaou');
  await page.getByRole('option', { name: /Yaoundé/ }).click();
  await opportunityDialog.getByRole('button', { name: /Annuler|Cancel/ }).click();
  await expect(page.getByText('16 / 18.5 m³')).toBeVisible();
  await page.getByRole('tab', { name: /Propositions|Proposals/ }).click();
  await page.getByRole('button', { name: /Accepter|Accept/ }).click();
  const dialog = page.getByRole('dialog');  await dialog.getByRole('button', { name: /Accepter|Accept/ }).click();
  await expect.poll(() => decisionPayload).not.toBeNull();
  const submittedDecision = decisionPayload as unknown as { messageId?: number };
  expect(submittedDecision).toEqual({});
  await expect(page.getByText(/acompte du client|client deposit/i)).toBeVisible();
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    expect(await page.locator('main').evaluate((element) => element.scrollWidth > element.clientWidth + 1)).toBe(false);
  }
});
