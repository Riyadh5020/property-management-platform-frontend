/**
 * Thin client for the real backend API.
 * Base URL is configurable at runtime (Settings page) so the same build works
 * against localhost during development and a deployed API in production.
 */

const DEFAULT_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ??
  "http://localhost:8000/api/v1";

const BASE_URL_KEY = "pms.apiBaseUrl";
const USER_TOKEN_KEY = "pms.userToken";
const USER_REFRESH_KEY = "pms.userRefreshToken";
const ADMIN_TOKEN_KEY = "pms.adminToken";

const isBrowser = () => typeof window !== "undefined";

export function getApiBaseUrl(): string {
  if (!isBrowser()) return DEFAULT_BASE_URL;
  return window.localStorage.getItem(BASE_URL_KEY) || DEFAULT_BASE_URL;
}

export function setApiBaseUrl(url: string) {
  if (!isBrowser()) return;
  const clean = url.trim().replace(/\/+$/, "");
  if (clean) window.localStorage.setItem(BASE_URL_KEY, clean);
  else window.localStorage.removeItem(BASE_URL_KEY);
}

export const tokenStore = {
  get user() {
    return isBrowser() ? window.localStorage.getItem(USER_TOKEN_KEY) : null;
  },
  get admin() {
    return isBrowser() ? window.localStorage.getItem(ADMIN_TOKEN_KEY) : null;
  },
  setUser(access: string | null, refresh?: string | null) {
    if (!isBrowser()) return;
    if (access) window.localStorage.setItem(USER_TOKEN_KEY, access);
    else window.localStorage.removeItem(USER_TOKEN_KEY);
    if (refresh) window.localStorage.setItem(USER_REFRESH_KEY, refresh);
    else if (refresh === null) window.localStorage.removeItem(USER_REFRESH_KEY);
  },
  setAdmin(access: string | null) {
    if (!isBrowser()) return;
    if (access) window.localStorage.setItem(ADMIN_TOKEN_KEY, access);
    else window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type Auth = "none" | "user" | "admin";

export interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: Auth;
  signal?: AbortSignal;
}

/** Performs a request and unwraps the `{ success, data }` envelope when present. */
export async function apiRequest<T = unknown>(
  path: string,
  { method = "GET", body, auth = "none", signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = auth === "user" ? tokenStore.user : auth === "admin" ? tokenStore.admin : null;
  if (auth !== "none" && token) headers["Authorization"] = `Bearer ${token}`;

  const init: RequestInit = { method, headers };
  if (signal) init.signal = signal;
  if (body !== undefined) init.body = JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, init);
  } catch {
    throw new ApiError(
      `Cannot reach the API at ${getApiBaseUrl()}. Check that the backend is running and the base URL in Settings is correct.`,
      0,
    );
  }

  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const raw =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)["message"]
        : undefined;
    const message =
      typeof raw === "string" && raw ? raw : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }


  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as Record<string, unknown>)["data"] as T;
  }
  return payload as T;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AccountStatus = "active" | "inactive" | "suspended" | "pending";

export interface ApiUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  profileImageUrl?: string;
  status?: AccountStatus;
  role?: string;
  createdAt?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  user: ApiUser;
}

export interface Paginated<T> {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
}

/** Backends differ in list envelope shape; normalise to an array. */
export function toList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["items", "results", "data", "users", "admins", "docs"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* User endpoints                                                      */
/* ------------------------------------------------------------------ */

export const usersApi = {
  register: (body: { firstName: string; lastName: string; email: string; password: string }) =>
    apiRequest<ApiUser>("/users/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthResult>("/users/login", { method: "POST", body }),
  verifyEmail: (body: { token: string }) =>
    apiRequest("/users/verify-email", { method: "POST", body }),
  resendVerification: (body: { email: string }) =>
    apiRequest("/users/resend-verification-email", { method: "POST", body }),
  forgotPassword: (body: { email: string }) =>
    apiRequest("/users/forgot-password", { method: "POST", body }),
  resetPassword: (body: { token: string; password: string }) =>
    apiRequest("/users/reset-password", { method: "POST", body }),
  me: () => apiRequest<ApiUser>("/users/me", { auth: "user" }),
  updateMe: (body: Partial<Pick<ApiUser, "firstName" | "lastName" | "phoneNumber" | "address">>) =>
    apiRequest<ApiUser>("/users/me", { method: "PATCH", body, auth: "user" }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest("/users/change-password", { method: "PATCH", body, auth: "user" }),
  updateProfileImage: (body: { profileImageUrl: string }) =>
    apiRequest<ApiUser>("/users/profile-image", { method: "PATCH", body, auth: "user" }),
  deleteMe: () => apiRequest("/users/me", { method: "DELETE", auth: "user" }),
};

/* ------------------------------------------------------------------ */
/* Admin endpoints                                                     */
/* ------------------------------------------------------------------ */

export const adminApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthResult>("/admins/login", { method: "POST", body }),
  listAdmins: () => apiRequest<unknown>("/admins", { auth: "admin" }).then(toList<ApiUser>),
  createAdmin: (body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
  }) => apiRequest<ApiUser>("/admins/create", { method: "POST", body, auth: "admin" }),
  getAdmin: (id: string) => apiRequest<ApiUser>(`/admins/${id}`, { auth: "admin" }),
  updateAdmin: (
    id: string,
    body: { firstName: string; lastName: string; email: string; role: string },
  ) => apiRequest<ApiUser>(`/admins/${id}`, { method: "PUT", body, auth: "admin" }),
  updateAdminStatus: (id: string, status: AccountStatus) =>
    apiRequest<ApiUser>(`/admins/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: "admin",
    }),
  listUsers: () => apiRequest<unknown>("/users/admin", { auth: "admin" }).then(toList<ApiUser>),
  getUser: (id: string) => apiRequest<ApiUser>(`/users/admin/${id}`, { auth: "admin" }),
  updateUserStatus: (id: string, status: AccountStatus) =>
    apiRequest<ApiUser>(`/users/admin/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: "admin",
    }),
  deleteUser: (id: string) =>
    apiRequest(`/users/admin/${id}`, { method: "DELETE", auth: "admin" }),
};
