import { AppShell, PageHeader } from "@/components/app-shell";
import { SubscriptionAlerts } from "@/components/subscription-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { propertyApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { resources, type FieldDef, type Row } from "@/lib/mock-data";
import { formatMoney, useCollection } from "@/lib/store";
import { Link } from "@tanstack/react-router";
import { LayoutGrid, List, Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
const POSITIVE = ["active", "paid", "signed", "occupied", "completed", "settled", "available", "on duty", "assigned", "checked out"];
const WARN = ["pending", "reserved", "partially paid", "in progress", "notice served", "sent for signature", "billed", "off duty", "free", "inside", "trial"];
const BAD = ["overdue", "unpaid", "under maintenance", "cancelled", "denied", "on hold", "blocked", "closed", "moved out", "on leave", "expired"];

function statusVariant(value: string): "default" | "secondary" | "destructive" | "outline" {
  const v = value.toLowerCase();
  if (POSITIVE.includes(v)) return "default";
  if (WARN.includes(v)) return "secondary";
  if (BAD.includes(v)) return "destructive";
  return "outline";
}

function daysLeft(endsAt: unknown): number | null {
  if (!endsAt) return null;
  const ms = new Date(String(endsAt)).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.ceil(ms / 86_400_000);
}

function SubscriptionDays({ endsAt }: { endsAt: unknown }) {
  const d = daysLeft(endsAt);
  if (d === null) return <Badge variant="outline">No subscription</Badge>;
  if (d <= 0) return <Badge variant="destructive">Expired</Badge>;
  const variant = d <= 7 ? "destructive" : d <= 30 ? "secondary" : "default";
  return <Badge variant={variant}>{d} day{d === 1 ? "" : "s"} left</Badge>;
}





function renderCell(field: FieldDef, value: unknown, resolveRef?: (id: unknown) => string | null) {
if (field.key === "subscriptionEndsAt") return <SubscriptionDays endsAt={value} />;

  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (field.type === "boolean") {
    return <Badge variant={value ? "default" : "outline"}>{value ? "Yes" : "No"}</Badge>;
  }
  if (field.type === "date") return String(value).slice(0, 10);
  if (field.type === "money") return formatMoney(value);
  if (field.type === "entity-select") return resolveRef?.(value) ?? String(value);
  if (field.badge) return <Badge variant={statusVariant(String(value))}>{String(value)}</Badge>;
  return String(value);
}

function emptyValues(fields: FieldDef[]) {
  const values: Record<string, string> = {};
  fields.forEach((f) => {
    values[f.key] = "";
  });
  return values;
}
const SECTION_ORDER = ["Basics", "Structure", "Location", "Ownership", "Notes"];
const sectionRank = (f: FieldDef) => (f.section ? SECTION_ORDER.indexOf(f.section) : -1);
export function ResourcePage({
  resource,
  prefillValues,
  onPrefillConsumed,
  fixedParentId,
  fixedOwnerId,
}: {
  resource: string;
  prefillValues?: Record<string, string> | null;
  onPrefillConsumed?: () => void;
  fixedParentId?: string | undefined;
  fixedOwnerId?: string | undefined;
}) {
  const def = resources[resource]!;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const [parentFilter, setParentFilter] = useState(fixedParentId ?? "");  const parentFilterField =
    resource === "floors" ? "propertyId" : resource === "units" ? "floorId" : null;

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const backendFilters = def.apiBacked
    ? {
        search: debouncedQuery || undefined,
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(parentFilterField ? { [parentFilterField]: parentFilter || undefined } : {}),
        ...(fixedOwnerId ? { ownerId: fixedOwnerId } : {}),
      }
    : undefined;

  const { rows, create, update, remove, reset, apiBacked, loaded, isFetching, total } = useCollection(
    resource,
    backendFilters,
  );

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, statusFilter, parentFilter]);

  useEffect(() => {
    if (!prefillValues) return;
    setEditing(null);
    setValues({ ...emptyValues(def.fields), ...prefillValues });
    setOpen(true);
    onPrefillConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillValues]);

  const { admin } = useAuth();
  const role = admin?.admin?.role;

  const refField = def.fields.find((f) => f.type === "entity-select");
  const { rows: refRows } = useCollection(refField?.sourceResource ?? "__none__");

  // Second entity-select (e.g. subscription plan on properties). It must be
  // declared after the main reference field (owner) in mock-data.ts.
  const planField = def.fields.find((f) => f.type === "entity-select" && f.key !== refField?.key);
  const { rows: planRowsAll } = useCollection(planField?.sourceResource ?? "__none__");
  const planRows = planRowsAll.filter((r) => String(r["status"]) !== "inactive");

  // "own row" detection:
  // - properties: compare ownerId directly against the signed-in admin.
  // - floors/units: their entity-select parent list (properties / floors) is
  //   already scoped server-side to what this admin can see. If the row's
  //   parent id shows up in refRows, it's theirs.
  const isOwnRow = (row: Row) => {
    if (role !== "owner") return false;
    if (resource === "properties") return row["ownerId"] === admin?.admin?.id;
    if (refField) return refRows.some((r) => r.id === row[refField.key]);
    return false;
  };

  const canCreate = role === "superAdmin" || (resource === "units" && role === "owner");

  const canDeleteRow = (row: Row) =>
    role === "superAdmin" || (resource === "units" && role === "owner" && isOwnRow(row));

const canEditRow = (row: Row) =>
  role === "superAdmin" || (role === "owner" && resource !== "floors" && isOwnRow(row));
  const [editing, setEditing] = useState<Row | null>(null);
  const editingAsRestrictedOwner = role === "owner" && editing !== null;
  const fieldLocked = (f: FieldDef) => editingAsRestrictedOwner && !f.ownerEditable;

  // tableOnly fields are display-only; createOnly fields are hidden when editing.
  const isFormField = (f: FieldDef) => !f.tableOnly && !(editing && f.createOnly);

  const [open, setOpen] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [newPlanId, setNewPlanId] = useState("");
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(def.fields));
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const columns = def.fields.filter((f) => f.inTable);

  const refLabel = (id: unknown) => {
    if (!refField || !id) return null;
    const match = refRows.find((r) => r.id === id);
    return match ? String(match[refField.labelKey ?? "name"] ?? id) : String(id);
  };
  const statusField = def.fields.find((f) => f.key === "status" && f.type === "select");

  const filtered = useMemo(() => {
    if (apiBacked) return rows; // backend already applied search + status
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => def.fields.some((f) => String(row[f.key] ?? "").toLowerCase().includes(q)));
  }, [rows, query, def.fields, apiBacked]);

     const openCreate = () => {
    setShowAdvanced(false);
    setEditing(null);
     setValues({
      ...emptyValues(def.fields),
      ...(fixedParentId && parentFilterField ? { [parentFilterField]: fixedParentId } : {}),
      ...(fixedOwnerId ? { ownerId: fixedOwnerId } : {}),
    });
    setOpen(true);
  };

  const openEdit = (row: Row) => {
    const next = emptyValues(def.fields);
    def.fields.forEach((f) => {
      next[f.key] = row[f.key] === undefined || row[f.key] === null ? "" : String(row[f.key]);
    });
        setShowAdvanced(false);

    setEditing(row);
    setValues(next);
    setOpen(true);
  };

  const submit = async () => {
    const missing = def.fields.filter(
      (f) => isFormField(f) && f.required && !fieldLocked(f) && !String(values[f.key] ?? "").trim(),
    );
    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    try {
      const payload: Record<string, unknown> = {};

      def.fields.forEach((f) => {
        if (!isFormField(f) || fieldLocked(f)) return;
        const raw = values[f.key] ?? "";
        if ((f.type === "number" || f.type === "money") && raw === "" && !f.required) {
          if (editing) payload[f.key] = null;
          return;
        }
        payload[f.key] =
          f.type === "number" || f.type === "money"
            ? Number(raw)
            : f.type === "boolean"
              ? raw === "true"
              : raw;
      });

      const result = editing ? await update(editing.id, payload) : await create(payload);
      toast.success(`${def.singular} ${editing ? "updated" : "created"}`);

      const warning = (result as (Row & { areaWarning?: string }) | undefined)?.areaWarning;
      if (warning) toast.warning(warning);

      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to save ${def.singular.toLowerCase()}`);
    }
  };

  const requestDelete = (row: Row) => setConfirmDelete(row);

  const confirmDeleteNow = async () => {
    if (!confirmDelete) return;
    try {
      await remove(confirmDelete.id);
      toast.success(`${def.singular} deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete ${def.singular.toLowerCase()}`);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={def.title}
        description={def.description}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void reset()}
              title={apiBacked ? "Refresh from server" : "Restore demo data"}
            >
              <RotateCcw className="size-4" /> {apiBacked ? "Refresh" : "Reset demo"}
            </Button>
            {canCreate ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> New {def.singular.toLowerCase()}
              </Button>
            ) : null}
          </>
        }
      />
           {fixedParentId ? (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Link to="/floors" className="text-muted-foreground hover:text-foreground">
            ← All properties
          </Link>
          <span className="font-medium">{refLabel(fixedParentId)}</span>
        </div>
      ) : null}

      {fixedOwnerId ? (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <Link to="/properties" className="text-muted-foreground hover:text-foreground">
            ← All owners
          </Link>
          <span className="font-medium">{refLabel(fixedOwnerId)}</span>
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${def.title.toLowerCase()}…`}
            className="pl-9"
          />
        </div>
        {apiBacked && statusField ? (
          <Select value={statusFilter || "__all__"} onValueChange={(v) => setStatusFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {(statusField.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        {parentFilterField && refField && !fixedParentId ? (          <Select value={parentFilter || "__all__"} onValueChange={(v) => setParentFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={`All ${refField.label.toLowerCase()}s`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All {refField.label.toLowerCase()}s</SelectItem>
              {refRows.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {String(row[refField.labelKey ?? "name"] ?? row.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center rounded-md border border-border p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              title="Table view"
            >
              <List className="size-4" />
            </Button>
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="icon"
              className="size-7"
              onClick={() => setViewMode("card")}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid className="size-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {apiBacked
              ? `${total === 0 ? 0 : page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`
              : `${filtered.length} of ${rows.length}`}
          </p>
        </div>
      </div>

      {apiBacked && total > PAGE_SIZE ? (
        <div className="mb-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
      {resource === "properties" && (role === "owner" || role === "superAdmin") ? (
               <SubscriptionAlerts rows={rows} canRenew={role === "superAdmin"} />
      ) : null}
      {viewMode === "table" ? (
        <div className={`overflow-hidden rounded-xl border border-border bg-card transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((f) => (
                    <TableHead key={f.key} className="whitespace-nowrap">
                      {f.label}
                    </TableHead>
                  ))}
                  <TableHead className="sticky right-0 w-24 bg-card text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loaded ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="py-10 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <p className="text-sm">Nothing here yet.</p>
                        {canCreate ? (
                          <Button size="sm" variant="secondary" onClick={openCreate} className="mt-1">
                            <Plus className="size-4" /> New {def.singular.toLowerCase()}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((f) => (
                        <TableCell key={f.key} className="whitespace-nowrap">
                          {renderCell(f, row[f.key], refLabel)}
                        </TableCell>
                      ))}
                      <TableCell className="sticky right-0 bg-card text-right">
                        {resource === "floors" ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild size="sm" variant="default">
                              <Link to="/units/$floorId" params={{ floorId: row.id }}>
                                Manage units
                              </Link>
                            </Button>
                            {canEditRow(row) ? (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit floor">
                                  <Pencil className="size-4" />
                                </Button>
                                {canDeleteRow(row) ? (
                                  <Button variant="ghost" size="icon" onClick={() => requestDelete(row)} aria-label="Delete floor">
                                    <Trash2 className="size-4 text-destructive" />
                                  </Button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        ) : canEditRow(row) ? (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit">
                              <Pencil className="size-4" />
                            </Button>
                            {canDeleteRow(row) ? (
                              <Button variant="ghost" size="icon" onClick={() => requestDelete(row)} aria-label="Delete">
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            View only
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className={`transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {!loaded ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
              <p className="text-sm">Nothing here yet.</p>
              {canCreate ? (
                <Button size="sm" variant="secondary" onClick={openCreate} className="mt-1">
                  <Plus className="size-4" /> New {def.singular.toLowerCase()}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => {
                               const titleField = columns[0];
                const titleValue =
                  resource === "floors"
                    ? `Floor ${String(row["floorNumber"] ?? "")}${row["name"] ? ` — ${String(row["name"])}` : ""}`
                    : titleField?.type === "entity-select"
                      ? (refLabel(row[titleField.key]) ?? "Untitled")
                      : titleField
                        ? String(row[titleField.key] ?? "Untitled")
                        : "Untitled";
                const restColumns = columns
                  .slice(1)
                  .filter((f) => !(resource === "floors" && f.key === "floorNumber"));

                return (
                  <div key={row.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{titleValue}</p>
                      {statusField && row[statusField.key] ? (
                        <Badge variant={statusVariant(String(row[statusField.key]))} className="shrink-0">
                          {String(row[statusField.key])}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      {restColumns
                        .filter((f) => f.key !== statusField?.key)
                        .map((f) => (
                          <div key={f.key} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-muted-foreground">{f.label}</span>
                            <span className="text-right">{renderCell(f, row[f.key], refLabel)}</span>
                          </div>
                        ))}
                    </div>

                    <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                      {resource === "floors" ? (
                        <Button asChild size="sm" variant="default">
                          <Link to="/units/$floorId" params={{ floorId: row.id }}>
                            Manage units
                          </Link>
                        </Button>
                      ) : null}
                      {canEditRow(row) ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="size-4" /> Edit
                          </Button>
                          {canDeleteRow(row) ? (
                            <Button variant="ghost" size="sm" onClick={() => requestDelete(row)}>
                              <Trash2 className="size-4 text-destructive" /> Delete
                            </Button>
                          ) : null}
                        </>
                                            ) : resource === "floors" ? null :  (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          View only
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${def.singular.toLowerCase()}` : `New ${def.singular.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>{def.description}</DialogDescription>
          
          {editing && resource === "properties" ? (
  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Subscription
    </p>
    <div className="grid grid-cols-2 gap-y-1">
      <span className="text-muted-foreground">Plan</span>
      <span>
{String(
  editing["planName"] ??
    planRowsAll.find((p) => p.id === editing["planId"])?.["name"] ??
    "—"
)}      </span>
      <span className="text-muted-foreground">Status</span>
      <span>{String(editing["subscriptionStatus"] ?? "—")}</span>
      <span className="text-muted-foreground">Started</span>
      <span>{editing["subscriptionStartsAt"] ? String(editing["subscriptionStartsAt"]).slice(0, 10) : "—"}</span>
      <span className="text-muted-foreground">Ends</span>
      <span className="flex items-center gap-2">
        {editing["subscriptionEndsAt"] ? String(editing["subscriptionEndsAt"]).slice(0, 10) : "—"}
        <SubscriptionDays endsAt={editing["subscriptionEndsAt"]} />
      </span>
    </div>
        {role === "superAdmin" ? (
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <Select value={newPlanId} onValueChange={setNewPlanId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Choose plan…" />
          </SelectTrigger>
          <SelectContent>
            {planRows
              .filter((p) => p["billingCycle"] !== "trial")
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {String(p["name"])}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          disabled={!newPlanId}
          onClick={async () => {
            try {
              await propertyApi.setSubscription(editing.id, newPlanId);
              toast.success("Subscription updated");
              setNewPlanId("");
              setOpen(false);
              void reset();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to update subscription");
            }
          }}
        >
          Renew / change plan
        </Button>
      </div>
    ) : null}
  </div>
) : null}
          
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {def.fields
              .filter((f) => isFormField(f))
                            .filter((f) => !f.hideForUnitTypes || !f.hideForUnitTypes.includes(values["unitType"] ?? ""))
              .filter((f) => showAdvanced || !f.advanced)
              .sort((a, b) => sectionRank(a) - sectionRank(b))
              .map((f, i, arr) => (
                <Fragment key={f.key}>
                {f.section && f.section !== arr[i - 1]?.section ? (
                  <p className="border-b border-border pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
                    {f.section}
                  </p>
                ) : null}
                <div className={f.type === "textarea" ? "sm:col-span-2 space-y-2" : "space-y-2"}>
                  <Label htmlFor={`field-${f.key}`}>
                    {f.label}
                    {f.required ? <span className="text-destructive"> *</span> : null}
                  </Label>
                  {f.type === "entity-select" ? (
                    <Select
                      value={values[f.key] || ""}
                      onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                      disabled={fieldLocked(f)}
                    >
                      <SelectTrigger id={`field-${f.key}`}>
                        <SelectValue placeholder={`Select ${f.label.toLowerCase()}…`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.key === planField?.key ? planRows : refRows).map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {String(row[f.labelKey ?? "name"] ?? row.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : f.type === "boolean" ? (
                    <Select
                      value={values[f.key] || ""}
                      onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                      disabled={fieldLocked(f)}
                    >
                      <SelectTrigger id={`field-${f.key}`}>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : f.type === "select" ? (
                    <Select
                      value={values[f.key] || ""}
                      onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                      disabled={fieldLocked(f)}
                    >
                      <SelectTrigger id={`field-${f.key}`}>
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={`field-${f.key}`}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      disabled={fieldLocked(f)}
                    />
                  ) : (
                    <Input
                      id={`field-${f.key}`}
                      type={f.type === "date" ? "date" : f.type === "number" || f.type === "money" ? "number" : "text"}
                      placeholder={f.placeholder ?? ""}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      disabled={fieldLocked(f)}
                    />
                  )}
                               </div>
                </Fragment>
              ))}
          </div>
          {def.fields.some((f) => f.advanced && isFormField(f)) ? (
            <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? "Hide" : "Show"} advanced fields
            </Button>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editing ? "Save changes" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {def.singular.toLowerCase()}?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              {confirmDelete ? `"${String(confirmDelete["title"] ?? confirmDelete["name"] ?? confirmDelete.id)}"` : "this record"}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteNow}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}