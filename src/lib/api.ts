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
  const errBody = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : undefined;
  const rawMessage = errBody?.["message"];
  const errors = errBody?.["errors"];

  let message =
    typeof rawMessage === "string" && rawMessage ? rawMessage : `Request failed with status ${response.status}`;

  if (Array.isArray(errors) && errors.length > 0) {
    const detail = errors
      .map((e) => {
        const path = e && typeof e === "object" ? (e as Record<string, unknown>)["path"] : undefined;
        const msg = e && typeof e === "object" ? (e as Record<string, unknown>)["message"] : undefined;
        return path ? `${path}: ${msg}` : String(msg ?? "");
      })
      .filter(Boolean)
      .join("; ");
    if (detail) message = detail;
  }
  throw new ApiError(message, response.status, payload);
}

  if (payload && typeof payload === "object" && "data" in (payload as Record<string, unknown>)) {
    return (payload as Record<string, unknown>)["data"] as T;
  }
  return payload as T;
}

/* ------------------------------------------------------------------ */
/* Admin                                                                */
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

export const adminApi = {
  login: (body: { email: string; password: string }) =>
    apiRequest<AuthResult>("/admins/login", { method: "POST", body }),
   refreshToken: (body: { refreshToken: string }) =>
    apiRequest<{ accessToken: string; refreshToken: string }>("/admins/refresh-token", { method: "POST", body }),
 logout: () => apiRequest<null>("/admins/logout", { method: "POST", auth: "admin" }),
  forgotPassword: (body: { email: string }) =>
    apiRequest<null>("/admins/forgot-password", { method: "POST", body }),
  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    apiRequest<null>("/admins/reset-password", { method: "POST", body }),
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
    apiRequest<ApiAdmin>(`/admins/${id}/status`, { method: "PATCH", body: { status }, auth: "admin" }),
};

/* ------------------------------------------------------------------ */
/* Property / Floor / Unit — literal types must match backend enums    */
/* ------------------------------------------------------------------ */

export type PropertyType = "apartment" | "house" | "villa" | "office" | "shop" | "land";
export type PropertyStatus = "draft" | "active" | "inactive" | "rented";
export type PropertyListingType = "rent";

export type FloorStatus = "draft" | "active" | "inactive" | "maintenance";

export type UnitType = "apartment" | "office" | "shop" | "parking" | "common";
export type UnitStatus = "vacant" | "occupied" | "reserved" | "maintenance";

export interface ApiProperty {
  id: string;
  title: string;
  buildingNumber?: string | null;
  description?: string | null;
  type: PropertyType;
  listingType: PropertyListingType;
  price: number;
  currency?: string;
  floors?: number | null;
  totalUnits?: number | null;
  totalArea?: number | null;
  address: string;
  city: string;
  state?: string | null;
  country: string;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  amenities?: Record<string, unknown> | null;
  images?: string[] | null;
  status: PropertyStatus;
  ownerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiFloor {
  id: string;
  propertyId: string;
  floorNumber: number;
  name?: string | null;
  totalUnits?: number | null;
  totalArea?: number | null;
  areaUnit?: string | null;
  description?: string | null;
  amenities?: Record<string, unknown> | null;
  status: FloorStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiUnit {
  id: string;
  floorId: string;
  unitCode: string;
  unitType: UnitType;
  areaSize: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  hasKitchen?: boolean;
  hasBalcony?: boolean;
  rent?: number | null;
  status: UnitStatus;
  areaWarning?: string;
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
    apiRequest<unknown>(`/properties${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiProperty>(res),
    ),
  get: (id: string) => apiRequest<ApiProperty>(`/properties/${id}`, { auth: "admin" }),
  create: (body: Partial<ApiProperty>) =>
    apiRequest<ApiProperty>("/properties/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Partial<ApiProperty>) =>
    apiRequest<ApiProperty>(`/properties/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) => apiRequest<ApiProperty>(`/properties/${id}`, { method: "DELETE", auth: "admin" }),
};

export const floorApi = {
  list: (params: ListParams & { status?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/floors${toQuery(params)}`, { auth: "admin" }).then((res) => toListResult<ApiFloor>(res)),
  get: (id: string) => apiRequest<ApiFloor>(`/floors/${id}`, { auth: "admin" }),
  create: (body: Partial<ApiFloor>) =>
    apiRequest<ApiFloor>("/floors/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Partial<ApiFloor>) =>
    apiRequest<ApiFloor>(`/floors/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) => apiRequest<ApiFloor>(`/floors/${id}`, { method: "DELETE", auth: "admin" }),
};

export const unitApi = {
  list: (params: ListParams & { status?: string; unitType?: string; floorId?: string } = {}) =>
    apiRequest<unknown>(`/units${toQuery(params)}`, { auth: "admin" }).then((res) => toListResult<ApiUnit>(res)),
  get: (id: string) => apiRequest<ApiUnit>(`/units/${id}`, { auth: "admin" }),
  create: (body: Partial<ApiUnit>) =>
    apiRequest<ApiUnit>("/units/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Partial<ApiUnit>) =>
    apiRequest<ApiUnit>(`/units/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) => apiRequest<ApiUnit>(`/units/${id}`, { method: "DELETE", auth: "admin" }),
};

/* ------------------------------------------------------------------ */
/* Property Requests                                                   */
/* ------------------------------------------------------------------ */

export type PropertyRequestStatus = "pending" | "approved" | "denied";

export interface ApiPropertyRequest {
  id: string;
  ownerId: string;
  note: string;
  status: PropertyRequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  consumedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const propertyRequestApi = {
  list: (params: ListParams & { status?: string; ownerId?: string } = {}) =>
    apiRequest<unknown>(`/property-requests${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiPropertyRequest>(res),
    ),
  create: (body: { note: string }) =>
    apiRequest<ApiPropertyRequest>("/property-requests/create", {
      method: "POST",
      body,
      auth: "admin",
    }),
  approve: (id: string) =>
    apiRequest<ApiPropertyRequest>(`/property-requests/${id}/approve`, {
      method: "PATCH",
      auth: "admin",
    }),
  deny: (id: string) =>
    apiRequest<ApiPropertyRequest>(`/property-requests/${id}/deny`, {
      method: "PATCH",
      auth: "admin",
    }),
};