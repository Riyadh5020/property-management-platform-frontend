import { AppShell, PageHeader } from "@/components/app-shell";
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
import { useAuth } from "@/lib/auth";
import { resources, type FieldDef, type Row } from "@/lib/mock-data";
import { formatMoney, useCollection } from "@/lib/store";
import { Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const POSITIVE = ["active", "paid", "signed", "occupied", "completed", "settled", "available", "on duty", "assigned", "checked out"];
const WARN = ["pending", "reserved", "partially paid", "in progress", "notice served", "sent for signature", "billed", "off duty", "free", "inside"];
const BAD = ["overdue", "unpaid", "under maintenance", "cancelled", "denied", "on hold", "blocked", "closed", "moved out", "on leave"];

function statusVariant(value: string): "default" | "secondary" | "destructive" | "outline" {
  const v = value.toLowerCase();
  if (POSITIVE.includes(v)) return "default";
  if (WARN.includes(v)) return "secondary";
  if (BAD.includes(v)) return "destructive";
  return "outline";
}

function renderCell(field: FieldDef, value: unknown, resolveRef?: (id: unknown) => string | null) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
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

export function ResourcePage({ resource }: { resource: string }) {
  const def = resources[resource]!;
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

   const [parentFilter, setParentFilter] = useState("");
  const parentFilterField =
    resource === "buildings" ? "propertyId" : resource === "floors" ? "buildingId" : null;

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const backendFilters = def.apiBacked
    ? {
        search: debouncedQuery || undefined,
        status: statusFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(parentFilterField ? { [parentFilterField]: parentFilter || undefined } : {}),
      }
    : undefined;

  const { rows, create, update, remove, reset, apiBacked, loaded, isFetching, total } = useCollection(resource, backendFilters);

  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, statusFilter, parentFilter]);
    const { admin } = useAuth();
  const role = admin?.admin?.role;
  const isSuperAdminManaged = resource === "properties" || resource === "buildings" || resource === "floors";
  const canWrite = !isSuperAdminManaged || role === "superAdmin";

  const isOwnPropertyRow = (row: Row) =>
    resource === "properties" && role === "owner" && row["ownerId"] === admin?.admin?.id;

  const canEditRow = (row: Row) => canWrite || isOwnPropertyRow(row);
  const [editing, setEditing] = useState<Row | null>(null);
    const editingAsRestrictedOwner = isSuperAdminManaged && role === "owner" && editing !== null;
  const fieldLocked = (f: FieldDef) => editingAsRestrictedOwner && !f.ownerEditable;
  
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(def.fields));
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);
  const columns = def.fields.filter((f) => f.inTable);


    const refField = def.fields.find((f) => f.type === "entity-select");
  const { rows: refRows } = useCollection(refField?.sourceResource ?? "__none__");
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
    return rows.filter((row) =>
      def.fields.some((f) => String(row[f.key] ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, def.fields, apiBacked]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyValues(def.fields));
    setOpen(true);
  };

  const openEdit = (row: Row) => {
    const next = emptyValues(def.fields);
    def.fields.forEach((f) => {
      next[f.key] = row[f.key] === undefined || row[f.key] === null ? "" : String(row[f.key]);
    });
    setEditing(row);
    setValues(next);
    setOpen(true);
  };

const submit = async () => {
  try {
    const payload: Record<string, unknown> = {};

    def.fields.forEach((f) => {
      if (fieldLocked(f)) return;

      const raw = values[f.key] ?? "";

      payload[f.key] =
        f.type === "number" || f.type === "money"
          ? raw === ""
            ? 0
            : Number(raw)
          : raw;
    });

    if (editing) {
      await update(editing.id, payload);
      toast.success(`${def.singular} updated`);
    } else {
      await create(payload);
      toast.success(`${def.singular} created`);
    }

    setOpen(false);
  } catch (err) {
    toast.error(
      err instanceof Error
        ? err.message
        : `Failed to save ${def.singular.toLowerCase()}`
    );
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
                        {canWrite ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> New {def.singular.toLowerCase()}
              </Button>
            ) : null}
          </>
        }
      />

         <div className="mb-4 flex items-center gap-2">
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
        {parentFilterField && refField ? (
          <Select value={parentFilter || "__all__"} onValueChange={(v) => setParentFilter(v === "__all__" ? "" : v)}>
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
                <p className="ml-auto text-sm text-muted-foreground">
          {apiBacked
            ? `${total === 0 ? 0 : page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`
            : `${filtered.length} of ${rows.length}`}
        </p>
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
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                           {!loaded ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nothing here yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((f) => (
                      <TableCell key={f.key} className="whitespace-nowrap">
{renderCell(f, row[f.key], refLabel)}                      </TableCell>
                    ))}
                                                        <TableCell className="text-right">
                      {canEditRow(row) ? (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit">
                            <Pencil className="size-4" />
                          </Button>
                                               {canWrite ? (
                            <Button variant="ghost" size="icon" onClick={() => requestDelete(row)} aria-label="Delete">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${def.singular.toLowerCase()}` : `New ${def.singular.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>{def.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {def.fields.map((f) => (
              <div
                key={f.key}
                className={f.type === "textarea" ? "sm:col-span-2 space-y-2" : "space-y-2"}
              >
                <Label htmlFor={`field-${f.key}`}>
                  {f.label}
                  {f.required ? <span className="text-destructive"> *</span> : null}
                </Label>                                                {f.type === "entity-select" ? (
                  <Select
                    value={values[f.key] || ""}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
                    disabled={fieldLocked(f)}
                  >
                    <SelectTrigger id={`field-${f.key}`}>
                      <SelectValue placeholder={`Select ${f.label.toLowerCase()}…`} />
                    </SelectTrigger>
                                        <SelectContent>
                      {refRows.map((row) => (
                        <SelectItem key={row.id} value={row.id}>
                          {String(row[f.labelKey ?? "name"] ?? row.id)}
                        </SelectItem>
                      ))}
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
            ))}
          </div>
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
              This will permanently remove {confirmDelete ? `"${String(confirmDelete["title"] ?? confirmDelete["name"] ?? confirmDelete.id)}"` : "this record"}.
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
