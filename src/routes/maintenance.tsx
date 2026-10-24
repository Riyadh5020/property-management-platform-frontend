import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  type ApiFloor, type ApiMaintenance, type ApiProperty, type ApiUnit,
  floorApi, maintenanceApi, propertyApi, unitApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — EstateOps" },
      { name: "description", content: "Work orders, preventive schedules and common area upkeep." },
    ],
  }),
  component: MaintenancePage,
});

const PAGE_SIZE = 20;
const NONE = "__none__";

const catLabel: Record<string, string> = {
  tenant_request: "Tenant request", preventive: "Preventive", common_area: "Common area",
};
const statusLabel: Record<string, string> = {
  open: "Open", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled",
};

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "completed") return "default";
  if (s === "in_progress") return "secondary";
  if (s === "cancelled") return "outline";
  return "destructive";
}
function priorityVariant(p: string): "default" | "secondary" | "destructive" | "outline" {
  if (p === "urgent" || p === "high") return "destructive";
  if (p === "medium") return "secondary";
  return "outline";
}

const emptyForm = {
  propertyId: "", floorId: "", unitId: "", title: "", description: "",
  category: "tenant_request", priority: "medium", status: "open",
  assignee: "", scheduledFor: "", cost: "",
};
type Form = typeof emptyForm;

function MaintenancePage() {
  const { admin, ready } = useAuth();
  const [items, setItems] = useState<ApiMaintenance[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [units, setUnits] = useState<ApiUnit[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiMaintenance | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ApiMaintenance | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(0); }, [debounced, statusFilter, priorityFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.list({
        limit: PAGE_SIZE, offset: page * PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load maintenance");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, statusFilter, priorityFilter]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    void load();
  }, [ready, admin?.token, load]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    propertyApi.list({ limit: 100 }).then((r) => setProperties(r.items)).catch(() => undefined);
  }, [ready, admin?.token]);

  const loadFloors = async (propertyId: string) => {
    if (!propertyId) { setFloors([]); return; }
    try {
      const r = await floorApi.list({ propertyId, limit: 100, sortBy: "floorNumber", sortDir: "asc" });
      setFloors(r.items);
    } catch { setFloors([]); }
  };
  const loadUnits = async (floorId: string) => {
    if (!floorId) { setUnits([]); return; }
    try {
      const r = await unitApi.list({ floorId, limit: 100 });
      setUnits(r.items);
    } catch { setUnits([]); }
  };

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null); setForm(emptyForm); setFloors([]); setUnits([]); setOpen(true);
  };

  const openEdit = (m: ApiMaintenance) => {
    setEditing(m);
    setForm({
      propertyId: m.propertyId, floorId: "", unitId: m.unitId ?? "", title: m.title,
      description: m.description ?? "", category: m.category, priority: m.priority,
      status: m.status, assignee: m.assignee ?? "", scheduledFor: m.scheduledFor ?? "",
      cost: String(m.cost),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!editing && !form.propertyId) { toast.error("Select a property"); return; }
    const nullable = (s: string) => (s.trim() ? s.trim() : null);
    const common = {
      title: form.title.trim(),
      description: nullable(form.description),
      category: form.category, priority: form.priority, status: form.status,
      assignee: nullable(form.assignee),
      scheduledFor: form.scheduledFor || null,
      cost: Number(form.cost || 0),
    };
    setSaving(true);
    try {
      if (editing) {
        await maintenanceApi.update(editing.id, common);
        toast.success("Work order updated");
      } else {
        await maintenanceApi.create({
          propertyId: form.propertyId, unitId: form.unitId || null, ...common,
        });
        toast.success("Work order created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save work order");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await maintenanceApi.remove(deleting.id);
      toast.success("Work order deleted");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete work order");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Maintenance"
        description="Tenant requests, preventive schedules and common-area upkeep."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New work order
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or assignee…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
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
                <TableHead>Issue</TableHead>
                <TableHead>Property / unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No work orders found.</TableCell></TableRow>
              ) : (
                items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap font-medium">{m.title}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{m.propertyTitle}</div>
                      <div className="text-xs text-muted-foreground">{m.unitCode ? `Unit ${m.unitCode}` : "Common area"}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{catLabel[m.category]}</TableCell>
                    <TableCell><Badge variant={priorityVariant(m.priority)}>{m.priority}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap">{m.assignee ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.scheduledFor ?? "—"}</TableCell>
                    <TableCell>{formatMoney(m.cost)}</TableCell>
                    <TableCell><Badge variant={statusVariant(m.status)}>{statusLabel[m.status]}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(m)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => setDeleting(m)}>
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

      {total > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="secondary" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit work order" : "New work order"}</DialogTitle>
            <DialogDescription>
              {editing ? "Property and unit cannot be changed." : "Leave the unit empty for a common-area job."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {!editing ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Property <span className="text-destructive">*</span></Label>
                  <Select value={form.propertyId} onValueChange={(v) => {
                    setForm((f) => ({ ...f, propertyId: v, floorId: "", unitId: "" }));
                    setUnits([]); void loadFloors(v);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select property…" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Floor</Label>
                  <Select value={form.floorId || NONE} disabled={!form.propertyId} onValueChange={(v) => {
                    const id = v === NONE ? "" : v;
                    setForm((f) => ({ ...f, floorId: id, unitId: "" })); void loadUnits(id);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select floor…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No floor</SelectItem>
                      {floors.map((f) => <SelectItem key={f.id} value={f.id}>Floor {f.floorNumber}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={form.unitId || NONE} disabled={!form.floorId}
                    onValueChange={(v) => set("unitId", v === NONE ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select unit…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No unit (common area)</SelectItem>
                      {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.unitCode}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="m-title">Issue / task <span className="text-destructive">*</span></Label>
              <Input id="m-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_request">Tenant request</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="common_area">Common area</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-assignee">Assigned to</Label>
              <Input id="m-assignee" value={form.assignee} onChange={(e) => set("assignee", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-date">Scheduled for</Label>
              <Input id="m-date" type="date" value={form.scheduledFor} onChange={(e) => set("scheduledFor", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-cost">Cost</Label>
              <Input id="m-cost" type="number" min={0} value={form.cost} onChange={(e) => set("cost", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="m-desc">Notes</Label>
              <Textarea id="m-desc" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Back</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete work order?</DialogTitle>
            <DialogDescription>
              “{deleting?.title}” will be removed from the list. The record is kept for history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Back</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}