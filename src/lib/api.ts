

const DEFAULT_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ??
  "http://localhost:8000/api/v1";

const BASE_URL_KEY = "pms.apiBaseUrl";
const ADMIN_REFRESH_KEY = "pms.adminRefreshToken";
const isBrowser = () => typeof window !== "undefined";

let inMemoryAdminToken: string | null = null;
export function getApiBaseUrl(): string {
  if (!isBrowser() || import.meta.env.PROD) return DEFAULT_BASE_URL;
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

const FIELD_LABELS: Record<string, string> = {
  role: "Role",
  status: "Status",
  state: "State",
  email: "Email",
  password: "Password",
  firstName: "First name",
  lastName: "Last name",
  phoneNumber: "Phone number",
  price: "Price",
  address: "Address",
  city: "City",
  country: "Country",
  postalCode: "Postal code",
  name: "Name",
    planId: "Subscription plan",
  billingCycle: "Billing cycle",
  amount: "Amount",
};

function humanizeField(path: string): string {
  const key = path.replace(/^body\./, "").split(".").pop() ?? path;
  return FIELD_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

function humanizeIssue(path: string, msg: string): string {
  const field = humanizeField(path);
  if (/invalid enum value/i.test(msg)) return `${field} is not a valid option — please choose one from the list.`;
  if (/at least 1 character/i.test(msg)) return `${field} is required.`;
  const minMatch = msg.match(/at least (\d+) character/i);
  if (minMatch) return `${field} must be at least ${minMatch[1]} characters.`;
  if (/^invalid email$/i.test(msg.trim())) return "Please enter a valid email address.";
  if (/invalid uuid|invalid url/i.test(msg)) return `${field} looks invalid.`;
  // Not a recognized raw Zod pattern — the backend already wrote this in
  // plain English (e.g. "Email already exists"), so use it as-is.
  return msg;
}

type Auth = "none" | "admin";

export interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: Auth;
  signal?: AbortSignal;
}

let refreshInFlight: Promise<string | null> | null = null;

export async function tryRefreshAdminToken(): Promise<string | null> {  if (!isBrowser()) return null;
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
            } catch (err) {
        // only drop the session if the server actually rejected the token
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          tokenStore.setAdmin(null, null);
        }
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
  if (
    auth === "admin" &&
    !tokenStore.admin &&
    isBrowser() &&
    window.localStorage.getItem(ADMIN_REFRESH_KEY)
  ) {
    await tryRefreshAdminToken();
  }
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

  let technicalMessage =
    typeof rawMessage === "string" && rawMessage ? rawMessage : `Request failed with status ${response.status}`;
  let message = technicalMessage;

  if (Array.isArray(errors) && errors.length > 0) {
    const parsed = errors
      .map((e) => {
        const path = e && typeof e === "object" ? String((e as Record<string, unknown>)["path"] ?? "") : "";
        const msg = e && typeof e === "object" ? String((e as Record<string, unknown>)["message"] ?? "") : "";
        return { path, msg };
      })
      .filter((e) => e.msg);
    if (parsed.length > 0) {
      technicalMessage = parsed.map((e) => (e.path ? `${e.path}: ${e.msg}` : e.msg)).join("; ");
      message = parsed.map((e) => humanizeIssue(e.path, e.msg).replace(/\.$/, "")).join("; ") + ".";
    }
} else if (response.status === 401 && auth === "admin") {
      message = "You're not signed in, or your session has expired. Please log in again.";
  } else if (response.status === 403) {
    message = "You don't have permission to do that.";
  } else if (response.status === 404) {
    message = "That item couldn't be found.";
  } else if (response.status === 429) {
    message = "Too many attempts. Please wait a moment and try again.";
  } else if (response.status >= 500) {
    message = "Something went wrong on our end. Please try again in a moment.";
  }

  console.error("[api]", technicalMessage, payload);
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
export interface ManagerPermissions {
  tenants: boolean;
  rent: boolean;
  expenses: boolean;
  maintenance: boolean;
}



export interface ApiAdmin {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  status?: AccountStatus;
  role?: AdminRole;
    ownerId?: string | null;
      permissions?: ManagerPermissions | null;
      propertyCount?: number;
     ownerName?: string | null;   
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
  listAdminsPaged: (
    params: ListParams & { role?: AdminRole; status?: AccountStatus } = {},
  ) =>
    apiRequest<unknown>(`/admins${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiAdmin>(res),
    ),
  createAdmin: (body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber?: string | null;
    role: AdminRole;
    ownerId?: string | null;
    permissions?: ManagerPermissions | null;
  }) => apiRequest<ApiAdmin>("/admins/create", { method: "POST", body, auth: "admin" }),
  getAdmin: (id: string) => apiRequest<ApiAdmin>(`/admins/${id}`, { auth: "admin" }),
   updateAdmin: (
    id: string,
    body: { firstName: string; lastName: string; email: string; phoneNumber?: string | null; role?: AdminRole; permissions?: ManagerPermissions | null },
  ) => apiRequest<ApiAdmin>(`/admins/${id}`, { method: "PUT", body, auth: "admin" }),
    updateAdminStatus: (id: string, status: AccountStatus) =>
    apiRequest<ApiAdmin>(`/admins/${id}/status`, { method: "PATCH", body: { status }, auth: "admin" }),
  getManagerProperties: (id: string) =>
    apiRequest<{ propertyIds: string[] }>(`/admins/${id}/properties`, { auth: "admin" }),
   setManagerProperties: (id: string, propertyIds: string[]) =>
    apiRequest<{ propertyIds: string[] }>(`/admins/${id}/properties`, {
      method: "PUT",
      body: { propertyIds },
      auth: "admin",
    }),

  resetUserPassword: (id: string, newPassword: string) =>
    apiRequest<null>(`/admins/${id}/reset-password`, {
      method: "POST",
      body: { newPassword },
      auth: "admin",
    }),

};

/* ------------------------------------------------------------------ */
/* Property / Floor / Unit — literal types must match backend enums    */
/* ------------------------------------------------------------------ */

export type PropertyType = "apartment" | "house" | "villa" | "office" | "shop" | "land";
export type PropertyStatus = "draft" | "active" | "inactive" | "rented";
export type PropertyListingType = "rent";

export type FloorStatus = "draft" | "active" | "inactive" | "maintenance";

export type UnitType = "apartment" | "shop" | "office" | "parking" | "bachelor" | "own_use" | "common";
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

  // Add these
  ownerName?: string | null;
  ownerEmail?: string | null;
  floorCount?: number | null;

  planId?: string | null;
  planName?: string | null;
  subscriptionStartsAt?: string | null;
  subscriptionEndsAt?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  createdAt?: string;
  updatedAt?: string;
}
// export interface ApiProperty {
//   id: string;
//   title: string;
//   buildingNumber?: string | null;
//   description?: string | null;
//   type: PropertyType;
//   listingType: PropertyListingType;
//   price: number;
//   currency?: string;
//   floors?: number | null;
//   totalUnits?: number | null;
//   totalArea?: number | null;
//   address: string;
//   city: string;
//   state?: string | null;
//   country: string;
//   postalCode?: string | null;
//   latitude?: number | null;
//   longitude?: number | null;
//   amenities?: Record<string, unknown> | null;
//   images?: string[] | null;
//   status: PropertyStatus;
//   ownerId: string;
//     planId?: string | null;
//   subscriptionStartsAt?: string | null;
//   subscriptionEndsAt?: string | null;
//   subscriptionStatus?: SubscriptionStatus | null;
//   createdAt?: string;
//   updatedAt?: string;
// }
export type FloorType = "residential" | "commercial" | "basement" | "parking" | "rooftop" | "ground";
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
    floorType?: FloorType | null;
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

export interface ApiSubscriptionHistory {
  id: string;
  propertyId: string;
  planId: string | null;
  previousPlanId: string | null;
  action: "create" | "renew" | "change_plan" | "extend" | "discount" | "trial";
  previousEndsAt: string | null;
  newEndsAt: string | null;
  daysAdded: number | null;
  amount: number | null;
  discountAmount: number | null;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export const propertyApi = {
  list: (params: ListParams & { status?: string; type?: string; listingType?: string; ownerId?: string; subscription?: string } = {}) =>    apiRequest<unknown>(`/properties${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiProperty>(res),
    ),
  get: (id: string) => apiRequest<ApiProperty>(`/properties/${id}`, { auth: "admin" }),
  create: (body: Partial<ApiProperty>) =>
    apiRequest<ApiProperty>("/properties/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Partial<ApiProperty>) =>
    apiRequest<ApiProperty>(`/properties/${id}`, { method: "PUT", body, auth: "admin" }),
remove: (id: string) => apiRequest<ApiProperty>(`/properties/${id}`, { method: "DELETE", auth: "admin" }),
  setSubscription: (id: string, planId: string) =>
    apiRequest<ApiProperty>(`/properties/${id}/subscription`, {
      method: "PATCH",
      body: { planId },
      auth: "admin",
    }),
      subscriptionHistory: (id: string) =>
    apiRequest<unknown>(`/properties/${id}/subscription-history?limit=50`, { auth: "admin" }).then((res) =>
      toListResult<ApiSubscriptionHistory>(res),
    ),
  adjustSubscription: (
    id: string,
    body:
      | { action: "extend"; days: number; note?: string }
      | { action: "discount"; planId: string; discountAmount: number; note?: string },
  ) =>
    apiRequest<ApiProperty>(`/properties/${id}/subscription/adjust`, {
      method: "PATCH",
      body,
      auth: "admin",
    }),
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
    copyLayout: (targetFloorId: string, sourceFloorId: string) =>
    apiRequest<{ items: ApiUnit[]; areaWarning?: string }>(`/floors/${targetFloorId}/copy-layout`, {
      method: "POST",
      body: { sourceFloorId },
      auth: "admin",
    }),
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
    bulkCreate: (body: { floorId: string; units: Partial<ApiUnit>[] }) =>
    apiRequest<{ items: ApiUnit[]; areaWarning?: string }>("/units/bulk", {
      method: "POST",
      body,
      auth: "admin",
    }),
};

/* ------------------------------------------------------------------ */
/* Property Requests                                                   */
/* ------------------------------------------------------------------ */

export type PropertyRequestStatus = "pending" | "approved" | "denied"| "cancelled";

export interface ApiPropertyRequest {
  id: string;
  ownerId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
    floorCount?: number;
    note?: string | null;
  title?: string | null;
  buildingNumber?: string | null;
  floors?: number | null;
  totalUnits?: number | null;
  totalArea?: number | string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
    type?: PropertyType | null;
  status: PropertyRequestStatus;
  rejectReason?: string | null;
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
   create: (body: {
    title: string;
    buildingNumber?: string | null;
    floors: number;
    totalUnits?: number | null;
    totalArea?: number | null;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string | null;
    type?: PropertyType;
  }) =>
    apiRequest<ApiPropertyRequest>("/property-requests/create", {
      method: "POST",
      body,
      auth: "admin",
    }),
  approve: (id: string, planId: string) =>
    apiRequest<ApiPropertyRequest>(`/property-requests/${id}/approve`, {
      method: "PATCH",
      body: { planId },
      auth: "admin",
    }),
    deny: (id: string, reason: string) =>
    apiRequest<ApiPropertyRequest>(`/property-requests/${id}/deny`, {
      method: "PATCH",
      body: { reason },
      auth: "admin",
    }),
  cancel: (id: string) =>
    apiRequest<ApiPropertyRequest>(`/property-requests/${id}/cancel`, {
      method: "PATCH",
      auth: "admin",
    }),
  edit: (id: string, body: Partial<Omit<ApiPropertyRequest, "id" | "status">>) =>
    apiRequest<ApiPropertyRequest>(`/property-requests/${id}`, { method: "PUT", body, auth: "admin" }),
};
export type FloorRequestStatus = "pending" | "approved" | "denied"| "cancelled";

export interface ApiFloorRequest {
  id: string;
  propertyId: string;
  ownerId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
    floorCount?: number;
  requestedFloorCount: number;
  rejectReason?: string | null;
  note: string;
  status: FloorRequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  consumedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const floorRequestApi = {
  list: (params: ListParams & { status?: string; ownerId?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/floor-requests${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiFloorRequest>(res),
    ),

  create: (body: { propertyId: string; requestedFloorCount: number; note: string }) =>
    apiRequest<ApiFloorRequest>("/floor-requests/create", {
      method: "POST",
      body,
      auth: "admin",
    }),

  approve: (id: string) =>
    apiRequest<ApiFloorRequest>(`/floor-requests/${id}/approve`, {
      method: "PATCH",
      auth: "admin",
    }),

   deny: (id: string, reason: string) =>
    apiRequest<ApiFloorRequest>(`/floor-requests/${id}/deny`, {
      method: "PATCH",
      body: { reason },
      auth: "admin",
    }),
  cancel: (id: string) =>
    apiRequest<ApiFloorRequest>(`/floor-requests/${id}/cancel`, {
      method: "PATCH",
      auth: "admin",
    }),
  edit: (id: string, body: { requestedFloorCount?: number; note?: string }) =>
    apiRequest<ApiFloorRequest>(`/floor-requests/${id}`, { method: "PUT", body, auth: "admin" }),
};



/* ------------------------------------------------------------------ */
/* Subscription plans                                                  */
/* ------------------------------------------------------------------ */

export type BillingCycle = "trial" | "monthly" | "quarterly" | "yearly";
export type SubscriptionPlanStatus = "active" | "inactive";
export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";

export interface ApiSubscriptionPlan {
  id: string;
  name: string;
  billingCycle: BillingCycle;
  amount: number | string; // pg returns NUMERIC as a string, e.g. "4900.00"
  durationDays: number;
    maxProperties?: number | null;
  maxFloors?: number | null;
  maxManagers?: number | null;
  status: SubscriptionPlanStatus;
  createdAt?: string;
  updatedAt?: string;
}

export const subscriptionPlanApi = {
  list: (params: ListParams & { status?: string } = {}) =>
    apiRequest<unknown>(`/subscription-plans${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiSubscriptionPlan>(res),
    ),
  get: (id: string) => apiRequest<ApiSubscriptionPlan>(`/subscription-plans/${id}`, { auth: "admin" }),
  create: (body: { name: string; billingCycle: BillingCycle; amount: number; status?: SubscriptionPlanStatus; maxProperties?: number | null; maxFloors?: number | null; maxManagers?: number | null }) =>
    apiRequest<ApiSubscriptionPlan>("/subscription-plans/create", { method: "POST", body, auth: "admin" }),
  update: (
    id: string,
    body: Partial<
      Pick<
        ApiSubscriptionPlan,
        "name" | "billingCycle" | "status" | "maxProperties" | "maxFloors" | "maxManagers"
      >
    > & { amount?: number },
  ) =>
    apiRequest<ApiSubscriptionPlan>(`/subscription-plans/${id}`, {
      method: "PUT",
      body,
      auth: "admin",
    }),
  remove: (id: string) =>
    apiRequest<ApiSubscriptionPlan>(`/subscription-plans/${id}`, { method: "DELETE", auth: "admin" }),
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export interface ApiDashboardStats {
  totals: { properties: number; floors: number; units: number; managers: number };
  unitsByStatus: { status: string; count: number }[];
  expiringSubscriptions: {
    id: string;
    title: string;
    subscriptionEndsAt: string;
    planName: string | null;
    daysLeft: number;
  }[];
  pendingRequests: { property: number; floor: number } | null;
}

export const dashboardApi = {
  stats: () => apiRequest<ApiDashboardStats>("/dashboard/stats", { auth: "admin" }),
};

export interface ApiReportProperty {
  id: string;
  title: string;
  floors: number;
  units: number;
  occupied: number;
  vacant: number;
  reserved: number;
  maintenance: number;
  rentRoll: number;
  occupiedRent: number;
}

export const reportApi = {
  stats: () => apiRequest<{ properties: ApiReportProperty[] }>("/dashboard/reports", { auth: "admin" }),
};/* ------------------------------------------------------------------ */
/* Tenants                                                             */
/* ------------------------------------------------------------------ */

export type TenantStatus = "active" | "notice_served" | "moved_out";
export type TenantRole = "primary" | "co_tenant";
export type IdDocType = "nid" | "passport" | "driving_licence";

export interface ApiTenant {
  id: string;
  propertyId: string;
  unitId: string | null;
  fullName: string;
  phone: string | null;
  email: string | null;
  idDocType: IdDocType | null;
  idDocNumber: string | null;
  role: TenantRole;
  moveInDate: string | null;
  moveOutDate: string | null;
  status: TenantStatus;
  occupation?: string | null;
  permanentAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  familyMembers?: number | null;
  notes?: string | null;
  propertyTitle?: string | null;
  unitCode?: string | null;
  createdAt?: string;
}

export const tenantApi = {
  list: (params: ListParams & { status?: string; propertyId?: string; unitId?: string } = {}) =>
    apiRequest<unknown>(`/tenants${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiTenant>(res),
    ),
  create: (body: Record<string, unknown>) =>
    apiRequest<ApiTenant>("/tenants/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<ApiTenant>(`/tenants/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) => apiRequest<ApiTenant>(`/tenants/${id}`, { method: "DELETE", auth: "admin" }),
};

/* ------------------------------------------------------------------ */
/* Leases                                                              */
/* ------------------------------------------------------------------ */

export type LeaseStatus = "draft" | "active" | "expired" | "terminated";

export interface ApiLease {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  agreementNo: string | null;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  escalationPercent: number;
  noticePeriodDays: number;
  status: LeaseStatus;
  propertyTitle?: string | null;
  unitCode?: string | null;
  tenantName?: string | null;
}

export const leaseApi = {
  list: (params: ListParams & { status?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/leases${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiLease>(res),
    ),
  create: (body: Record<string, unknown>) =>
    apiRequest<ApiLease>("/leases/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<ApiLease>(`/leases/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) => apiRequest<ApiLease>(`/leases/${id}`, { method: "DELETE", auth: "admin" }),
};

/* ------------------------------------------------------------------ */
/* Invoices & payments                                                 */
/* ------------------------------------------------------------------ */

export type InvoiceStatus = "unpaid" | "partial" | "paid" | "void";
export type PaymentMethod = "cash" | "bank" | "bkash" | "nagad" | "other";

export interface ApiInvoice {
  id: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  leaseId: string;
  invoiceNo: string;
  billingMonth: string;
  dueDate: string;
  rentAmount: number;
  utilitiesAmount: number;
  penaltyAmount: number;
  otherAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  note: string | null;
  propertyTitle?: string | null;
  unitCode?: string | null;
  tenantName?: string | null;
  isOverdue?: boolean;
}

export interface ApiPayment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  paidOn: string;
  reversesPaymentId: string | null;
  note: string | null;
  createdAt: string;
}

export const invoiceApi = {
  list: (params: ListParams & { status?: string; month?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/invoices${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiInvoice>(res),
    ),
  get: (id: string) =>
    apiRequest<{ invoice: ApiInvoice; payments: ApiPayment[] }>(`/invoices/${id}`, { auth: "admin" }),
  generate: (body: { month: string; propertyId?: string; dueDay?: number }) =>
    apiRequest<{ created: number; skipped: number }>("/invoices/generate", {
      method: "POST",
      body,
      auth: "admin",
    }),
  update: (
    id: string,
    body: { utilitiesAmount?: number; penaltyAmount?: number; otherAmount?: number; dueDate?: string; note?: string | null },
  ) => apiRequest<ApiInvoice>(`/invoices/${id}`, { method: "PUT", body, auth: "admin" }),
  addPayment: (
    id: string,
    body: { amount: number; method: PaymentMethod; paidOn: string; reference?: string | null; note?: string | null },
  ) =>
    apiRequest<{ invoice: ApiInvoice; payment: ApiPayment }>(`/invoices/${id}/payments`, {
      method: "POST",
      body,
      auth: "admin",
    }),
  reverse: (id: string, paymentId: string, note: string) =>
    apiRequest<{ invoice: ApiInvoice; payment: ApiPayment }>(
      `/invoices/${id}/payments/${paymentId}/reverse`,
      { method: "POST", body: { note }, auth: "admin" },
    ),
  void: (id: string) => apiRequest<ApiInvoice>(`/invoices/${id}/void`, { method: "PATCH", auth: "admin" }),
};

/* ------------------------------------------------------------------ */
/* Maintenance                                                         */
/* ------------------------------------------------------------------ */

export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "in_progress" | "completed" | "cancelled";
export type MaintenanceCategory = "tenant_request" | "preventive" | "common_area";
export type MaintenanceApprovalStatus = "pending" | "approved" | "rejected";

export interface ApiMaintenance {
  id: string;
  propertyId: string;
  unitId: string | null;
  title: string;
  description: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignee: string | null;
  scheduledFor: string | null;
  completedOn: string | null;
  cost: number;
  approvalStatus: MaintenanceApprovalStatus;
  ownerNote: string | null;
  reviewedAt: string | null;
  expenseId: string | null;
  propertyTitle?: string | null;
  unitCode?: string | null;
}

export const maintenanceApi = {
  list: (
    params: ListParams & {
      status?: string;
      priority?: string;
      approvalStatus?: string;
      propertyId?: string;
    } = {},
  ) =>
    apiRequest<unknown>(`/maintenance${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiMaintenance>(res),
    ),
  create: (body: Record<string, unknown>) =>
    apiRequest<ApiMaintenance>("/maintenance/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<ApiMaintenance>(`/maintenance/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) =>
    apiRequest<ApiMaintenance>(`/maintenance/${id}`, { method: "DELETE", auth: "admin" }),
  // Owner/superAdmin approves or rejects a manager's request (a note is required to reject).
  review: (id: string, body: Record<string, unknown>) =>
    apiRequest<ApiMaintenance>(`/maintenance/${id}/review`, {
      method: "PATCH",
      body,
      auth: "admin",
    }),
};

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export type ExpenseCategory = "utilities" | "maintenance" | "salary" | "supplies" | "tax" | "other";
export type ExpenseStatus = "paid" | "pending";

export interface ApiExpense {
  id: string;
  propertyId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  paidBy: string | null;
  status: ExpenseStatus;
  notes: string | null;
  propertyTitle?: string | null;
}

export const expenseApi = {
  list: (
    params: ListParams & {
      status?: string; category?: string; propertyId?: string; from?: string; to?: string;
    } = {},
  ) =>
    apiRequest<unknown>(`/expenses${toQuery(params)}`, { auth: "admin" }).then((res) => {
      const list = toListResult<ApiExpense>(res);
      const summary =
        res && typeof res === "object"
          ? ((res as Record<string, unknown>)["summary"] as { totalAmount?: number } | undefined)
          : undefined;
      return { ...list, totalAmount: Number(summary?.totalAmount ?? 0) };
    }),
  create: (body: Record<string, unknown>) =>
    apiRequest<ApiExpense>("/expenses/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<ApiExpense>(`/expenses/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) => apiRequest<ApiExpense>(`/expenses/${id}`, { method: "DELETE", auth: "admin" }),
};

/* ------------------------------------------------------------------ */
/* Parking                                                             */
/* ------------------------------------------------------------------ */

export type ParkingType = "resident" | "visitor" | "staff";
export type ParkingStatus = "free" | "assigned" | "blocked";

export interface ApiParking {
  id: string;
  propertyId: string;
  slotNumber: string;
  slotType: ParkingType;
  unitId: string | null;
  vehicleNumber: string | null;
  monthlyFee: number;
  status: ParkingStatus;
  propertyTitle?: string | null;
  unitCode?: string | null;
}

// Notices, visitors, staff, utilities, amenities, emergency contacts and support tickets.
export const recordApi = {
  list: (kind: string, params: ListParams & { status?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/records/${kind}${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<Record<string, unknown>>(res),
    ),
  create: (kind: string, body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/records/${kind}`, { method: "POST", body, auth: "admin" }),
  update: (kind: string, id: string, body: Record<string, unknown>) =>
    apiRequest<Record<string, unknown>>(`/records/${kind}/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (kind: string, id: string) =>
    apiRequest<unknown>(`/records/${kind}/${id}`, { method: "DELETE", auth: "admin" }),
};

export const parkingApi = {
  list: (params: ListParams & { status?: string; slotType?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/parking${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiParking>(res),
    ),
  create: (body: Record<string, unknown>) =>
    apiRequest<ApiParking>("/parking/create", { method: "POST", body, auth: "admin" }),
  update: (id: string, body: Record<string, unknown>) =>
    apiRequest<ApiParking>(`/parking/${id}`, { method: "PUT", body, auth: "admin" }),
  remove: (id: string) =>
    apiRequest<ApiParking>(`/parking/${id}`, { method: "DELETE", auth: "admin" }),
};

// flat status API for dashboard and reports
export interface ApiFlat {
  unitId: string;
  unitCode: string;
  floorNumber: number;
  propertyId: string;
  propertyTitle: string;
  occupancy: "occupied" | "reserved" | "maintenance" | "vacant";
  tenantName: string | null;
  leaseEnd: string | null;
  openMaintenance: number | null;
  overdueInvoices: number | null;
}

// Fields the backend withheld because the manager lacks the matching permission (sent as null).
export type FlatRestrictedField = "tenantName" | "leaseEnd" | "overdueInvoices" | "openMaintenance";

export const flatStatusApi = {
  list: (params: ListParams & { occupancy?: string; propertyId?: string } = {}) =>
    apiRequest<unknown>(`/flat-status${toQuery(params)}`, { auth: "admin" }).then((res) => {
      const restricted =
        res && typeof res === "object" ? (res as Record<string, unknown>)["restrictedFields"] : [];
      return {
        ...toListResult<ApiFlat>(res),
        restrictedFields: (Array.isArray(restricted) ? restricted : []) as FlatRestrictedField[],
      };
    }),
};

// Activity log (owner: own properties; superAdmin: everything). Read-only history of changes.
export interface ApiAuditLog {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  summary: string;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  createdAt: string;
}

export const auditLogApi = {
  list: (
    params: ListParams & { entityType?: string; propertyId?: string; actorId?: string } = {},
  ) =>
    apiRequest<unknown>(`/audit-logs${toQuery(params)}`, { auth: "admin" }).then((res) =>
      toListResult<ApiAuditLog>(res),
    ),
};
