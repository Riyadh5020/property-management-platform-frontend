import { useCallback, useEffect, useState } from "react";

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

export function useCollection(resource: string) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => setRows(readRows(resource));
    sync();
    setLoaded(true);
    return subscribe(resource, sync);
  }, [resource]);

  const create = useCallback(
    (values: Record<string, unknown>) => {
      const next: Row = { ...values, id: crypto.randomUUID() };
      writeRows(resource, [next, ...readRows(resource)]);
      return next;
    },
    [resource],
  );

  const update = useCallback(
    (id: string, values: Record<string, unknown>) => {
      writeRows(
        resource,
        readRows(resource).map((row) => (row.id === id ? { ...row, ...values, id } : row)),
      );
    },
    [resource],
  );

  const remove = useCallback(
    (id: string) => {
      writeRows(
        resource,
        readRows(resource).filter((row) => row.id !== id),
      );
    },
    [resource],
  );

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey(resource));
    }
    listeners.get(resource)?.forEach((fn) => fn());
    setRows(readRows(resource));
  }, [resource]);

  return { rows, loaded, create, update, remove, reset };
}

export function resetAllDemoData() {
  if (typeof window === "undefined") return;
  Object.keys(resources).forEach((key) => window.localStorage.removeItem(storageKey(key)));
  listeners.forEach((set) => set.forEach((fn) => fn()));
}

export function formatMoney(value: unknown) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return String(value ?? "");
  return `৳${num.toLocaleString("en-US")}`;
}
