'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSession, ApiRole, AuthUser, UserResponse } from './types';
import {
  AUTH_EXPIRED_EVENT,
  AUTH_STORAGE_KEY,
  clearAuthCookie,
  isTokenExpired,
  redirectToLoginAfterAuthFailure,
  scheduleTokenExpiration,
  setAuthCookie,
} from './session';

interface AuthStore extends AuthSession {
  isHydrated: boolean;
  setAuth: (session: AuthSession) => void;
  clearAuth: () => void;
  getToken: () => string | null;
  setCompanyId: (id: number) => void;
  setUser: (user: AuthUser | UserResponse) => void;
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
}

const EMPTY: Omit<AuthSession, never> = {
  token: '',
  userId: 0,
  role: 'CLIENT' as ApiRole,
  user: undefined,
};

let cancelTokenExpiration: () => void = () => undefined;

function watchTokenExpiration(token: string) {
  cancelTokenExpiration();
  cancelTokenExpiration = token
    ? scheduleTokenExpiration(token, redirectToLoginAfterAuthFailure)
    : () => undefined;
}

function normalizeUser(user: AuthUser | UserResponse): AuthUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phone: 'phone' in user ? user.phone : undefined,
    city: 'city' in user ? user.city : undefined,
    address: 'address' in user ? user.address : undefined,
    idCardNumber: 'idCardNumber' in user ? user.idCardNumber : undefined,
    language:
      'language' in user
        ? typeof user.language === 'string'
          ? user.language
          : user.language?.languageCode
        : undefined,
    role: 'role' in user ? user.role : undefined,
    status: 'status' in user ? user.status : undefined,
    profileImageUrl: user.profileImageUrl,
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      isHydrated: false,

      setAuth: (session) => {
        if (isTokenExpired(session.token)) {
          redirectToLoginAfterAuthFailure();
          return;
        }

        set({ ...session });
        setAuthCookie(session.token);
        watchTokenExpiration(session.token);
      },

      clearAuth: () => {
        watchTokenExpiration('');
        set({ ...EMPTY });
        clearAuthCookie();
      },

      getToken: () => {
        const token = get().token;
        return token || null;
      },

      setCompanyId: (id) => set({ companyId: id }),

      setUser: (user) => set({ user: normalizeUser(user) }),

      isSuperAdmin: () => get().role === 'SUPER_ADMIN',

      isCompanyAdmin: () => get().role === 'ADMIN_COMPANY',
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          if (state.token && isTokenExpired(state.token)) {
            redirectToLoginAfterAuthFailure();
          } else if (state.token) {
            // Re-sync cookie in case it was cleared but localStorage wasn't.
            setAuthCookie(state.token);
            watchTokenExpiration(state.token);
          }
        }
      },
    },
  ),
);

if (typeof window !== 'undefined') {
  const browserWindow = window as typeof window & {
    __sendamAuthExpiredListenerRegistered?: boolean;
    __sendamAuthExpiryChecksRegistered?: boolean;
  };

  if (!browserWindow.__sendamAuthExpiredListenerRegistered) {
    browserWindow.addEventListener(AUTH_EXPIRED_EVENT, () => {
      useAuthStore.getState().clearAuth();
    });
    browserWindow.__sendamAuthExpiredListenerRegistered = true;
  }

  if (!browserWindow.__sendamAuthExpiryChecksRegistered) {
    const clearExpiredSession = () => {
      const token = useAuthStore.getState().token;
      if (token && isTokenExpired(token)) {
        redirectToLoginAfterAuthFailure();
      }
    };

    browserWindow.addEventListener('pageshow', clearExpiredSession);
    browserWindow.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        clearExpiredSession();
      }
    });
    browserWindow.__sendamAuthExpiryChecksRegistered = true;
  }
}
