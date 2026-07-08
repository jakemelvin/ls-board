'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthSession, ApiRole, AuthUser, UserResponse } from './types';
import {
  AUTH_EXPIRED_EVENT,
  AUTH_STORAGE_KEY,
  clearAuthCookie,
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
        set({ ...session });
        setAuthCookie(session.token);
      },

      clearAuth: () => {
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
          // Re-sync cookie in case it was cleared but localStorage wasn't
          if (state.token) {
            setAuthCookie(state.token);
          }
        }
      },
    },
  ),
);

if (typeof window !== 'undefined') {
  const browserWindow = window as typeof window & {
    __sendamAuthExpiredListenerRegistered?: boolean;
  };

  if (!browserWindow.__sendamAuthExpiredListenerRegistered) {
    browserWindow.addEventListener(AUTH_EXPIRED_EVENT, () => {
      useAuthStore.getState().clearAuth();
    });
    browserWindow.__sendamAuthExpiredListenerRegistered = true;
  }
}
