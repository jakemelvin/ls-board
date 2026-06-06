export const AUTH_COOKIE = 'sendam_auth_token';
export const AUTH_EXPIRED_EVENT = 'sendam:auth-expired';
export const AUTH_STORAGE_KEY = 'sendam-auth';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export function clearPersistedAuthSession() {
  clearAuthCookie();

  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      state: {
        token: '',
        userId: 0,
        role: 'CLIENT',
      },
      version: 0,
    }),
  );
}

export function redirectToLoginAfterAuthFailure() {
  if (typeof window === 'undefined') return;

  clearPersistedAuthSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));

  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (window.location.pathname === '/login') return;

  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('reason', 'session-expired');
  if (currentPath && currentPath !== '/') {
    loginUrl.searchParams.set('from', currentPath);
  }

  window.location.assign(loginUrl.toString());
}
