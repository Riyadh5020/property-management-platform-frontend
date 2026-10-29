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
import {
  type ApiFloor,
  type ApiLease,
  type ApiProperty,
  type ApiTenant,
  type ApiUnit,
  floorApi,
  leaseApi,
  propertyApi,
  tenantApi,
  unitApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/leases")({
  head: () => ({
    meta: [
      { title: "Leases — EstateOps" },
      { name: "description", content: "Lease agreements, rent escalation and deposits." },
    ],
  }),
  component: LeasesPage,
});

const PAGE_SIZE = 20;

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "active") return "default";
  if (s === "draft") return "secondary";
  if (s === "terminated") return "destructive";
  return "outline";
}

const emptyForm = {
  propertyId: "",
  floorId: "",
  unitId: "",
  tenantId: "",
  agreementNo: "",
  startDate: "",
  endDate: "",
  monthlyRent: "",
  securityDeposit: "",
  escalationPercent: "",
  noticePeriodDays: "30",
  status: "active",
};
type Form = typeof emptyForm;

function LeasesPage() {
  const { admin, ready } = useAuth();
  // Managers may add and correct records but not delete them (the API enforces this too).
  const canDelete = admin?.admin?.role !== "manager";
  const [leases, setLeases] = useState<ApiLease[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [units, setUnits] = useState<ApiUnit[]>([]);
  const [tenants, setTenants] = useState<ApiTenant[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiLease | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ApiLease | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debounced, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaseApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      setLeases(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load leases");
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

  const loadPropertyData = async (propertyId: string) => {
    if (!propertyId) {
      setFloors([]);
      setTenants([]);
      return;
    }
    try {
      const [f, t] = await Promise.all([
        floorApi.list({ propertyId, limit: 100, sortBy: "floorNumber", sortDir: "asc" }),
        tenantApi.list({ propertyId, limit: 100 }),
      ]);
      setFloors(f.items);
      setTenants(t.items.filter((x) => x.status !== "moved_out"));
    } catch {
      setFloors([]);
      setTenants([]);
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
    setTenants([]);
    setOpen(true);
  };

  const openEdit = (l: ApiLease) => {
    setEditing(l);
    setForm({
      propertyId: l.propertyId,
      floorId: "",
      unitId: l.unitId,
      tenantId: l.tenantId,
      agreementNo: l.agreementNo ?? "",
      startDate: l.startDate,
      endDate: l.endDate,
      monthlyRent: String(l.monthlyRent),
      securityDeposit: String(l.securityDeposit),
      escalationPercent: String(l.escalationPercent),
      noticePeriodDays: String(l.noticePeriodDays),
      status: l.status,
    });
    setOpen(true);
  };

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!editing) {
      if (!form.propertyId || !form.unitId || !form.tenantId) {
        toast.error("Select a property, unit and tenant");
        return;
      }
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Start and end dates are required");
      return;
    }
    if (form.monthlyRent === "" || Number(form.monthlyRent) < 0) {
      toast.error("Enter a valid monthly rent");
      return;
    }

    const common = {
      agreementNo: form.agreementNo.trim() || null,
      startDate: form.startDate,
      endDate: form.endDate,
      monthlyRent: Number(form.monthlyRent),
      securityDeposit: Number(form.securityDeposit || 0),
      escalationPercent: Number(form.escalationPercent || 0),
      noticePeriodDays: Number(form.noticePeriodDays || 0),
      status: form.status,
    };

    setSaving(true);
    try {
      if (editing) {
        await leaseApi.update(editing.id, common);
        toast.success("Lease updated");
      } else {
        await leaseApi.create({
          propertyId: form.propertyId,
          unitId: form.unitId,
          tenantId: form.tenantId,
          ...common,
        });
        toast.success("Lease created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save lease");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await leaseApi.remove(deleting.id);
      toast.success("Lease deleted");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete lease");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Leases"
        description="Agreements, rent, deposits and yearly escalation. A unit can have only one live lease at a time."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New lease
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
            placeholder="Search tenant or agreement no…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
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
                <TableHead>Agreement</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property / unit</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Escalation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : leases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No leases found.
                  </TableCell>
                </TableRow>
              ) : (
                leases.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{l.agreementNo ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{l.tenantName ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{l.propertyTitle}</div>
                      <div className="text-xs text-muted-foreground">Unit {l.unitCode}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {l.startDate} → {l.endDate}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatMoney(l.monthlyRent)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatMoney(l.securityDeposit)}</TableCell>
                    <TableCell>{l.escalationPercent}%</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(l.status)}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(l)}>
                          <Pencil className="size-4" />
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => setDeleting(l)}
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
            <DialogTitle>{editing ? "Edit lease" : "New lease"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Property, unit and tenant cannot be changed. Create a new lease instead."
                : "Pick the property, then the unit and tenant."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {!editing ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Property <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.propertyId}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, propertyId: v, floorId: "", unitId: "", tenantId: "" }));
                      setUnits([]);
                      void loadPropertyData(v);
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
                    value={form.floorId}
                    disabled={!form.propertyId}
                    onValueChange={(v) => {
                      setForm((f) => ({ ...f, floorId: v, unitId: "" }));
                      void loadUnits(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select floor…" />
                    </SelectTrigger>
                    <SelectContent>
                      {floors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          Floor {f.floorNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Unit <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.unitId}
                    disabled={!form.floorId}
                    onValueChange={(v) => set("unitId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit…" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unitCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>
                    Tenant <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.tenantId}
                    disabled={!form.propertyId}
                    onValueChange={(v) => set("tenantId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.fullName}
                          {t.unitCode ? ` — unit ${t.unitCode}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="l-no">Agreement no.</Label>
              <Input id="l-no" value={form.agreementNo} onChange={(e) => set("agreementNo", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="l-start">
                Start date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="l-start"
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-end">
                End date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="l-end"
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="l-rent">
                Monthly rent <span className="text-destructive">*</span>
              </Label>
              <Input
                id="l-rent"
                type="number"
                min={0}
                value={form.monthlyRent}
                onChange={(e) => set("monthlyRent", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-dep">Security deposit</Label>
              <Input
                id="l-dep"
                type="number"
                min={0}
                value={form.securityDeposit}
                onChange={(e) => set("securityDeposit", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-esc">Yearly escalation %</Label>
              <Input
                id="l-esc"
                type="number"
                min={0}
                max={100}
                value={form.escalationPercent}
                onChange={(e) => set("escalationPercent", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l-notice">Notice period (days)</Label>
              <Input
                id="l-notice"
                type="number"
                min={0}
                value={form.noticePeriodDays}
                onChange={(e) => set("noticePeriodDays", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create lease"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete lease?</DialogTitle>
            <DialogDescription>
              Lease {deleting?.agreementNo ?? ""} will be removed from the list. The record is kept for
              history.
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