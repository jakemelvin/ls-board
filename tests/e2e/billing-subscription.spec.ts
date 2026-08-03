import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 81,
    companyId: 42,
    companyName: 'TransCam',
    planId: 7,
    planTitle: 'National Pro',
    billingCycle: 'MONTHLY',
    amountXaf: 25000,
    status: 'PENDING_PAYMENT',
    autoRenew: true,
    features: ['SHIPMENT_SENDING', 'PARCEL_PICKUP'],
    shipmentScope: 'NATIONAL',
    monthlyShipmentLimit: 500,
    unlimitedShipments: false,
    createdAt: '2026-08-03T10:00:00',
    updatedAt: '2026-08-03T10:00:00',
    ...overrides,
  };
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 93,
    reference: 'INV-2026-TEST-93',
    companyId: 42,
    companyName: 'TransCam',
    subscriptionId: 81,
    planId: 7,
    planTitle: 'National Pro',
    billingCycle: 'MONTHLY',
    grossAmount: 25000,
    discountAmount: 0,
    netAmount: 25000,
    currency: 'XAF',
    status: 'PENDING',
    transactionStatus: 'INITIATED',
    createdAt: '2026-08-03T10:00:00',
    ...overrides,
  };
}

const plan = {
  id: 7,
  title: 'National Pro',
  description: 'Envois nationaux et ramassage.',
  monthlyAmountXaf: 25000,
  annualAmountXaf: 250000,
  monthlyPrices: { XAF: 25000, EUR: 38.11, USD: 41.35 },
  annualPrices: { XAF: 250000, EUR: 381.1, USD: 413.5 },
  features: ['SHIPMENT_SENDING', 'PARCEL_PICKUP'],
  shipmentScope: 'NATIONAL',
  monthlyShipmentLimit: 500,
  unlimitedShipments: false,
  availableInAllCountries: true,
  eligibleCountries: [],
  active: true,
};

test('company subscribes and billing only becomes active after backend confirmation', async ({ page }) => {
  test.setTimeout(60_000);
  let paid = false;
  let subscriptionCreated = false;
  let checkoutBody = '';
  let paymentBody = '';
  let dashboardLoads = 0;

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({ token: 'billing-test-token', userId: 2, role: 'ADMIN_COMPANY', username: 'alice.admin' });
      return;
    }
    if (url.pathname === '/api/delivery/users/me/company') {
      await json({
        id: 42,
        name: 'TransCam',
        phone: '690000000',
        companyUrl: 'transcam',
        country: { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' },
        city: 'Douala',
        paymentCollectionMode: 'PLATFORM',
        approved: true,
        exploitable: paid,
        adminId: 2,
        adminUsername: 'alice.admin',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/delivery/billing/companies/42/dashboard') {
      dashboardLoads += 1;
      await json({
        companyId: 42,
        companyName: 'TransCam',
        operationalSubscriptionReady: paid,
        quotaBlocked: false,
        alertTitle: paid ? null : 'Souscription requise',
        alertMessage: paid ? null : 'Choisissez un plan pour activer les envois.',
        activeSubscription: paid
          ? subscription({
              status: 'ACTIVE',
              startsAt: '2026-08-03T10:00:00',
              endsAt: '2026-09-03T10:00:00',
            })
          : null,
        currentUsage: paid
          ? {
              cycleStart: '2026-08-01',
              cycleEnd: '2026-08-31',
              usedShipments: 12,
              remainingShipments: 488,
              usagePercentage: 2.4,
              nationalShipments: 12,
              internationalShipments: 0,
              monthlyShipmentLimit: 500,
              unlimitedShipments: false,
              quotaReached: false,
              shipmentScope: 'NATIONAL',
              shipmentSendingEnabled: true,
              parcelPickupEnabled: true,
            }
          : null,
        availablePlans: [plan],
        recentInvoices: paid
          ? [invoice({ status: 'PAID', transactionStatus: 'COMPLETED' })]
          : subscriptionCreated
            ? [invoice()]
            : [],
      });
      return;
    }
    if (url.pathname === '/api/delivery/billing/companies/42/subscriptions' && request.method() === 'POST') {
      checkoutBody = request.postData() ?? '';
      subscriptionCreated = true;
      await json({ subscription: subscription(), invoice: invoice(), paymentRequired: true });
      return;
    }
    if (url.pathname === '/api/delivery/billing/subscriptions/81') {
      await json(subscription());
      return;
    }
    if (url.pathname === '/api/delivery/payments/config') {
      await json({ localCurrency: 'XAF', providers: ['MTN', 'ORANGE'] });
      return;
    }
    if (url.pathname === '/api/delivery/billing/invoices/93/payments' && request.method() === 'GET') {
      await json([]);
      return;
    }
    if (url.pathname === '/api/delivery/billing/invoices/93/payments/MTN') {
      paymentBody = request.postData() ?? '';
      await json({
        id: 501,
        reference: 'PAY-BILLING-501',
        provider: 'MTN',
        purpose: 'SUBSCRIPTION',
        status: 'PENDING',
        billingInvoiceId: 93,
        subscriptionId: 81,
        companyId: 42,
        amount: 25000,
        currency: 'XAF',
      });
      return;
    }
    if (url.pathname === '/api/delivery/payments/MTN/attempts/PAY-BILLING-501/confirm') {
      paid = true;
      await json({
        id: 501,
        reference: 'PAY-BILLING-501',
        provider: 'MTN',
        purpose: 'SUBSCRIPTION',
        status: 'SUCCEEDED',
        billingInvoiceId: 93,
        subscriptionId: 81,
        companyId: 42,
        amount: 25000,
        currency: 'XAF',
      });
      return;
    }
    if (url.pathname === '/api/delivery/payments/attempts/PAY-BILLING-501') {
      await json({
        id: 501,
        reference: 'PAY-BILLING-501',
        provider: 'MTN',
        purpose: 'SUBSCRIPTION',
        status: paid ? 'SUCCEEDED' : 'PENDING',
        amount: 25000,
        currency: 'XAF',
      });
      return;
    }

    await json({});
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('alice.admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  await expect(page.getByTestId('subscription-status-badge')).toContainText(
    /Plan inactif|Sans plan|Inactive plan|No plan/,
  );
  const statusBanner = page.getByTestId('subscription-status-banner');
  await expect(statusBanner).toBeVisible();
  await statusBanner.getByRole('button', { name: /Choisir un plan|Choose a plan/ }).click();

  await expect(page.getByRole('heading', { name: /Facturation et abonnement|Billing and subscription/ })).toBeVisible();
  await expect(page.getByText('Souscription requise')).toBeVisible();
  await page.getByRole('button', { name: /Choisir ce plan|Choose this plan/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Créer la souscription|Create subscription/ }).click();

  await expect.poll(() => checkoutBody).toContain('"planId":7');
  const paymentDialog = page.getByRole('dialog');
  await expect(paymentDialog.getByText('INV-2026-TEST-93')).toBeVisible();
  await paymentDialog.getByRole('button', { name: /Payer plus tard|Pay later/ }).click();
  await expect(paymentDialog).toHaveCount(0);
  await page.waitForTimeout(750);
  await expect(paymentDialog).toHaveCount(0);

  await page
    .getByRole('button', { name: /^(Payer|Pay)$/ })
    .filter({ visible: true })
    .click();
  await expect(paymentDialog.getByText('INV-2026-TEST-93')).toBeVisible();
  await paymentDialog.getByPlaceholder(/237/).fill('+237690123456');
  await paymentDialog.getByRole('button', { name: /Initier le paiement|Start payment/ }).click();

  await expect.poll(() => paymentBody).toContain('+237690123456');
  const parsedPaymentBody = JSON.parse(paymentBody) as { idempotencyKey: string };
  expect(parsedPaymentBody.idempotencyKey).toMatch(/^billing-42-93-/);
  await expect(paymentDialog.getByText(/Paiement en attente|Payment pending/)).toBeVisible();
  await paymentDialog.getByRole('button', { name: /Vérifier le paiement|Check payment/ }).click();

  await expect.poll(() => dashboardLoads).toBeGreaterThan(1);
  await expect(page.getByText(/Plan contractuel actuellement appliqué|Contract plan currently applied/)).toBeVisible();
  await expect(page.getByTestId('subscription-status-badge')).toContainText(
    /Plan actif|Actif|Active plan|Active/,
  );
  await expect(page.getByText(/12 \/ 500/)).toBeVisible();
  await expect(page.getByText(/Payée|Paid/, { exact: true }).filter({ visible: true })).toBeVisible();
});

test('employee sees the inactive-plan warning without subscription actions', async ({ page }) => {
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        token: 'employee-billing-test-token',
        userId: 8,
        role: 'EMPLOYEE_COMPANY',
        username: 'paul.employe',
      });
      return;
    }
    if (url.pathname === '/api/delivery/users/me/company') {
      await json({
        id: 42,
        name: 'TransCam',
        phone: '690000000',
        companyUrl: 'transcam',
        country: { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' },
        city: 'Douala',
        paymentCollectionMode: 'PLATFORM',
        approved: true,
        exploitable: false,
        adminId: 2,
        adminUsername: 'alice.admin',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/delivery/billing/companies/42/dashboard') {
      await json({
        companyId: 42,
        companyName: 'TransCam',
        operationalSubscriptionReady: false,
        quotaBlocked: false,
        alertTitle: 'Souscription requise',
        alertMessage: 'Choisissez un plan pour activer les envois.',
        activeSubscription: null,
        currentUsage: null,
        availablePlans: [plan],
        recentInvoices: [],
      });
      return;
    }

    await json({});
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('paul.employe');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();
  await expect(page).toHaveURL('/');

  await expect(page.getByTestId('subscription-status-badge')).toContainText(
    /Plan inactif|Sans plan|Inactive plan|No plan/,
  );
  const statusBanner = page.getByTestId('subscription-status-banner');
  await expect(statusBanner).toContainText(
    /Contactez votre administrateur|Contact your company administrator/,
  );
  await expect(statusBanner.getByRole('button')).toHaveCount(0);

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Facturation|Billing/ }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Facturation|Billing/ }).click();
  }

  await expect(
    page.getByRole('heading', { name: /Facturation et abonnement|Billing and subscription/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/administrateur de l’entreprise|company administrator must activate/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Choisir ce plan|Choose this plan/ })).toHaveCount(0);
});

test('super admin can create a subscription plan from platform finance', async ({ page }) => {
  let createdPlanBody = '';

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({ token: 'super-admin-billing-token', userId: 3, role: 'SUPER_ADMIN', username: 'admin' });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (['/api/delivery/shipment-fees', '/api/delivery/promo-codes', '/api/delivery/payment-modes', '/api/delivery/billing/plans'].includes(url.pathname) && request.method() === 'GET') {
      await json([]);
      return;
    }
    if (url.pathname === '/api/countries') {
      await json([{ countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' }]);
      return;
    }
    if (url.pathname === '/api/delivery/companies' && request.method() === 'GET') {
      await json({
        content: [{
          id: 42,
          name: 'TransCam',
          phone: '690000000',
          companyUrl: 'transcam',
          country: { countryId: 1, countryName: 'Cameroun', countryCode: 237, isoCode: 'CM' },
          city: 'Douala',
          paymentCollectionMode: 'PLATFORM',
          approved: true,
          exploitable: false,
          adminId: 2,
          adminUsername: 'alice.admin',
        }],
        totalPages: 1,
        totalElements: 1,
        number: 0,
        size: 100,
        first: true,
        last: true,
        empty: false,
      });
      return;
    }
    if (url.pathname === '/api/delivery/billing/companies/42/dashboard') {
      await json({
        companyId: 42,
        companyName: 'TransCam',
        operationalSubscriptionReady: false,
        quotaBlocked: false,
        activeSubscription: null,
        currentUsage: null,
        availablePlans: [plan],
        recentInvoices: [],
      });
      return;
    }
    if (url.pathname === '/api/delivery/billing/plans' && request.method() === 'POST') {
      createdPlanBody = request.postData() ?? '';
      const body = JSON.parse(createdPlanBody);
      await json({ id: 9, ...body, active: true, monthlyPrices: { XAF: body.monthlyAmountXaf }, annualPrices: { XAF: body.annualAmountXaf }, eligibleCountries: [] });
      return;
    }
    await json({});
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('admin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Finance/ }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Finance plateforme|Platform finance/ }).click();
  }

  await page.getByRole('button', { name: /Plans d'abonnement|Subscription plans/ }).click();
  const form = page.locator('#billing-plan-form');
  await form.getByLabel(/Titre|Title/).fill('International Plus');
  await form.getByLabel(/Description/).fill('Offre internationale complète pour les entreprises.');
  await form.getByLabel(/Prix mensuel|Monthly price/).fill('35000');
  await form.getByLabel(/Prix annuel|Annual price/).fill('350000');
  await form.getByLabel(/Quota mensuel|Monthly quota/).fill('500');
  await form.getByRole('button', { name: /Enregistrer|Save/ }).click();

  await expect.poll(() => createdPlanBody).toContain('International Plus');
  expect(JSON.parse(createdPlanBody)).toMatchObject({
    monthlyAmountXaf: 35000,
    annualAmountXaf: 350000,
    features: ['SHIPMENT_SENDING'],
    availableInAllCountries: true,
  });
  await expect(page.getByText('International Plus').last()).toBeVisible();

  await page.getByRole('button', { name: /Abonnements entreprises|Company subscriptions/ }).click();
  await expect(page.getByLabel(/Entreprise|Company/)).toHaveValue('42');
  await expect(page.getByRole('heading', { name: /Facturation et abonnement|Billing and subscription/ })).toBeVisible();
});
