import { expect, test, type APIRequestContext } from '@playwright/test';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://dstest.easywaka.com';
const runContract = process.env.RUN_BACKEND_SECURITY_CONTRACT === '1';

type LoginResult = {
  token: string;
  userId: number;
  role: string;
};

type Company = { id: number };

async function login(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<LoginResult> {
  const response = await request.post(`${apiBaseUrl}/api/delivery/auth/login`, {
    data: { username, password },
  });

  expect(response.status(), `login ${username}`).toBe(200);
  return response.json() as Promise<LoginResult>;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function expectDenied(status: number, operation: string) {
  expect.soft([401, 403, 404], operation).toContain(status);
}

function companiesFrom(payload: unknown): Company[] {
  if (Array.isArray(payload)) return payload as Company[];
  if (payload && typeof payload === 'object' && 'content' in payload) {
    const content = (payload as { content?: unknown }).content;
    return Array.isArray(content) ? (content as Company[]) : [];
  }
  return [];
}

test.describe('backend security contract', () => {
  test.skip(!runContract, 'Set RUN_BACKEND_SECURITY_CONTRACT=1 to check the test backend.');

  test('enforces authentication, RBAC, ownership and company isolation', async ({ request }, testInfo) => {
    const observations: Record<string, number> = {};
    const [companyAdmin, superAdmin, client] = await Promise.all([
      login(request, 'alice.admin', '1234'),
      login(request, 'admin', '1234'),
      login(request, 'jean.client', '1234'),
    ]);

    expect(companyAdmin.role).toBe('ADMIN_COMPANY');
    expect(superAdmin.role).toBe('SUPER_ADMIN');
    expect(client.role).toBe('CLIENT');

    const anonymousCompany = await request.get(
      `${apiBaseUrl}/api/delivery/users/me/company`,
    );
    observations.anonymousCompany = anonymousCompany.status();
    expectDenied(anonymousCompany.status(), 'anonymous users must not resolve a company');

    const clientCompanies = await request.get(
      `${apiBaseUrl}/api/delivery/companies?page=0&size=1`,
      { headers: bearer(client.token) },
    );
    observations.clientCompanies = clientCompanies.status();
    expectDenied(clientCompanies.status(), 'CLIENT must not list companies');

    const ownCompanyResponse = await request.get(
      `${apiBaseUrl}/api/delivery/users/me/company`,
      { headers: bearer(companyAdmin.token) },
    );
    observations.ownCompany = ownCompanyResponse.status();
    expect(ownCompanyResponse.status(), 'company admin must resolve its own company').toBe(200);
    const ownCompany = (await ownCompanyResponse.json()) as Company;
    expect(typeof ownCompany.id).toBe('number');

    const companiesResponse = await request.get(
      `${apiBaseUrl}/api/delivery/companies?page=0&size=100`,
      { headers: bearer(superAdmin.token) },
    );
    observations.superAdminCompanies = companiesResponse.status();
    expect(companiesResponse.status(), 'SUPER_ADMIN must list companies').toBe(200);
    const otherCompany = companiesFrom(await companiesResponse.json()).find(
      (company) => company.id !== ownCompany.id,
    );
    expect.soft(otherCompany, 'the test environment needs a second company').toBeDefined();
    if (!otherCompany) {
      await testInfo.attach('backend-security-observations.json', {
        body: JSON.stringify(observations, null, 2),
        contentType: 'application/json',
      });
      return;
    }

    const foreignCompanyId = otherCompany!.id;
    const foreignCompanyZones = await request.get(
      `${apiBaseUrl}/api/delivery/companies/${foreignCompanyId}/zones`,
      { headers: bearer(companyAdmin.token) },
    );
    observations.foreignCompanyZones = foreignCompanyZones.status();
    expectDenied(
      foreignCompanyZones.status(),
      'company admin must not read another company\'s zones',
    );

    const foreignUser = await request.get(
      `${apiBaseUrl}/api/delivery/users/${superAdmin.userId}`,
      { headers: bearer(companyAdmin.token) },
    );
    observations.foreignUser = foreignUser.status();
    expectDenied(
      foreignUser.status(),
      'company admin must not read another user\'s profile',
    );

    await testInfo.attach('backend-security-observations.json', {
      body: JSON.stringify(observations, null, 2),
      contentType: 'application/json',
    });
  });
});
