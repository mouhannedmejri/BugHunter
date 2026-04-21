import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  platformRole: string;
  totpEnabled: boolean;
  onboardingStep: string;
  orgMemberships?: { org: { slug: string } }[];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    accountType?: 'RESEARCHER' | 'COMPANY',
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  /** When `token` is omitted, the current access token is kept (for onboarding/profile patches). */
  setUser: (user: AuthUser, token?: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password, totpCode) => {
        set({ isLoading: true });
        try {
          const result = await api.login({ email, password, totpCode });
          api.setToken(result.accessToken);
          set({
            user: result.user,
            accessToken: result.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, password, username, accountType) => {
        set({ isLoading: true });
        try {
          await api.register({
            email,
            password,
            username,
            accountType: accountType ?? 'RESEARCHER',
          });
          set({ isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // ignore — clear local state regardless
        }
        api.setToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      refresh: async () => {
        try {
          const result = await api.refresh();
          api.setToken(result.accessToken);
          set({ accessToken: result.accessToken, isAuthenticated: true });
          return true;
        } catch {
          get().clearAuth();
          return false;
        }
      },

      setUser: (user, token) => {
        const nextToken = token ?? get().accessToken;
        if (nextToken) api.setToken(nextToken);
        set({ user, accessToken: nextToken ?? null, isAuthenticated: true });
      },

      clearAuth: () => {
        api.setToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'bughuntr-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrate: (_state) => {
        return (rehydrated) => {
          // Re-set token on the API client when the store rehydrates from storage
          if (rehydrated?.accessToken) {
            api.setToken(rehydrated.accessToken);
          }
        };
      },
    },
  ),
);
