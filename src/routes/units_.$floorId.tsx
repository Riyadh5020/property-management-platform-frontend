import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Layers, LayoutGrid, List, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { floorApi, unitApi, type ApiFloor, type ApiUnit, type UnitStatus, type UnitType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/units_/$floorId")({
  component: FloorUnitsPage,
});

type DraftUnit = {
  id?: string;
  unitCode: string;
  unitType: UnitType;
  areaSize: string;
  bedrooms: string;
  bathrooms: string;
  hasKitchen: boolean;
  hasBalcony: boolean;
  rent: string;
  status: UnitStatus;
};

const emptyDraft = (): DraftUnit => ({
  unitCode: "",
  unitType: "apartment",
  areaSize: "",
  bedrooms: "",
  bathrooms: "",
  hasKitchen: false,
  hasBalcony: false,
  rent: "",
  status: "vacant",
});

function toDraft(u: ApiUnit): DraftUnit {
  return {
    id: u.id,
    unitCode: u.unitCode,
    unitType: u.unitType,
    areaSize: String(u.areaSize ?? ""),
    bedrooms: u.bedrooms != null ? String(u.bedrooms) : "",
    bathrooms: u.bathrooms != null ? String(u.bathrooms) : "",
    hasKitchen: !!u.hasKitchen,
    hasBalcony: !!u.hasBalcony,
    rent: u.rent != null ? String(u.rent) : "",
    status: u.status,
  };
}

const notApplicable = (type: UnitType) => type === "parking" || type === "common";

const statusVariant = (status: UnitStatus): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "vacant") return "default";
  if (status === "occupied") return "secondary";
  if (status === "maintenance") return "destructive";
  return "outline";
};

function FloorUnitsPage() {
  const { floorId } = Route.useParams();
  const { admin } = useAuth();
  const role = admin?.admin?.role;
  const canEditCap = role === "owner" || role === "superAdmin";

  const [floor, setFloor] = useState<ApiFloor | null>(null);
  const [rows, setRows] = useState<DraftUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [capDraft, setCapDraft] = useState("");
  const [editingCap, setEditingCap] = useState(false);
  const [savingCap, setSavingCap] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card">("card");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState({
    prefix: "",
    start: "1",
    count: "",
    unitType: "apartment" as UnitType,
    areaSize: "",
    rent: "",
    bedrooms: "",
    bathrooms: "",
  });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [siblingFloors, setSiblingFloors] = useState<ApiFloor[]>([]);
  const [sourceFloorId, setSourceFloorId] = useState("");
  const [copying, setCopying] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const [floorResult, unitsResult] = await Promise.all([
        floorApi.get(floorId),
        unitApi.list({ floorId, limit: 200 }),
      ]);
      setFloor(floorResult);
      setRows(unitsResult.items.map(toDraft));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load floor units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorId]);

  const cap = floor?.totalUnits ?? null;
  const capIsSet = cap !== null;
  const atCap = capIsSet && rows.length >= cap;
  const canAdd = capIsSet && !atCap;

  const saveCap = async () => {
    const n = Number(capDraft);
    if (!capDraft || !Number.isInteger(n) || n <= 0) {
      toast.error("Enter a whole number greater than 0");
      return;
    }
    const savedCount = rows.filter((r) => r.id).length;
    if (n < savedCount) {
      toast.error(`This floor already has ${savedCount} units. The cap cannot be lower.`);
      return;
    }
    setSavingCap(true);
    try {
      const updated = await floorApi.update(floorId, { totalUnits: n });
      setFloor(updated);
      setCapDraft("");
      setEditingCap(false);
      toast.success("Unit cap saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set unit cap");
    } finally {
      setSavingCap(false);
    }
  };

  const addRow = () => {
    if (!capIsSet) {
      toast.error("This floor has no unit limit set yet.");
      return;
    }
    if (atCap) {
      toast.error(`This floor is capped at ${cap} unit${cap === 1 ? "" : "s"}.`);
      return;
    }
    setRows((prev) => [...prev, emptyDraft()]);
  };

  const updateRow = (index: number, patch: Partial<DraftUnit>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = async (index: number) => {
    const row = rows[index];
    if (!row) return;
    if (!row.id) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      await unitApi.remove(row.id);
      toast.success("Unit deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete unit");
    }
  };

  const saveRow = async (index: number) => {
    const row = rows[index];
    if (!row) return;

    if (!row.unitCode.trim()) {
      toast.error("Unit code is required");
      return;
    }
    if (!row.areaSize || Number(row.areaSize) <= 0) {
      toast.error("Area size must be greater than 0");
      return;
    }

    setSavingIndex(index);
    try {
      const payload = {
        floorId,
        unitCode: row.unitCode.trim(),
        unitType: row.unitType,
        areaSize: Number(row.areaSize),
        bedrooms: row.bedrooms === "" ? null : Number(row.bedrooms),
        bathrooms: row.bathrooms === "" ? null : Number(row.bathrooms),
        hasKitchen: row.hasKitchen,
        hasBalcony: row.hasBalcony,
        rent: row.rent === "" ? null : Number(row.rent),
        status: row.status,
      };

      const result = row.id ? await unitApi.update(row.id, payload) : await unitApi.create(payload);
      toast.success(row.id ? "Unit updated" : "Unit created");

      const warning = (result as ApiUnit & { areaWarning?: string }).areaWarning;
      if (warning) toast.warning(warning);

      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save unit");
    } finally {
      setSavingIndex(null);
    }
  };

    const bulkPreview = (() => {
    const n = Number(bulk.count);
    const s = Number(bulk.start);
    if (!Number.isInteger(n) || n <= 0 || !Number.isInteger(s)) return [] as string[];
    return Array.from({ length: Math.min(n, 100) }, (_, i) => `${bulk.prefix}${s + i}`);
  })();

  const submitBulk = async () => {
    const area = Number(bulk.areaSize);
    if (bulkPreview.length === 0) {
      toast.error("Enter a count greater than 0");
      return;
    }
    if (!area || area <= 0) {
      toast.error("Area size must be greater than 0");
      return;
    }
    setBulkSaving(true);
    try {
      const res = await unitApi.bulkCreate({
        floorId,
        units: bulkPreview.map((unitCode) => ({
          unitCode,
          unitType: bulk.unitType,
          areaSize: area,
          bedrooms: bulk.bedrooms === "" ? null : Number(bulk.bedrooms),
          bathrooms: bulk.bathrooms === "" ? null : Number(bulk.bathrooms),
          rent: bulk.rent === "" ? null : Number(bulk.rent),
        })),
      });
      toast.success(`${res.items.length} units created`);
      if (res.areaWarning) toast.warning(res.areaWarning);
      setBulkOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk create failed");
    } finally {
      setBulkSaving(false);
    }
  };

  const openCopy = async () => {
    setSourceFloorId("");
    setCopyOpen(true);
    try {
      if (!floor) return;
      const res = await floorApi.list({ propertyId: floor.propertyId, limit: 200 });
      setSiblingFloors(res.items.filter((f) => f.id !== floorId));
    } catch {
      toast.error("Could not load floors");
    }
  };

  const submitCopy = async () => {
    if (!sourceFloorId) {
      toast.error("Choose a floor to copy from");
      return;
    }
    setCopying(true);
    try {
      const res = await floorApi.copyLayout(floorId, sourceFloorId);
      toast.success(`${res.items.length} units copied`);
      if (res.areaWarning) toast.warning(res.areaWarning);
      setCopyOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Copy failed");
    } finally {
      setCopying(false);
    }
  };

  const NewBadge = () => (
    <span className="rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
      New
    </span>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
      <LayoutGrid className="size-8 opacity-40" />
      <p className="text-sm">{capIsSet ? "No units yet on this floor." : "Set a unit cap above to get started."}</p>
      {capIsSet ? (
        <Button size="sm" variant="secondary" onClick={addRow} className="mt-1">
          <Plus className="size-4" /> Add first unit
        </Button>
      ) : null}
    </div>
  );

  return (
    <AppShell>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/floors" search={floor ? { propertyId: floor.propertyId } : {}}>
            <ArrowLeft className="size-4" /> Back to floors
          </Link>
        </Button>
      </div>
      <PageHeader
        title={floor ? `Units — Floor ${floor.floorNumber}${floor.name ? ` (${floor.name})` : ""}` : "Units"}
        description={
          capIsSet
            ? `${rows.length} of ${cap} unit${cap === 1 ? "" : "s"} used on this floor.`
            : "This floor doesn't have a unit limit yet."
        }
        actions={
          <>
            <div className="flex items-center rounded-md border border-border p-0.5">
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
            </div>
            {capIsSet && canEditCap ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCapDraft(String(cap));
                  setEditingCap(true);
                }}
              >
                Change cap
              </Button>
            ) : null}

            {canEditCap && capIsSet ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => void openCopy()} disabled={atCap}>
                  <Copy className="size-4" /> Copy layout
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setBulkOpen(true)} disabled={atCap}>
                  <Layers className="size-4" /> Bulk add
                </Button>
              </>
            ) : null}

            <Button size="sm" onClick={addRow} disabled={!canAdd}>
              <Plus className="size-4" /> Add unit
            </Button>
          </>
        }
      />

      {!loading && canEditCap && (!capIsSet || editingCap) ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
          <span className="text-muted-foreground">
            {capIsSet
              ? "Change how many units this floor can hold."
              : "Set how many units this floor can hold before anyone can add units."}
          </span>
          <Input
            type="number"
            min={1}
            value={capDraft}
            onChange={(e) => setCapDraft(e.target.value)}
            placeholder="e.g. 6"
            className="h-8 w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button size="sm" onClick={() => void saveCap()} disabled={savingCap}>
            Save cap
          </Button>
          {editingCap ? (
            <Button size="sm" variant="ghost" onClick={() => setEditingCap(false)}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card">
          <EmptyState />
        </div>
      ) : viewMode === "card" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={row.unitCode}
                    onChange={(e) => updateRow(index, { unitCode: e.target.value })}
                    placeholder="Unit code *"
                    className="h-8 w-28 font-medium"
                  />
                  {!row.id ? <NewBadge /> : null}
                </div>
                <Badge variant={statusVariant(row.status)} className="capitalize">
                  {row.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <Select value={row.unitType} onValueChange={(v) => updateRow(index, { unitType: v as UnitType })}>
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["apartment", "shop", "office", "parking", "bachelor", "own_use", "common"].map((t) => (
                        <SelectItem key={t} value={t}>
   {t.replace("_", " ")}                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={row.status} onValueChange={(v) => updateRow(index, { status: v as UnitStatus })}>
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["vacant", "occupied", "reserved", "maintenance"].map((s) => (
                        <SelectItem key={s} value={s}>
    {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Area (sqft) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={row.areaSize}
                    onChange={(e) => updateRow(index, { areaSize: e.target.value })}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rent</Label>
                  <Input
                    type="number"
                    value={row.rent}
                    onChange={(e) => updateRow(index, { rent: e.target.value })}
                    className="h-8"
                  />
                </div>

                {!notApplicable(row.unitType) ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                      <Input
                        type="number"
                        value={row.bedrooms}
                        onChange={(e) => updateRow(index, { bedrooms: e.target.value })}
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                      <Input
                        type="number"
                        value={row.bathrooms}
                        onChange={(e) => updateRow(index, { bathrooms: e.target.value })}
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Kitchen</Label>
                      <Select
                        value={row.hasKitchen ? "true" : "false"}
                        onValueChange={(v) => updateRow(index, { hasKitchen: v === "true" })}
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Balcony</Label>
                      <Select
                        value={row.hasBalcony ? "true" : "false"}
                        onValueChange={(v) => updateRow(index, { hasBalcony: v === "true" })}
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void saveRow(index)}
                  disabled={savingIndex === index}
                >
                  <Save className="size-4 text-primary" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void removeRow(index)}>
                  {row.id ? <Trash2 className="size-4 text-destructive" /> : <X className="size-4" />}
                  {row.id ? "Delete" : "Cancel"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit code *</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Area (sqft) *</TableHead>
                  <TableHead>Bedrooms</TableHead>
                  <TableHead>Bathrooms</TableHead>
                  <TableHead>Kitchen</TableHead>
                  <TableHead>Balcony</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="sticky right-0 w-20 bg-card text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.id ?? `new-${index}`}>
                    <TableCell>
                      <Input
                        value={row.unitCode}
                        onChange={(e) => updateRow(index, { unitCode: e.target.value })}
                        placeholder="A1"
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={row.unitType} onValueChange={(v) => updateRow(index, { unitType: v as UnitType })}>
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["apartment", "shop", "office", "parking", "bachelor", "own_use", "common"].map((t) => (
                            <SelectItem key={t} value={t}>
    {t.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.areaSize}
                        onChange={(e) => updateRow(index, { areaSize: e.target.value })}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      {notApplicable(row.unitType) ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Input
                          type="number"
                          value={row.bedrooms}
                          onChange={(e) => updateRow(index, { bedrooms: e.target.value })}
                          className="h-8 w-16"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {notApplicable(row.unitType) ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Input
                          type="number"
                          value={row.bathrooms}
                          onChange={(e) => updateRow(index, { bathrooms: e.target.value })}
                          className="h-8 w-16"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {notApplicable(row.unitType) ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Select
                          value={row.hasKitchen ? "true" : "false"}
                          onValueChange={(v) => updateRow(index, { hasKitchen: v === "true" })}
                        >
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {notApplicable(row.unitType) ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Select
                          value={row.hasBalcony ? "true" : "false"}
                          onValueChange={(v) => updateRow(index, { hasBalcony: v === "true" })}
                        >
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.rent}
                        onChange={(e) => updateRow(index, { rent: e.target.value })}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={row.status} onValueChange={(v) => updateRow(index, { status: v as UnitStatus })}>
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["vacant", "occupied", "reserved", "maintenance"].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="sticky right-0 bg-card text-right">
                      <div className="flex justify-end gap-1">
                        {!row.id ? <NewBadge /> : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void saveRow(index)}
                          disabled={savingIndex === index}
                          aria-label="Save"
                          title="Save"
                        >
                          <Save className="size-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void removeRow(index)} aria-label="Delete" title="Delete">
                          {row.id ? <Trash2 className="size-4 text-destructive" /> : <X className="size-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk add units</DialogTitle>
            <DialogDescription>
              {capIsSet ? `Room for ${Math.max(0, (cap ?? 0) - rows.length)} more on this floor.` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Code prefix</Label>
              <Input value={bulk.prefix} placeholder="A" onChange={(e) => setBulk({ ...bulk, prefix: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Start number</Label>
              <Input type="number" value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">How many *</Label>
              <Input type="number" value={bulk.count} onChange={(e) => setBulk({ ...bulk, count: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={bulk.unitType} onValueChange={(v) => setBulk({ ...bulk, unitType: v as UnitType })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["apartment", "shop", "office", "parking", "bachelor", "own_use", "common"].map((t) => (
                    <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Area (sqft) *</Label>
              <Input type="number" value={bulk.areaSize} onChange={(e) => setBulk({ ...bulk, areaSize: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rent</Label>
              <Input type="number" value={bulk.rent} onChange={(e) => setBulk({ ...bulk, rent: e.target.value })} />
            </div>
            {!notApplicable(bulk.unitType) ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bedrooms</Label>
                  <Input type="number" value={bulk.bedrooms} onChange={(e) => setBulk({ ...bulk, bedrooms: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bathrooms</Label>
                  <Input type="number" value={bulk.bathrooms} onChange={(e) => setBulk({ ...bulk, bathrooms: e.target.value })} />
                </div>
              </>
            ) : null}
          </div>
          {bulkPreview.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Will create: {bulkPreview.slice(0, 6).join(", ")}
              {bulkPreview.length > 6 ? ` … ${bulkPreview[bulkPreview.length - 1]}` : ""} ({bulkPreview.length} units)
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitBulk()} disabled={bulkSaving}>Create units</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy layout from another floor</DialogTitle>
            <DialogDescription>
              Copies every unit (same codes, type, area, rooms) as vacant. Nothing is copied if any code already exists here or the cap would be exceeded.
            </DialogDescription>
          </DialogHeader>
          <Select value={sourceFloorId} onValueChange={setSourceFloorId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Choose source floor…" /></SelectTrigger>
            <SelectContent>
              {siblingFloors.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  Floor {f.floorNumber}{f.name ? ` (${f.name})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCopyOpen(false)}>Cancel</Button>
            <Button onClick={() => void submitCopy()} disabled={copying || !sourceFloorId}>Copy units</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}