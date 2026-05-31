import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, usersApi } from '@/lib/api';

interface AuthState {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  login: (phone: string, otp: string) => Promise<void>;
  register: (data: any) => Promise<{ userId: string }>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      login: async (phone, otp) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.verifyOtp(phone, otp);
          get().setTokens(data.accessToken, data.refreshToken);
          await get().fetchProfile();
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (formData) => {
        const { data } = await authApi.register(formData);
        return data;
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      fetchProfile: async () => {
        try {
          const { data } = await usersApi.getMe();
          set({ user: data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'techieride-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
