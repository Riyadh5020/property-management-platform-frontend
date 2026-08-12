import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { adminApi, tokenStore, usersApi, type ApiUser } from "./api";

type Session = { token: string; user: ApiUser | null } | null;

interface AuthContextValue {
  user: Session;
  admin: Session;
  ready: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutUser: () => void;
  logoutAdmin: () => void;
  refreshUser: () => Promise<void>;
  setUserProfile: (user: ApiUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_PROFILE_KEY = "pms.userProfile";
const ADMIN_PROFILE_KEY = "pms.adminProfile";

function readProfile(key: string): ApiUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

function writeProfile(key: string, user: ApiUser | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(key, JSON.stringify(user));
  else window.localStorage.removeItem(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session>(null);
  const [admin, setAdmin] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const userToken = tokenStore.user;
    const adminToken = tokenStore.admin;
    if (userToken) setUser({ token: userToken, user: readProfile(USER_PROFILE_KEY) });
    if (adminToken) setAdmin({ token: adminToken, user: readProfile(ADMIN_PROFILE_KEY) });
    setReady(true);
  }, []);

  const loginUser = useCallback(async (email: string, password: string) => {
    const result = await usersApi.login({ email, password });
    tokenStore.setUser(result.accessToken, result.refreshToken ?? null);
    writeProfile(USER_PROFILE_KEY, result.user ?? null);
    setUser({ token: result.accessToken, user: result.user ?? null });
  }, []);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const result = await adminApi.login({ email, password });
    tokenStore.setAdmin(result.accessToken);
    writeProfile(ADMIN_PROFILE_KEY, result.user ?? null);
    setAdmin({ token: result.accessToken, user: result.user ?? null });
  }, []);

  const logoutUser = useCallback(() => {
    tokenStore.setUser(null, null);
    writeProfile(USER_PROFILE_KEY, null);
    setUser(null);
  }, []);

  const logoutAdmin = useCallback(() => {
    tokenStore.setAdmin(null);
    writeProfile(ADMIN_PROFILE_KEY, null);
    setAdmin(null);
  }, []);

  const setUserProfile = useCallback((profile: ApiUser) => {
    writeProfile(USER_PROFILE_KEY, profile);
    setUser((prev) => (prev ? { ...prev, user: profile } : prev));
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await usersApi.me();
    setUserProfile(profile);
  }, [setUserProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      admin,
      ready,
      loginUser,
      loginAdmin,
      logoutUser,
      logoutAdmin,
      refreshUser,
      setUserProfile,
    }),
    [
      user,
      admin,
      ready,
      loginUser,
      loginAdmin,
      logoutUser,
      logoutAdmin,
      refreshUser,
      setUserProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function displayName(user: ApiUser | null | undefined) {
  if (!user) return "Account";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "Account";
}

export function initials(user: ApiUser | null | undefined) {
  if (!user) return "?";
  const source = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
