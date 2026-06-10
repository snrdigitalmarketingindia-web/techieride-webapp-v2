import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, usersApi, savedLocationsApi } from '@/lib/api';

export interface SavedLocationCached {
  id: string;
  alias: string;
  lat: number;
  lng: number;
  address: string;
  isFavorite: boolean;
  sourceType: string;
  usageCount: number;
  lastUsedAt: string | null;
}

interface AuthState {
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  savedLocations: SavedLocationCached[];
  savedLocationsLoaded: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<{ userId: string }>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  setTokens: (access: string, refresh: string) => void;
  setHasHydrated: (v: boolean) => void;
  fetchSavedLocations: () => Promise<void>;
  invalidateSavedLocations: () => void;
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
      savedLocations: [],
      savedLocationsLoaded: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setTokens: (accessToken, refreshToken) => {
        // Must write to localStorage directly — the API interceptor reads
        // localStorage.getItem('accessToken'), not the Zustand persist key.
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ accessToken, refreshToken, isAuthenticated: true });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login(email, password);
          get().setTokens(data.accessToken, data.refreshToken);
          await get().fetchProfile();
          // If profile fetch silently failed, surface it as an error
          if (!get().isAuthenticated) {
            throw new Error('Unable to load your profile. Please try again.');
          }
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (formData) => {
        const { data } = await authApi.register(formData);
        return data;
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          savedLocations: [],
          savedLocationsLoaded: false,
        });
      },

      fetchSavedLocations: async () => {
        try {
          const { data } = await savedLocationsApi.getMine();
          set({ savedLocations: data ?? [], savedLocationsLoaded: true });
        } catch {
          set({ savedLocationsLoaded: true });
        }
      },

      invalidateSavedLocations: () => {
        set({ savedLocationsLoaded: false });
      },

      fetchProfile: async () => {
        try {
          const { data } = await usersApi.getMe();
          set({ user: data, isAuthenticated: true });
        } catch (e: any) {
          // 401 = not authenticated, clear silently
          // Other errors (network, 500) — clear auth but let caller surface the error
          set({ user: null, isAuthenticated: false });
          if (e?.response?.status !== 401) throw e;
        }
      },
    }),
    {
      name: 'techieride-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken:          state.accessToken,
        refreshToken:         state.refreshToken,
        isAuthenticated:      state.isAuthenticated,
        // Cache profile coords so ride-create doesn't need to re-fetch on every page load
        user:                 state.user ? {
          ...state.user,
          homeLat:    state.user.homeLat,
          homeLng:    state.user.homeLng,
          homeAddress: state.user.homeAddress,
          officeLat:  state.user.officeLat,
          officeLng:  state.user.officeLng,
          officeAddress: state.user.officeAddress,
        } : null,
        savedLocations:       state.savedLocations,
        savedLocationsLoaded: state.savedLocationsLoaded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
