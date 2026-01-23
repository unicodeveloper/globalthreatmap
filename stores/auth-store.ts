import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  email_verified?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  signIn: (user: User, tokens?: { accessToken: string; refreshToken?: string; expiresIn?: number }) => void;
  signOut: () => void;
  checkAuthFromStorage: () => void;
  getAccessToken: () => string | null;
  setTokens: (tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }) => void;
}

function loadInitialTokens() {
  if (typeof window === "undefined") return {};
  try {
    const accessToken = sessionStorage.getItem("access_token");
    const refreshToken = sessionStorage.getItem("refresh_token");
    const expiresAt = sessionStorage.getItem("token_expires_at");
    return {
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt ? parseInt(expiresAt, 10) : null,
    };
  } catch {
    return {};
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,

      signIn: (user, tokens) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("user", JSON.stringify(user));
          if (tokens?.accessToken) {
            sessionStorage.setItem("access_token", tokens.accessToken);
            if (tokens.refreshToken) {
              sessionStorage.setItem("refresh_token", tokens.refreshToken);
            }
            if (tokens.expiresIn) {
              const expiresAt = Date.now() + tokens.expiresIn * 1000;
              sessionStorage.setItem("token_expires_at", expiresAt.toString());
            }
          }
        }
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          accessToken: tokens?.accessToken || null,
          refreshToken: tokens?.refreshToken || null,
          tokenExpiresAt: tokens?.expiresIn ? Date.now() + tokens.expiresIn * 1000 : null,
        });
      },

      signOut: () => {
        set({ isLoading: true });

        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
          sessionStorage.removeItem("access_token");
          sessionStorage.removeItem("refresh_token");
          sessionStorage.removeItem("token_expires_at");
        }

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
        });
      },

      checkAuthFromStorage: () => {
        if (typeof window === "undefined") return;

        const storedUser = localStorage.getItem("user");
        const initialTokens = loadInitialTokens();

        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (user && user.id && user.email) {
              set({
                user,
                isAuthenticated: true,
                accessToken: initialTokens.accessToken || null,
                refreshToken: initialTokens.refreshToken || null,
                tokenExpiresAt: initialTokens.tokenExpiresAt || null,
              });
              return;
            }
          } catch (error) {
            console.error("Error parsing stored user:", error);
          }
        }

        set({ user: null, isAuthenticated: false });
      },

      getAccessToken: () => {
        const state = get();
        if (!state.accessToken) return null;

        if (state.tokenExpiresAt && Date.now() >= state.tokenExpiresAt - 30000) {
          return null;
        }

        return state.accessToken;
      },

      setTokens: (tokens) => {
        const expiresAt = tokens.expiresIn ? Date.now() + tokens.expiresIn * 1000 : null;

        if (typeof window !== "undefined") {
          sessionStorage.setItem("access_token", tokens.accessToken);
          if (tokens.refreshToken) {
            sessionStorage.setItem("refresh_token", tokens.refreshToken);
          }
          if (expiresAt) {
            sessionStorage.setItem("token_expires_at", expiresAt.toString());
          }
        }

        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || get().refreshToken,
          tokenExpiresAt: expiresAt,
        });
      },
    }),
    {
      name: "globalthreatmap-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
      }),
      skipHydration: true,
    }
  )
);
