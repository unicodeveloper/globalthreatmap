import { create } from "zustand";

const TOKEN_STORAGE_KEY = "valyu_oauth_tokens";
const USER_STORAGE_KEY = "valyu_user";

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  email_verified?: boolean;
}

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  signIn: (user: User, tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }) => void;
  signOut: () => void;
  initialize: () => void;
  getAccessToken: () => string | null;
}

function saveTokens(tokens: TokenData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function loadTokens(): TokenData | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function saveUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function clearUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_STORAGE_KEY);
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  isAuthenticated: false,
  isLoading: true,
  initialized: false,

  initialize: () => {
    if (get().initialized) return;
    set({ initialized: true });

    const user = loadUser();
    const tokens = loadTokens();

    if (user && tokens) {
      const now = Date.now();
      if (tokens.expiresAt > now) {
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || null,
          tokenExpiresAt: tokens.expiresAt,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } else {
        clearTokens();
        clearUser();
      }
    }

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  signIn: (user, tokens) => {
    const expiresAt = tokens.expiresIn
      ? Date.now() + tokens.expiresIn * 1000
      : Date.now() + 3600 * 1000;

    saveUser(user);
    saveTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    });

    set({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
      tokenExpiresAt: expiresAt,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  signOut: () => {
    clearUser();
    clearTokens();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  getAccessToken: () => {
    const state = get();
    if (!state.accessToken) return null;

    if (state.tokenExpiresAt && Date.now() >= state.tokenExpiresAt - 30000) {
      return null;
    }

    return state.accessToken;
  },
}));
