'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSession, ApiRole } from './types';

const AUTH_COOKIE = 'sendam_auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

interface AuthStore extends AuthSession {
  isHydrated: boolean;
  setAuth: (session: AuthSession) => void;
  clearAuth: () => void;
  getToken: () => string | null;
  setCompanyId: (id: number) => void;
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
}

const EMPTY: Omit<AuthSession, never> = {
  token: '',
  userId: 0,
  role: 'CLIENT' as ApiRole,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...EMPTY,
      isHydrated: false,

      setAuth: (session) => {
        set({ ...session });
        setCookie(AUTH_COOKIE, session.token, COOKIE_MAX_AGE);
      },

      clearAuth: () => {
        set({ ...EMPTY });
        clearCookie(AUTH_COOKIE);
      },

      getToken: () => {
        const token = get().token;
        return token || null;
      },

      setCompanyId: (id) => set({ companyId: id }),

      isSuperAdmin: () => get().role === 'SUPER_ADMIN',

      isCompanyAdmin: () => get().role === 'ADMIN_COMPANY',
    }),
    {
      name: 'sendam-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          // Re-sync cookie in case it was cleared but localStorage wasn't
          if (state.token) {
            setCookie(AUTH_COOKIE, state.token, COOKIE_MAX_AGE);
          }
        }
      },
    },
  ),
);
