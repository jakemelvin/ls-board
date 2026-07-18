import { expect, test } from '@playwright/test';

const API_ORIGIN = 'https://dstest.easywaka.com';

test('super admin separates succeeded cash from promo coverage', async ({ page }) => {
  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK', token: 'super-admin-finance-token', userId: 1,
        role: 'SUPER_ADMIN', firstName: 'Super', lastName: 'Admin', username: 'superadmin',
      });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname === '/api/countries') {
      await json([]);
      return;
    }
    if ([
      '/api/delivery/shipment-fees',
      '/api/delivery/promo-codes',
      '/api/delivery/payment-modes',
    ].includes(url.pathname)) {
      await json([]);
      return;
    }
    if (url.pathname === '/api/delivery/admin/transactions') {
      await json({
        content: [{
          transaction: {
            id: 31,
            reference: 'TRX-31',
            shipmentId: 701,
            shipmentReference: 'SHP-701',
            companyName: 'Sendam Express',
            status: 'COMPLETED',
            grossAmount: 10500,
            netAmount: 10500,
            createdAt: new Date().toISOString(),
          },
          payments: [
            { id: 1, reference: 'PAY-FEE', provider: 'MTN', status: 'SUCCEEDED', amount: 500, currency: 'XAF' },
            { id: 2, reference: 'PAY-COMPANY', provider: 'COLLECTION_POINT', status: 'SUCCEEDED', amount: 9000, currency: 'XAF' },
            { id: 3, reference: 'PAY-PROMO', provider: 'PROMO_CODE', status: 'SUCCEEDED', amount: 1000, currency: 'XAF' },
            { id: 4, reference: 'PAY-FAILED', provider: 'ORANGE', status: 'FAILED', amount: 500, currency: 'XAF', failureReason: 'Timeout fournisseur' },
          ],
        }],
        totalPages: 1, totalElements: 1, number: 0, size: 20,
        first: true, last: true, empty: false,
      });
      return;
    }

    await json({ content: [], totalPages: 0, totalElements: 0 });
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill('superadmin');
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Finance/i }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Finances|Finance/i }).click();
  }
  await page.getByRole('button', { name: /Transactions et paiements|Transactions and payments/ }).click();

  const superAdminTransactions = (page.viewportSize()?.width ?? 1280) < 768
    ? page.getByRole('article')
    : page.getByRole('table');
  await expect(superAdminTransactions.getByText('TRX-31')).toBeVisible();
  await expect(page.getByText(/9.?500/).first()).toBeVisible();
  await expect(page.getByText(/1.?000/).first()).toBeVisible();
  await expect(page.getByText(/Tentatives echouees|Failed attempts/).locator('..').getByText('1')).toBeVisible();
});

for (const account of [
  { label: 'company admin', role: 'ADMIN_COMPANY', username: 'alice.admin' },
  { label: 'company employee', role: 'EMPLOYEE_COMPANY', username: 'paul.employe' },
]) {
test(`${account.label} sees only company-scoped transactions and their payments`, async ({ page }) => {
  let companyTransactionsCalled = false;
  let adminFinanceCalled = false;

  await page.route(`${API_ORIGIN}/**`, async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.pathname === '/api/delivery/auth/login') {
      await json({
        message: 'OK', token: 'company-finance-token', userId: 2,
        role: account.role, firstName: 'Alice', lastName: 'Admin', username: account.username,
      });
      return;
    }
    if (url.pathname === '/api/delivery/users/me/company') {
      await json({ id: 12, name: 'Entreprise Test', status: 'APPROVED' });
      return;
    }
    if (url.pathname === '/api/delivery/notifications/unread-count') {
      await json({ unreadCount: 0 });
      return;
    }
    if (url.pathname.startsWith('/api/delivery/admin/')) {
      adminFinanceCalled = true;
      await json({ content: [], totalPages: 0, totalElements: 0 });
      return;
    }
    if (url.pathname === '/api/delivery/transactions') {
      companyTransactionsCalled = true;
      await json({
        content: [{
          id: 51,
          reference: 'TRX-COMPANY-51',
          shipmentId: 801,
          shipmentReference: 'SHP-COMPANY-801',
          status: 'COMPLETED',
          grossAmount: 12000,
          companyPrice: 10500,
          feeAmount: 1500,
          discountAmount: 0,
          netAmount: 12000,
          createdAt: new Date().toISOString(),
          payments: [{
            id: 9,
            reference: 'PAY-COMPANY-9',
            provider: 'MTN',
            status: 'SUCCEEDED',
            amount: 12000,
            currency: 'XAF',
            payerMsisdnMasked: '******123',
          }],
        }],
        totalPages: 1, totalElements: 1, number: 0, size: 20,
        first: true, last: true, empty: false,
      });
      return;
    }

    await json([]);
  });

  await page.goto('/login');
  await page.getByLabel(/Identifiant|Username/).fill(account.username);
  await page.getByLabel(/Mot de passe|Password/).fill('1234');
  await page.getByRole('button', { name: /Se connecter|Sign in/ }).click();

  if ((page.viewportSize()?.width ?? 1280) < 768) {
    await page.getByRole('navigation').getByRole('button', { name: /Menu/ }).click();
    await page.getByRole('button', { name: /Transactions et paiements|Transactions and payments/ }).click();
  } else {
    await page.locator('aside').getByRole('button', { name: /Transactions et paiements|Transactions and payments/ }).click();
  }

  await expect(page.getByRole('heading', { name: /Transactions et paiements|Transactions and payments/ })).toBeVisible();
  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  const transactionSurface = isMobile ? page.getByRole('article') : page.getByRole('table');
  await expect(transactionSurface.getByText('TRX-COMPANY-51')).toBeVisible();
  await transactionSurface.getByRole('button', { name: /Afficher les détails de TRX-COMPANY-51|Show details for TRX-COMPANY-51/ }).click();
  await expect(page.getByText('PAY-COMPANY-9', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('******123', { exact: true }).filter({ visible: true })).toBeVisible();
  if (isMobile) {
    const mainOverflowsHorizontally = await page.locator('main').evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(mainOverflowsHorizontally).toBe(false);
    await expect(page.locator('table:visible')).toHaveCount(0);
  }
  expect(companyTransactionsCalled).toBe(true);
  expect(adminFinanceCalled).toBe(false);
});
}
