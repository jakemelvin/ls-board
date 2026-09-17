import { expect, test, type Page, type Route } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

async function loginCompany(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('alice.admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');
}

async function navigateToPickups(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Ramassages|Pickups/ }).click();
    return;
  }
  await page.locator('aside').getByRole('button', { name: /Ramassages|Pickups/ }).click();
}

test('company loads the complete pickup negotiation before displaying PUN details', async ({ page }) => {
  let detailRequests = 0;

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/delivery/auth/login') return json(route, { message: 'OK', token: 'company-feature-token', userId: 7, role: 'ADMIN_COMPANY', firstName: 'Alice', lastName: 'Admin', username: 'alice.admin' });
    if (url.pathname === '/api/delivery/users/me/company') return json(route, { id: 17, name: 'Express Delivery', phone: '+237690000000', companyUrl: 'express-delivery', country: { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' }, city: 'Douala', paymentCollectionMode: 'PLATFORM', approved: true, exploitable: true, adminId: 7, adminUsername: 'alice.admin' });
    if (url.pathname === '/api/delivery/billing/companies/17/dashboard') return json(route, { companyId: 17, companyName: 'Express Delivery', operationalSubscriptionReady: true, quotaBlocked: false, activeSubscription: { id: 1, companyId: 17, planId: 2, planTitle: 'Pro', billingCycle: 'MONTHLY', amountXaf: 25000, status: 'ACTIVE', autoRenew: true, features: ['PARCEL_PICKUP'], shipmentScope: 'BOTH', unlimitedShipments: true }, currentUsage: { usedShipments: 0, remainingShipments: null, usagePercentage: null, nationalShipments: 0, internationalShipments: 0, unlimitedShipments: true, quotaReached: false, shipmentScope: 'BOTH', shipmentSendingEnabled: true, parcelPickupEnabled: true }, availablePlans: [], recentInvoices: [] });
    if (url.pathname === '/api/delivery/notifications/unread-count') return json(route, { unreadCount: 0 });
    if (url.pathname === '/api/delivery/pickups/companies/17/opportunities') return json(route, { content: [], totalPages: 0, totalElements: 0, number: 0, size: 20, first: true, last: true, empty: true });
    if (url.pathname === '/api/delivery/pickups/companies/17/negotiations') return json(route, { content: [{ activityType: 'PARCEL_PICKUP', id: 740638, reference: 'PUN-74d638f-4e3f-4f2e-9a1c-b0a984846fe4', opportunity: { id: 31, originCity: 'Douala', destinationCity: 'Yaoundé', travelDate: '2026-09-25' }, clientId: 99, clientName: 'Kevin Ghomfo', parcelTypeId: 3, parcelTypeName: 'Électronique', proposalType: 'CLIENT_OFFER', requestedVolumeM3: 2, proposedPrice: 100, currency: 'XAF', status: 'PENDING_COMPANY_REVIEW', actionRequiredBy: 'COMPANY', canCounterOffer: true, contactsUnlocked: true, trackingHistory: [], createdAt: '2026-09-16T08:00:00' }], totalPages: 1, totalElements: 1, number: 0, size: 20, first: true, last: true, empty: false });
    if (url.pathname === '/api/delivery/pickups/negotiations/740638') {
      detailRequests += 1;
      return json(route, { activityType: 'PARCEL_PICKUP', id: 740638, reference: 'PUN-74d638f-4e3f-4f2e-9a1c-b0a984846fe4', opportunity: { id: 31, companyName: 'Express Delivery', originCity: 'Douala', destinationCity: 'Yaoundé', travelDate: '2026-09-25' }, clientId: 99, clientName: 'Kevin Ghomfo', parcelTypeId: 3, parcelTypeName: 'Électronique', proposalType: 'CLIENT_OFFER', requestedVolumeM3: 2, proposedPrice: 100, agreedPrice: 100, depositPercentage: 25, depositAmount: 25, remainingAmount: 75, currency: 'XAF', status: 'PENDING_COMPANY_REVIEW', actionRequiredBy: 'COMPANY', canCounterOffer: true, contactsUnlocked: true, clientWhatsapp: '+237690000001', driverWhatsapp: '+237690000002', companyPhone: '+237690000003', offers: [{ id: 1, offeredBy: 'COMPANY', offerType: 'COUNTER_OFFER', amount: 100, sequenceNumber: 1, accepted: false }], trackingHistory: [{ id: 1, action: 'PROPOSAL_CREATED', createdAt: '2026-09-16T08:00:00' }, { id: 2, action: 'NEW_SERVER_ACTION', createdAt: '2026-09-16T09:00:00' }, { id: 3, createdAt: '2026-09-16T10:00:00' }], createdAt: '2026-09-16T08:00:00' });
    }
    if (url.pathname === '/api/delivery/pickups/negotiation-messages' || url.pathname === '/api/delivery/companies/17/employees') return json(route, []);
    if (url.pathname === '/api/countries/operational-served') return json(route, []);
    return json(route, {});
  });

  await loginCompany(page);
  await navigateToPickups(page);
  await page.getByRole('tab', { name: /Propositions|Proposals/ }).click();
  await expect(page.getByText('PUN-74d638f-4e3f-4f2e-9a1c-b0a984846fe4')).toBeVisible();
  await page.getByRole('button', { name: /Détails|Details/ }).click();

  await expect.poll(() => detailRequests).toBe(1);
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Express Delivery');
  await expect(dialog).toContainText('+237690000003');
  await expect(dialog).toContainText('Douala → Yaoundé');
  await expect(dialog).toContainText('100');
  await expect(dialog).toContainText('NEW_SERVER_ACTION');
  await expect(dialog).toContainText(/Action de suivi inconnue|Unknown tracking action/);
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    expect(await page.locator('main').evaluate((element) => element.scrollWidth > element.clientWidth + 1)).toBe(false);
  }
});
