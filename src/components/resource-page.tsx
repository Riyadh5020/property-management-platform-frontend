import { Pencil, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { resources, type FieldDef, type Row } from "@/lib/mock-data";
import { formatMoney, useCollection } from "@/lib/store";

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

function renderCell(field: FieldDef, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (field.type === "money") return formatMoney(value);
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
  const { rows, create, update, remove, reset } = useCollection(resource);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(def.fields));

  const columns = def.fields.filter((f) => f.inTable);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      def.fields.some((f) => String(row[f.key] ?? "").toLowerCase().includes(q)),
    );
  }, [rows, query, def.fields]);

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

  const submit = () => {
    const payload: Record<string, unknown> = {};
    def.fields.forEach((f) => {
      const raw = values[f.key] ?? "";
      payload[f.key] = f.type === "number" || f.type === "money" ? (raw === "" ? 0 : Number(raw)) : raw;
    });
    if (editing) {
      update(editing.id, payload);
      toast.success(`${def.singular} updated`);
    } else {
      create(payload);
      toast.success(`${def.singular} created`);
    }
    setOpen(false);
  };

  const handleDelete = (row: Row) => {
    remove(row.id);
    toast.success(`${def.singular} deleted`);
  };

  return (
    <AppShell>
      <PageHeader
        title={def.title}
        description={def.description}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={reset} title="Restore demo data">
              <RotateCcw className="size-4" /> Reset demo
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New {def.singular.toLowerCase()}
            </Button>
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
        <p className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {rows.length}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
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
              {filtered.length === 0 ? (
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
                        {renderCell(f, row[f.key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(row)}
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(row)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
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
                <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
                {f.type === "select" ? (
                  <Select
                    value={values[f.key] || ""}
                    onValueChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
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
                  />
                ) : (
                  <Input
                    id={`field-${f.key}`}
                    type={f.type === "date" ? "date" : f.type === "number" || f.type === "money" ? "number" : "text"}
                    placeholder={f.placeholder ?? ""}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
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
    </AppShell>
  );
}
