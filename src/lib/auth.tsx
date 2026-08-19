import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { adminApi, tokenStore, type ApiAdmin } from "./api";

type Session = { token: string; admin: ApiAdmin | null } | null;

interface AuthContextValue {
  admin: Session;
  ready: boolean;
  loginAdmin: (email: string, password: string) => Promise<void>;
  logoutAdmin: () => void;
  setAdminProfile: (admin: ApiAdmin) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const ADMIN_PROFILE_KEY = "pms.adminProfile";
const ADMIN_REFRESH_KEY = "pms.adminRefreshToken";

function readProfile(key: string): ApiAdmin | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ApiAdmin;
  } catch {
    return null;
  }
}

function writeProfile(key: string, admin: ApiAdmin | null) {
  if (typeof window === "undefined") return;
  if (admin) window.localStorage.setItem(key, JSON.stringify(admin));
  else window.localStorage.removeItem(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const storedAdminRefreshToken =
        typeof window !== "undefined" ? window.localStorage.getItem(ADMIN_REFRESH_KEY) : null;

      if (storedAdminRefreshToken) {
        try {
          const result = await adminApi.refreshToken({ refreshToken: storedAdminRefreshToken });
          tokenStore.setAdmin(result.accessToken, storedAdminRefreshToken);
          setAdmin({ token: result.accessToken, admin: readProfile(ADMIN_PROFILE_KEY) });
        } catch {
          window.localStorage.removeItem(ADMIN_REFRESH_KEY);
          writeProfile(ADMIN_PROFILE_KEY, null);
        }
      }

      setReady(true);
    }

    void restoreSession();
  }, []);

  const loginAdmin = useCallback(async (email: string, password: string) => {
    const result = await adminApi.login({ email, password });
    tokenStore.setAdmin(result.accessToken, result.refreshToken ?? null);
    writeProfile(ADMIN_PROFILE_KEY, result.admin ?? null);
    setAdmin({ token: result.accessToken, admin: result.admin ?? null });
  }, []);

  const logoutAdmin = useCallback(() => {
    tokenStore.setAdmin(null, null);
    writeProfile(ADMIN_PROFILE_KEY, null);
    setAdmin(null);
  }, []);

  const setAdminProfile = useCallback((profile: ApiAdmin) => {
    writeProfile(ADMIN_PROFILE_KEY, profile);
    setAdmin((prev) => (prev ? { ...prev, admin: profile } : prev));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      ready,
      loginAdmin,
      logoutAdmin,
      setAdminProfile,
    }),
    [admin, ready, loginAdmin, logoutAdmin, setAdminProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function displayName(admin: ApiAdmin | null | undefined) {
  if (!admin) return "Account";
  const name = [admin.firstName, admin.lastName].filter(Boolean).join(" ").trim();
  return name || admin.email || "Account";
}

export function initials(admin: ApiAdmin | null | undefined) {
  if (!admin) return "?";
  const source = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}