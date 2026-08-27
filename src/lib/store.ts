import { useCallback, useEffect, useState } from "react";

import { adminApi, floorApi, propertyApi, unitApi } from "./api";
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
/* Live-backend resources (Property / Floor / Unit)                    */
/* ------------------------------------------------------------------ */

type ApiAdapter = {
  list: (params?: Record<string, unknown>) => Promise<{ items: Record<string, unknown>[]; total: number }>;
  create: (values: Record<string, unknown>) => Promise<Record<string, unknown>>;
  update: (id: string, values: Record<string, unknown>) => Promise<Record<string, unknown>>;
  remove: (id: string) => Promise<void>;
};

const apiAdapters: Record<string, ApiAdapter> = {
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
  ownerAccounts: {
    list: () =>
      adminApi.listAdmins().then((list) => {
        const items = list
          .filter((a) => a.role === "owner")
          .map((a) => ({
            ...a,
            displayLabel: `${[a.firstName, a.lastName].filter(Boolean).join(" ") || "Unnamed"} — ${a.email}`,
          })) as unknown as Record<string, unknown>[];
        return { items, total: items.length };
      }),
    create: async () => {
      throw new Error("Owner accounts are managed from Administrators, not here.");
    },
    update: async () => {
      throw new Error("Owner accounts are managed from Administrators, not here.");
    },
    remove: async () => {
      throw new Error("Owner accounts are managed from Administrators, not here.");
    },
  },
};

export function useCollection(resource: string, filters?: Record<string, unknown>) {
  const adapter = apiAdapters[resource];
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const { ready: authReady, admin } = useAuth();
  const filtersKey = JSON.stringify(filters ?? {});

  const refetch = useCallback(async () => {
    if (!adapter) return;
    const result = await adapter.list(filters);
    setRows(result.items as Row[]);
    setTotal(result.total);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, filtersKey]);

  useEffect(() => {
    if (adapter) {
      if (!authReady || !admin?.token) return;
      setIsFetching(true);
      refetch()
        .catch((err) => console.error(`Failed to load ${resource}`, err))
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
      await refetch();
      return;
    }
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey(resource));
    }
    listeners.get(resource)?.forEach((fn) => fn());
    setRows(readRows(resource));
  }, [resource, adapter, refetch]);

  return { rows, loaded, isFetching, total, create, update, remove, reset, apiBacked: Boolean(adapter) };
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