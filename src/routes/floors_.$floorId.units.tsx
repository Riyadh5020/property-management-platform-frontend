import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/floors_/$floorId/units")({
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

function FloorUnitsPage() {
  const { floorId } = Route.useParams();
  const { admin } = useAuth();
  const role = admin?.admin?.role;

  const [floor, setFloor] = useState<ApiFloor | null>(null);
  const [rows, setRows] = useState<DraftUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [capDraft, setCapDraft] = useState("");
  const [savingCap, setSavingCap] = useState(false);

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
    setSavingCap(true);
    try {
      const updated = await floorApi.update(floorId, { totalUnits: n });
      setFloor(updated);
      setCapDraft("");
      toast.success("Unit cap set");
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

  return (
    <AppShell>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/floors">
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
          <Button size="sm" onClick={addRow} disabled={!canAdd}>
            <Plus className="size-4" /> Add unit
          </Button>
        }
      />

   {!loading && !capIsSet ? (
  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    <span>Set how many units this floor can hold before anyone can add units.</span>
    <Input
      type="number"
      min={1}
      value={capDraft}
      onChange={(e) => setCapDraft(e.target.value)}
      placeholder="e.g. 6"
      className="h-8 w-24"
    />
    <Button size="sm" onClick={() => void saveCap()} disabled={savingCap}>
      Save cap
    </Button>
  </div>
) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Area (sqft)</TableHead>
                <TableHead>Bedrooms</TableHead>
                <TableHead>Bathrooms</TableHead>
                <TableHead>Kitchen</TableHead>
                <TableHead>Balcony</TableHead>
                <TableHead>Rent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    {capIsSet ? 'No units yet. Click "Add unit" to create one.' : "No units yet."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
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
                          {["apartment", "office", "shop", "parking", "common"].map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void saveRow(index)}
                          disabled={savingIndex === index}
                          aria-label="Save"
                        >
                          <Save className="size-4 text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => void removeRow(index)} aria-label="Delete">
                          {row.id ? <Trash2 className="size-4 text-destructive" /> : <X className="size-4" />}
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
    </AppShell>
  );
}