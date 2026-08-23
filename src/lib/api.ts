/**
 * Thin client for the real backend API.
 * Base URL is configurable at runtime (Settings page) so the same build works
 * against localhost during development and a deployed API in production.
 *
 * Access tokens are kept in memory only (not localStorage) to reduce exposure
 * to XSS. A refresh-token-based silent re-auth flow restores the session on
 * page load, and also retries once if a request comes back 401 mid-session
 * (e.g. the access token expired while the user was active).
 */

const DEFAULT_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ??
  "http://localhost:8000/api/v1";

const BASE_URL_KEY = "pms.apiBaseUrl";
const ADMIN_REFRESH_KEY = "pms.adminRefreshToken";
const isBrowser = () => typeof window !== "undefined";

let inMemoryAdminToken: string | null = null;

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
  get admin() {
    return inMemoryAdminToken;
  },
  setAdmin(access: string | null, refresh?: string | null) {
    inMemoryAdminToken = access;
    if (!isBrowser()) return;
    if (refresh) window.localStorage.setItem(ADMIN_REFRESH_KEY, refresh);
    else if (refresh === null) window.localStorage.removeItem(ADMIN_REFRESH_KEY);
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

type Auth = "none" | "admin";

export interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: Auth;
  signal?: AbortSignal;
}

// Prevents a burst of parallel 401s from each independently calling the
// refresh endpoint — they all await the same in-flight refresh instead.
let refreshInFlight: Promise<string | null> | null = null;

async function tryRefreshAdminToken(): Promise<string | null> {
  if (!isBrowser()) return null;
  const storedRefreshToken = window.localStorage.getItem(ADMIN_REFRESH_KEY);
  if (!storedRefreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const result = await apiRequest<{ accessToken: string; refreshToken: string }>("/admins/refresh-token", {
  method: "POST",
  body: { refreshToken: storedRefreshToken },
});
tokenStore.setAdmin(result.accessToken, result.refreshToken);
        return result.accessToken;
      } catch {
        tokenStore.setAdmin(null, null);
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

/** Performs a request and unwraps the `{ success, data }` envelope when present. */
export async function apiRequest<T = unknown>(
  path: string,
  { method = "GET", body, auth = "none", signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = auth === "admin" ? tokenStore.admin : null;
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

  // Silent retry-once on 401 for admin-authed requests, except the refresh
  // call itself (avoids an infinite loop if the refresh token is also dead).
  if (response.status === 401 && auth === "admin" && !path.includes("/refresh-token")) {
    const refreshedToken = await tryRefreshAdminToken();
    if (refreshedToken) {
      headers["Authorization"] = `Bearer ${refreshedToken}`;
      try {
        response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
      } catch {
        throw new ApiError(
          `Cannot reach the API at ${getApiBaseUrl()}. Check that the backend is running and the base URL in Settings is correct.`,
          0,
        );
      }
    }
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
export type AdminRole = "superAdmin" | "owner" | "manager";

export interface ApiAdmin {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  status?: AccountStatus;
  role?: AdminRole;
  createdAt?: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  admin: ApiAdmin;
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
    for (const key of ["items", "results", "data", "admins", "docs"]) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Admin endpoints                                                     */
/* ------------------------------------------------------------------ */

export const adminApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthResult>("/admins/login", { method: "POST", body }),
 refreshToken: (body: { refreshToken: string }) =>
  apiRequest<{ accessToken: string; refreshToken: string }>("/admins/refresh-token", { method: "POST", body }),
  listAdmins: () => apiRequest<unknown>("/admins", { auth: "admin" }).then(toList<ApiAdmin>),
  createAdmin: (body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: AdminRole;
  }) => apiRequest<ApiAdmin>("/admins/create", { method: "POST", body, auth: "admin" }),
  getAdmin: (id: string) => apiRequest<ApiAdmin>(`/admins/${id}`, { auth: "admin" }),
  updateAdmin: (
    id: string,
    body: { firstName: string; lastName: string; email: string; role: AdminRole },
  ) => apiRequest<ApiAdmin>(`/admins/${id}`, { method: "PUT", body, auth: "admin" }),
  updateAdminStatus: (id: string, status: AccountStatus) =>
    apiRequest<ApiAdmin>(`/admins/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: "admin",
    }),
};

/* ------------------------------------------------------------------ */
/* Property / Building / Floor endpoints                               */
/* ------------------------------------------------------------------ */

export type PropertyListingType = "rent" | "sale";
export type PropertyStatus = "draft" | "active" | "inactive" | "sold" | "rented";
export type BuildingStatus = "draft" | "active" | "inactive" | "maintenance";
export type FloorStatus = BuildingStatus;

export interface ApiProperty {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  listingType: PropertyListingType;
  price: number;
  currency?: string;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  latitude: number;
  longitude: number;
  bedrooms: number;
  bathrooms: number;
  areaSize: number;
  areaUnit: string;
  amenities?: Record<string, unknown>;
  images?: string[];
  status: PropertyStatus;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiBuilding {
  id: string;
  propertyId: string;
  name: string;
  buildingNumber?: string | null;
  floors: number;
  totalUnits: number;
  totalArea: number;
  areaUnit: string;
  description?: string | null;
  status: BuildingStatus;
  amenities?: Record<string, unknown>;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiFloor {
  id: string;
  buildingId: string;
  floorNumber: number;
  name?: string | null;
  totalUnits: number;
  totalArea: number;
  areaUnit: string;
  description?: string | null;
  amenities?: Record<string, unknown>;
  status: FloorStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

function toQuery<T extends object>(params: T = {} as T): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== "") usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export interface ListResult<T> {
  items: T[];
  total: number;
}

function toListResult<T>(payload: unknown): ListResult<T> {
  const items = toList<T>(payload);
  const pagination =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>)["pagination"] : undefined;
  const total =
    pagination && typeof pagination === "object"
      ? Number((pagination as Record<string, unknown>)["total"] ?? items.length)
      : items.length;
  return { items, total };
}




export const propertyApi = {
  list: (params: ListParams & { status?: string; type?: string; listingType?: string } = {}) =>
    apiRequest<unknown>(`/properties${toQuery(params)}`, { auth: "admin" }).then((res) => toListResult<ApiProperty>(res)),
  get: (id: string) => apiRequest<ApiProperty>(`/properties/${id}`, { auth: "admin" }),
  create: (body: Partial<ApiProperty>) =>
    apiRequest<ApiProperty>("/properties/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Partial<ApiProperty>) =>
    apiRequest<ApiProperty>(`/properties/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) =>
    apiRequest<ApiProperty>(`/properties/${id}`, { method: "DELETE", auth: "admin" }),
};

export const buildingApi = {
  list: (params: ListParams & { status?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/buildings${toQuery(params)}`, { auth: "admin" }).then((res) => toListResult<ApiBuilding>(res)),
  get: (id: string) => apiRequest<ApiBuilding>(`/buildings/${id}`, { auth: "admin" }),
  create: (body: Partial<ApiBuilding>) =>
    apiRequest<ApiBuilding>("/buildings/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Partial<ApiBuilding>) =>
    apiRequest<ApiBuilding>(`/buildings/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) =>
    apiRequest<ApiBuilding>(`/buildings/${id}`, { method: "DELETE", auth: "admin" }),
};

export const floorApi = {
  list: (params: ListParams & { status?: string; buildingId?: string } = {}) =>
    apiRequest<unknown>(`/floors${toQuery(params)}`, { auth: "admin" }).then((res) => toListResult<ApiFloor>(res)),
  get: (id: string) => apiRequest<ApiFloor>(`/floors/${id}`, { auth: "admin" }),
  create: (body: Partial<ApiFloor>) =>
    apiRequest<ApiFloor>("/floors/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Partial<ApiFloor>) =>
    apiRequest<ApiFloor>(`/floors/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) =>
    apiRequest<ApiFloor>(`/floors/${id}`, { method: "DELETE", auth: "admin" }),
};
















