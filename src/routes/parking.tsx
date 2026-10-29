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
  type ApiParking,
  type ApiProperty,
  type ApiUnit,
  floorApi,
  parkingApi,
  propertyApi,
  unitApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/parking")({
  head: () => ({
    meta: [
      { title: "Parking — EstateOps" },
      { name: "description", content: "Parking slots, allocation and fees." },
    ],
  }),
  component: ParkingPage,
});

const PAGE_SIZE = 20;
const NONE = "__none__";
const typeLabel: Record<string, string> = {
  resident: "Resident",
  visitor: "Visitor",
  staff: "Staff",
};

function statusVariant(s: string): "default" | "secondary" | "destructive" {
  if (s === "assigned") return "default";
  if (s === "blocked") return "destructive";
  return "secondary";
}

const emptyForm = {
  propertyId: "",
  floorId: "",
  unitId: "",
  slotNumber: "",
  slotType: "resident",
  vehicleNumber: "",
  monthlyFee: "",
  blocked: false,
};
type Form = typeof emptyForm;

function ParkingPage() {
  const { admin, ready } = useAuth();
  // Managers may add and correct records but not delete them (the API enforces this too).
  const canDelete = admin?.admin?.role !== "manager";
  const [items, setItems] = useState<ApiParking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [units, setUnits] = useState<ApiUnit[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiParking | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ApiParking | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(0);
  }, [debounced, statusFilter, typeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await parkingApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(typeFilter !== "all" ? { slotType: typeFilter } : {}),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, statusFilter, typeFilter]);

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
      const r = await floorApi.list({
        propertyId,
        limit: 100,
        sortBy: "floorNumber",
        sortDir: "asc",
      });
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

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFloors([]);
    setUnits([]);
    setOpen(true);
  };

  const openEdit = (s: ApiParking) => {
    setEditing(s);
    setForm({
      propertyId: s.propertyId,
      floorId: "",
      unitId: s.unitId ?? "",
      slotNumber: s.slotNumber,
      slotType: s.slotType,
      vehicleNumber: s.vehicleNumber ?? "",
      monthlyFee: String(s.monthlyFee),
      blocked: s.status === "blocked",
    });
    setFloors([]);
    setUnits([]);
    setOpen(true);
    void loadFloors(s.propertyId);
    // Preload the slot's floor and units so the current unit shows in the dialog.
    if (s.unitId) {
      unitApi
        .get(s.unitId)
        .then((u) => {
          setForm((f) => (f.unitId === s.unitId ? { ...f, floorId: u.floorId } : f));
          void loadUnits(u.floorId);
        })
        .catch(() => undefined);
    }
  };

  const save = async () => {
    if (!form.slotNumber.trim()) {
      toast.error("Slot number is required");
      return;
    }
    if (!editing && !form.propertyId) {
      toast.error("Select a property");
      return;
    }
    const nullable = (s: string) => (s.trim() ? s.trim() : null);
    const common = {
      slotNumber: form.slotNumber.trim(),
      slotType: form.slotType,
      unitId: form.unitId || null,
      vehicleNumber: nullable(form.vehicleNumber),
      monthlyFee: Number(form.monthlyFee || 0),
      status: form.blocked ? "blocked" : "free",
    };
    setSaving(true);
    try {
      if (editing) {
        await parkingApi.update(editing.id, common);
        toast.success("Slot updated");
      } else {
        await parkingApi.create({ propertyId: form.propertyId, ...common });
        toast.success("Slot created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save slot");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting || removing) return;
    setRemoving(true);
    try {
      await parkingApi.remove(deleting.id);
      toast.success("Slot deleted");
      setDeleting(null);
      // Deleting the only row on a later page steps back instead of showing an empty page.
      if (items.length === 1 && page > 0) setPage((p) => p - 1);
      else await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete slot");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Parking"
        description="Slot allocation per unit, visitor parking and fees."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New slot
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slot or vehicle…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="resident">Resident</SelectItem>
            <SelectItem value="visitor">Visitor</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
          {total}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slot</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Assigned unit</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Monthly fee</TableHead>
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
                    <p className="text-destructive">Could not load parking slots: {loadError}</p>
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
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No parking slots found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap font-medium">{s.slotNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.propertyTitle}</TableCell>
                    <TableCell>{typeLabel[s.slotType]}</TableCell>
                    <TableCell>{s.unitCode ? `Unit ${s.unitCode}` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{s.vehicleNumber ?? "—"}</TableCell>
                    <TableCell>{formatMoney(s.monthlyFee)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => setDeleting(s)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit slot" : "New parking slot"}</DialogTitle>
            <DialogDescription>
              A slot with a unit or vehicle becomes “assigned”. Tick Blocked to take it out of use.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {!editing ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Property <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.propertyId}
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
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="p-slot">
                Slot number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-slot"
                value={form.slotNumber}
                onChange={(e) => set("slotNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.slotType} onValueChange={(v) => set("slotType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="visitor">Visitor</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned unit</Label>
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
            <div className="space-y-2">
              <Label htmlFor="p-vehicle">Vehicle number</Label>
              <Input
                id="p-vehicle"
                value={form.vehicleNumber}
                onChange={(e) => set("vehicleNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-fee">Monthly fee</Label>
              <Input
                id="p-fee"
                type="number"
                min={0}
                value={form.monthlyFee}
                onChange={(e) => set("monthlyFee", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="p-blocked"
                type="checkbox"
                checked={form.blocked}
                onChange={(e) => set("blocked", e.target.checked)}
              />
              <Label htmlFor="p-blocked">Blocked (not available)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete slot?</DialogTitle>
            <DialogDescription>
              Slot “{deleting?.slotNumber}” will be removed from the list. The record is kept for
              history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Back
            </Button>
            <Button variant="destructive" disabled={removing} onClick={() => void confirmDelete()}>
              {removing ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
