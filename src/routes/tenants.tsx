import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
import {
  type ApiFloor,
  type ApiProperty,
  type ApiTenant,
  type ApiUnit,
  floorApi,
  propertyApi,
  tenantApi,
  unitApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — EstateOps" },
      { name: "description", content: "Tenant profiles, ID documents, co-tenants and move-in/move-out." },
    ],
  }),
  component: TenantsPage,
});

const NONE = "__none__";
const PAGE_SIZE = 20;

const statusLabel: Record<string, string> = {
  active: "Active",
  notice_served: "Notice served",
  moved_out: "Moved out",
};
const roleLabel: Record<string, string> = { primary: "Primary", co_tenant: "Co-tenant" };
const docLabel: Record<string, string> = {
  nid: "NID",
  passport: "Passport",
  driving_licence: "Driving licence",
};

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "active") return "default";
  if (s === "notice_served") return "secondary";
  return "outline";
}

const emptyForm = {
  propertyId: "",
  floorId: "",
  unitId: "",
  fullName: "",
  phone: "",
  email: "",
  idDocType: "",
  idDocNumber: "",
  role: "primary",
  status: "active",
  moveInDate: "",
  moveOutDate: "",
  occupation: "",
  permanentAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  familyMembers: "",
  notes: "",
};
type Form = typeof emptyForm;

function TenantsPage() {
  const { admin, ready } = useAuth();
  // Managers may add and correct records but not delete them (the API enforces this too).
  const canDelete = admin?.admin?.role !== "manager";
  const [tenants, setTenants] = useState<ApiTenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [units, setUnits] = useState<ApiUnit[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiTenant | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ApiTenant | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debounced, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await tenantApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      setTenants(res.items);
      setTotal(res.total);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, statusFilter]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    void load();
  }, [ready, admin?.token, load]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    propertyApi
      .list({ limit: 100 })
      .then((r) => setProperties(r.items))
      .catch(() => undefined);
  }, [ready, admin?.token]);

  const loadFloors = async (propertyId: string) => {
    if (!propertyId) {
      setFloors([]);
      return;
    }
    try {
      const r = await floorApi.list({ propertyId, limit: 100, sortBy: "floorNumber", sortDir: "asc" });
      setFloors(r.items);
    } catch {
      setFloors([]);
    }
  };

  const loadUnits = async (floorId: string) => {
    if (!floorId) {
      setUnits([]);
      return;
    }
    try {
      const r = await unitApi.list({ floorId, limit: 100 });
      setUnits(r.items);
    } catch {
      setUnits([]);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFloors([]);
    setUnits([]);
    setOpen(true);
  };

  const openEdit = async (t: ApiTenant) => {
    setEditing(t);
    setForm({
      propertyId: t.propertyId,
      floorId: "",
      unitId: t.unitId ?? "",
      fullName: t.fullName,
      phone: t.phone ?? "",
      email: t.email ?? "",
      idDocType: t.idDocType ?? "",
      idDocNumber: t.idDocNumber ?? "",
      role: t.role,
      status: t.status,
      moveInDate: t.moveInDate ?? "",
      moveOutDate: t.moveOutDate ?? "",
      occupation: t.occupation ?? "",
      permanentAddress: t.permanentAddress ?? "",
      emergencyContactName: t.emergencyContactName ?? "",
      emergencyContactPhone: t.emergencyContactPhone ?? "",
      familyMembers: t.familyMembers === null || t.familyMembers === undefined ? "" : String(t.familyMembers),
      notes: t.notes ?? "",
    });
    setFloors([]);
    setUnits([]);
    setOpen(true);
    await loadFloors(t.propertyId);
    if (t.unitId) {
      try {
        const unit = await unitApi.get(t.unitId);
        setForm((f) => ({ ...f, floorId: unit.floorId }));
        await loadUnits(unit.floorId);
      } catch {
        /* unit may be gone; leave blank */
      }
    }
  };

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.fullName.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!editing && !form.propertyId) {
      toast.error("Please select a property");
      return;
    }

    const nullable = (s: string) => (s.trim() ? s.trim() : null);

    const profile = {
      occupation: nullable(form.occupation),
      permanentAddress: nullable(form.permanentAddress),
      emergencyContactName: nullable(form.emergencyContactName),
      emergencyContactPhone: nullable(form.emergencyContactPhone),
      familyMembers: form.familyMembers === "" ? null : Number(form.familyMembers),
      notes: nullable(form.notes),
    };

    setSaving(true);
    try {
      if (editing) {
        await tenantApi.update(editing.id, {
          fullName: form.fullName.trim(),
          unitId: form.unitId || null,
          phone: nullable(form.phone),
          email: nullable(form.email),
          idDocType: form.idDocType || null,
          idDocNumber: nullable(form.idDocNumber),
          role: form.role,
          status: form.status,
          moveInDate: form.moveInDate || null,
          moveOutDate: form.moveOutDate || null,
          ...profile,
        });
        toast.success("Tenant updated");
      } else {
        await tenantApi.create({
          propertyId: form.propertyId,
          unitId: form.unitId || null,
          fullName: form.fullName.trim(),
          phone: nullable(form.phone),
          email: nullable(form.email),
          idDocType: form.idDocType || null,
          idDocNumber: nullable(form.idDocNumber),
          role: form.role,
          status: form.status,
          moveInDate: form.moveInDate || null,
          moveOutDate: form.moveOutDate || null,
          ...profile,
        });
        toast.success("Tenant created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save tenant");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await tenantApi.remove(deleting.id);
      toast.success("Tenant deleted");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete tenant");
    }
  };

  const propertyName = (id: string) => properties.find((p) => p.id === id)?.title ?? id;

  return (
    <AppShell>
      <PageHeader
        title="Tenants"
        description="Everyone living in your units, with their contact details and move-in dates."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New tenant
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone or email…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="notice_served">Notice served</SelectItem>
            <SelectItem value="moved_out">Moved out</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Property / unit</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>ID document</TableHead>
                <TableHead>Move-in</TableHead>
                <TableHead>Move-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    <p className="text-destructive">Could not load tenants: {loadError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => void load()}
                    >
                      Try again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No tenants found.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm font-medium">{t.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {[t.phone, t.email].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{t.propertyTitle ?? propertyName(t.propertyId)}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.unitCode ? `Unit ${t.unitCode}` : "No unit"}
                      </div>
                    </TableCell>
                    <TableCell>{roleLabel[t.role] ?? t.role}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {t.idDocType ? `${docLabel[t.idDocType]} ${t.idDocNumber ?? ""}` : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{t.moveInDate ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{t.moveOutDate ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(t.status)}>{statusLabel[t.status] ?? t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                          onClick={() => void openEdit(t)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => setDeleting(t)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit tenant" : "New tenant"}</DialogTitle>
            <DialogDescription>
              A unit can have one active primary tenant and any number of co-tenants.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>
                Property <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.propertyId}
                disabled={editing !== null}
                onValueChange={(v) => {
                  setForm((f) => ({ ...f, propertyId: v, floorId: "", unitId: "" }));
                  setUnits([]);
                  void loadFloors(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Floor</Label>
              <Select
                value={form.floorId || NONE}
                disabled={!form.propertyId}
                onValueChange={(v) => {
                  const id = v === NONE ? "" : v;
                  setForm((f) => ({ ...f, floorId: id, unitId: "" }));
                  void loadUnits(id);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select floor…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No floor</SelectItem>
                  {floors.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      Floor {f.floorNumber}
                      {f.name ? ` — ${f.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={form.unitId || NONE}
                disabled={!form.floorId}
                onValueChange={(v) => set("unitId", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No unit</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.unitCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="t-name">
                Full name <span className="text-destructive">*</span>
              </Label>
              <Input id="t-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="t-phone">Phone</Label>
              <Input id="t-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-email">Email</Label>
              <Input
                id="t-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>ID document</Label>
              <Select
                value={form.idDocType || NONE}
                onValueChange={(v) => set("idDocType", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  <SelectItem value="nid">NID</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="driving_licence">Driving licence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-doc">Document number</Label>
              <Input
                id="t-doc"
                value={form.idDocNumber}
                onChange={(e) => set("idDocNumber", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Tenancy role</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary tenant</SelectItem>
                  <SelectItem value="co_tenant">Co-tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="notice_served">Notice served</SelectItem>
                  <SelectItem value="moved_out">Moved out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="t-in">Move-in date</Label>
              <Input
                id="t-in"
                type="date"
                value={form.moveInDate}
                onChange={(e) => set("moveInDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-out">Move-out date</Label>
              <Input
                id="t-out"
                type="date"
                value={form.moveOutDate}
                onChange={(e) => set("moveOutDate", e.target.value)}
              />
            </div>

            <p className="border-b border-border pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-2">
              More about this tenant (optional)
            </p>
            <div className="space-y-2">
              <Label htmlFor="t-job">Occupation</Label>
              <Input id="t-job" value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-family">People living in the unit</Label>
              <Input id="t-family" type="number" min={0} value={form.familyMembers} onChange={(e) => set("familyMembers", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-ecname">Emergency contact name</Label>
              <Input id="t-ecname" value={form.emergencyContactName} onChange={(e) => set("emergencyContactName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-ecphone">Emergency contact phone</Label>
              <Input id="t-ecphone" value={form.emergencyContactPhone} onChange={(e) => set("emergencyContactPhone", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="t-address">Permanent address</Label>
              <Input id="t-address" value={form.permanentAddress} onChange={(e) => set("permanentAddress", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="t-notes">Notes</Label>
              <Textarea id="t-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete tenant?</DialogTitle>
            <DialogDescription>
              “{deleting?.fullName}” will be removed from the list. The record is kept for history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Back
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}