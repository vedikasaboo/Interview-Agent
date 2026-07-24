import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { api } from "./api";

// Server-render fallback: this module is evaluated during SSR of client
// components, where localStorage doesn't exist. A no-op keeps it safe there;
// real persistence only happens in the browser.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// Matches GET /api/me. Login returns a subset ({id,name,company}); we always
// load the canonical full record via /me so `recruiter` has one shape.
export interface Recruiter {
  id: number;
  email: string;
  name: string;
  company: string;
  createdAt: string;
}

interface LoginResponse {
  token: string;
  recruiter: { id: number; name: string; company: string };
}

interface AuthState {
  token: string | null;
  recruiter: Recruiter | null;
  // hasHydrated: localStorage restore is complete (gates first render).
  // isLoading: the /api/me network call is in flight. Deliberately separate —
  // storage restore is synchronous and instant; validating the token is not.
  hasHydrated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  setHasHydrated: (value: boolean) => void;
}

// Always skips the global 401 handler: a 401 here means "restored token is
// stale", which we handle locally (clear), not with a redirect loop.
const fetchMe = () => api.get<Recruiter>("/api/me", { skip401Handler: true });

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      recruiter: null,
      hasHydrated: false,
      isLoading: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          // skip401Handler: a wrong-password 401 must surface to the form, not
          // trigger the global logout+redirect.
          const { token } = await api.post<LoginResponse>(
            "/api/auth/login",
            { email, password },
            { skip401Handler: true },
          );
          set({ token });
          set({ recruiter: await fetchMe() });
        } catch (err) {
          // Never leave a token without a recruiter; reset and let the form show it.
          get().logout();
          throw err;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => set({ token: null, recruiter: null }),

      hydrate: async () => {
        // skipHydration is on (SSR safety), so restore from localStorage here,
        // on the client, before reading the token.
        await useAuthStore.persist.rehydrate();
        const { token } = get();
        if (!token) return;
        set({ isLoading: true });
        try {
          set({ recruiter: await fetchMe() });
        } catch {
          // Restored token was rejected/expired — clear it.
          get().logout();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      // XSS tradeoff: a token in localStorage is readable by ANY script on the
      // page, so an XSS hole means token theft. We accept this over httpOnly
      // cookies to keep the Bearer flow simple and CSRF-free — it is not free.
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      // Only the token is persisted; recruiter is re-fetched via /me so it can't
      // go stale in storage.
      partialize: (state) => ({ token: state.token }),
      // Deferred so server render and first client render both start unhydrated,
      // avoiding a hydration mismatch. AuthProvider drives rehydrate() on mount.
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
