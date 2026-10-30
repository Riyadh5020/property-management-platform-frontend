import { useCallback, useEffect, useState } from "react";

import {
  adminApi,
  floorApi,
  propertyApi,
  recordApi,
  subscriptionPlanApi,
  unitApi,
  type BillingCycle,
  type SubscriptionPlanStatus,
} from "./api";
import { useAuth } from "./auth";
import { resources, type ResourceDef, type Row } from "./mock-data";

const STORAGE_PREFIX = "pms.data.";
const listeners = new Map<string, Set<() => void>>();

function storageKey(resource: string) {
  return `${STORAGE_PREFIX}${resource}`;
}

function withIds(rows: Record<string, unknown>[]): Row[] {
  return rows.map((row, index) => ({
    ...row,
    id: (row["id"] as string) ?? `${index + 1}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

export function readRows(resource: string): Row[] {
  const def: ResourceDef | undefined = resources[resource];
  if (typeof window === "undefined") return def ? withIds(def.seed) : [];
  const raw = window.localStorage.getItem(storageKey(resource));
  if (raw) {
    try {
      return JSON.parse(raw) as Row[];
    } catch {
      /* fall through to seed */
    }
  }
  const seeded = def ? withIds(def.seed) : [];
  window.localStorage.setItem(storageKey(resource), JSON.stringify(seeded));
  return seeded;
}

function writeRows(resource: string, rows: Row[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey(resource), JSON.stringify(rows));
  }
  listeners.get(resource)?.forEach((fn) => fn());
}

function subscribe(resource: string, fn: () => void) {
  const set = listeners.get(resource) ?? new Set<() => void>();
  set.add(fn);
  listeners.set(resource, set);
  return () => {
    set.delete(fn);
  };
}

/* ------------------------------------------------------------------ */
/* Live-backend resources (Property / Floor / Unit / Plans)            */
/* ------------------------------------------------------------------ */

type ApiAdapter = {
  list: (params?: Record<string, unknown>) => Promise<{ items: Record<string, unknown>[]; total: number }>;
  create: (values: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (id: string, values: Record<string, unknown>) => Promise<Record<string, unknown>>;
  remove: (id: string) => Promise<void>;
};

// Label shown in the "Subscription plan" dropdown, e.g. "Monthly — ৳4,900 (30 days)".
function planLabel(name: string, amount: number, durationDays: number) {
  const price = amount === 0 ? "Free" : `৳${amount.toLocaleString("en-US")}`;
  return `${name} — ${price} (${durationDays} days)`;
}

// Blank limit field = null = unlimited.
const limitVal = (x: unknown): number | null =>
  x === undefined || x === null || x === "" ? null : Number(x);

// Choice fields with a server default can be left out, but never sent empty.
const NOT_NULLABLE = ["status", "audience", "priority"];

function recordAdapter(kind: string): ApiAdapter {
  return {
    list: (params) => recordApi.list(kind, params ?? {}),
    create: (v) =>
      recordApi.create(kind, Object.fromEntries(Object.entries(v).filter(([, value]) => value !== ""))),
    update: (id, v) =>
      recordApi.update(
        kind,
        id,
        Object.fromEntries(
          Object.entries(v)
            .filter(([key, value]) => value !== "" || !NOT_NULLABLE.includes(key))
            .map(([key, value]) => [key, value === "" ? null : value]),
        ),
      ),
    remove: (id) => recordApi.remove(kind, id).then(() => undefined),
  };
}

const apiAdapters: Record<string, ApiAdapter> = {
  notices: recordAdapter("notices"),
  visitors: recordAdapter("visitors"),
  staff: recordAdapter("staff"),
  utilities: recordAdapter("utilities"),
  amenities: recordAdapter("amenities"),
  emergencyContacts: recordAdapter("emergencyContacts"),
  tickets: recordAdapter("tickets"),
  properties: {
    list: (params) =>
      propertyApi.list(params ?? {}) as unknown as Promise<{ items: Record<string, unknown>[]; total: number }>,
    create: (v) => propertyApi.create(v) as unknown as Promise<Record<string, unknown>>,
    update: (id, v) => propertyApi.update(id, v) as unknown as Promise<Record<string, unknown>>,
    remove: (id) => propertyApi.remove(id).then(() => undefined),
  },
  floors: {
    list: (params) =>
      floorApi.list(params ?? {}) as unknown as Promise<{ items: Record<string, unknown>[]; total: number }>,
    create: (v) => floorApi.create(v) as unknown as Promise<Record<string, unknown>>,
    update: (id, v) => floorApi.update(id, v) as unknown as Promise<Record<string, unknown>>,
    remove: (id) => floorApi.remove(id).then(() => undefined),
  },
  units: {
    list: (params) =>
      unitApi.list(params ?? {}) as unknown as Promise<{ items: Record<string, unknown>[]; total: number }>,
    create: (v) => unitApi.create(v) as unknown as Promise<Record<string, unknown>>,
    update: (id, v) => unitApi.update(id, v) as unknown as Promise<Record<string, unknown>>,
    remove: (id) => unitApi.remove(id).then(() => undefined),
  },
  subscriptions: {
    list: (params) =>
      subscriptionPlanApi.list(params ?? {}).then((res) => {
        const items = res.items.map((plan) => {
          const amount = Number(plan.amount); // pg returns NUMERIC as a string
          return {
            ...plan,
            amount,
            displayLabel: planLabel(plan.name, amount, plan.durationDays),
          };
        }) as unknown as Record<string, unknown>[];
        return { items, total: res.total };
      }),
    create: (v) => {
      const body: {
        name: string;
        billingCycle: BillingCycle;
        amount: number;
        status?: SubscriptionPlanStatus;
        maxProperties?: number | null;
        maxFloors?: number | null;
        maxManagers?: number | null;
      } = {
        name: String(v["name"] ?? ""),
        billingCycle: v["billingCycle"] as BillingCycle,
        amount: Number(v["amount"] ?? 0),
        maxProperties: limitVal(v["maxProperties"]),
        maxFloors: limitVal(v["maxFloors"]),
        maxManagers: limitVal(v["maxManagers"]),
      };

      if (v["status"]) body.status = v["status"] as SubscriptionPlanStatus;

      return subscriptionPlanApi.create(body) as unknown as Promise<Record<string, unknown>>;
    },
    update: (id, v) => {
      const body: {
        name?: string;
        billingCycle?: BillingCycle;
        amount?: number;
        status?: SubscriptionPlanStatus;
        maxProperties?: number | null;
        maxFloors?: number | null;
        maxManagers?: number | null;
      } = {};

      if (v["name"] !== undefined) body.name = String(v["name"]);
      if (v["billingCycle"] !== undefined) body.billingCycle = v["billingCycle"] as BillingCycle;
      if (v["amount"] !== undefined) body.amount = Number(v["amount"]);
      if (v["status"] !== undefined) body.status = v["status"] as SubscriptionPlanStatus;
      if ("maxProperties" in v) body.maxProperties = limitVal(v["maxProperties"]);
      if ("maxFloors" in v) body.maxFloors = limitVal(v["maxFloors"]);
      if ("maxManagers" in v) body.maxManagers = limitVal(v["maxManagers"]);

      return subscriptionPlanApi.update(id, body) as unknown as Promise<Record<string, unknown>>;
    },
    remove: (id) => subscriptionPlanApi.remove(id).then(() => undefined),
  },
  ownerAccounts: {
    list: () =>
      adminApi.listAdminsPaged({ role: "owner", limit: 200 }).then((res) => {
        const items = res.items.map((a) => ({
          ...a,
          displayLabel: `${[a.firstName, a.lastName].filter(Boolean).join(" ") || "Unnamed"} — ${a.email}`,
        })) as unknown as Record<string, unknown>[];
        return { items, total: res.total };
      }),
    create: async () => {
      throw new Error("Owner accounts are managed from the Users page, not here.");
    },
    update: async () => {
      throw new Error("Owner accounts are managed from the Users page, not here.");
    },
    remove: async () => {
      throw new Error("Owner accounts are managed from the Users page, not here.");
    },
  },
};

export function useCollection(resource: string, filters?: Record<string, unknown>) {
  const adapter = apiAdapters[resource];
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { ready: authReady, admin } = useAuth();
  const filtersKey = JSON.stringify(filters ?? {});

  const refetch = useCallback(async () => {
    if (!adapter) return;
    const result = await adapter.list(filters);
    setRows(result.items as Row[]);
    setTotal(result.total);
    setLoadError(null);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, filtersKey]);

  useEffect(() => {
    if (adapter) {
      if (!authReady || !admin?.token) return;
      setIsFetching(true);
      refetch()
        .catch((err: unknown) => {
          console.error(`Failed to load ${resource}`, err);
          setLoadError(err instanceof Error ? err.message : "unknown error");
          setLoaded(true);
        })
        .finally(() => setIsFetching(false));
      return;
    }
    const sync = () => setRows(readRows(resource));
    sync();
    setLoaded(true);
    return subscribe(resource, sync);
  }, [resource, adapter, refetch, authReady, admin?.token]);

  const create = useCallback(
    async (values: Record<string, unknown>) => {
      if (adapter) {
        const created = await adapter.create(values);
        await refetch();
        return created as Row;
      }
      const next: Row = { ...values, id: crypto.randomUUID() };
      writeRows(resource, [next, ...readRows(resource)]);
      return next;
    },
    [resource, adapter, refetch],
  );

  const update = useCallback(
    async (id: string, values: Record<string, unknown>) => {
      if (adapter) {
        const updated = await adapter.update(id, values);
        await refetch();
        return updated as Row;
      }
      const next = readRows(resource).map((row) => (row.id === id ? { ...row, ...values, id } : row));
      writeRows(resource, next);
      return next.find((row) => row.id === id) as Row;
    },
    [resource, adapter, refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      if (adapter) {
        await adapter.remove(id);
        await refetch();
        return;
      }
      writeRows(
        resource,
        readRows(resource).filter((row) => row.id !== id),
      );
    },
    [resource, adapter, refetch],
  );

  const reset = useCallback(async () => {
    if (adapter) {
      await refetch().catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "unknown error");
      });
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey(resource));
    }
    listeners.get(resource)?.forEach((fn) => fn());
    setRows(readRows(resource));
  }, [resource, adapter, refetch]);

  return { rows, loaded, loadError, isFetching, total, create, update, remove, reset, apiBacked: Boolean(adapter) };
}

export function resetAllDemoData() {
  if (typeof window === "undefined") return;
  Object.keys(resources).forEach((key) => {
    if (!apiAdapters[key]) window.localStorage.removeItem(storageKey(key));
  });
  listeners.forEach((set) => set.forEach((fn) => fn()));
}

export function formatMoney(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return String(value ?? "");
  return `৳${num.toLocaleString("en-US")}`;
}