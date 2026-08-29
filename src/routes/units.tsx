
// src/routes/units.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { floorApi, propertyApi, type ApiFloor, type ApiProperty } from "@/lib/api";

export const Route = createFileRoute("/units")({
  head: () => ({ meta: [{ title: "Units — EstateOps" }] }),
  component: UnitsLandingPage,
});

function UnitsLandingPage() {
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [properties, setProperties] = useState<Record<string, ApiProperty>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const floorResult = await floorApi.list({ limit: 200 });
        setFloors(floorResult.items);

        const propertyResult = await propertyApi.list({ limit: 200 });
        const byId: Record<string, ApiProperty> = {};
        propertyResult.items.forEach((p) => (byId[p.id] = p));
        setProperties(byId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load floors");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Units"
        description="Pick a floor to view and manage its units."
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading floors…</p>
      ) : floors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          No floors yet. Ask your superAdmin to add floors under a property first.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {floors.map((floor) => {
            const property = properties[floor.propertyId];
            return (
              <Link
                key={floor.id}
                to="/floors/$floorId/units"
                params={{ floorId: floor.id }}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {property ? property.title : "Property"} — Floor {floor.floorNumber}
                    {floor.name ? ` (${floor.name})` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {floor.totalUnits != null ? `Capacity: ${floor.totalUnits} units` : "No unit cap set"}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

// import { createFileRoute } from "@tanstack/react-router";
// import { ArrowRight, Plus, Save, Trash2, X } from "lucide-react";
// import { useEffect, useState } from "react";
// import { toast } from "sonner";

// import { AppShell, PageHeader } from "@/components/app-shell";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { floorApi, unitApi, type ApiFloor, type ApiUnit, type UnitStatus, type UnitType } from "@/lib/api";
// import { useAuth } from "@/lib/auth";

// export const Route = createFileRoute("/units")({
//   head: () => ({
//     meta: [{ title: "Units — EstateOps" }],
//   }),
//   component: UnitsPage,
// });

// type DraftUnit = {
//   id?: string;
//   unitCode: string;
//   unitType: UnitType;
//   areaSize: string;
//   bedrooms: string;
//   bathrooms: string;
//   hasKitchen: boolean;
//   hasBalcony: boolean;
//   rent: string;
//   status: UnitStatus;
// };

// const emptyDraft = (): DraftUnit => ({
//   unitCode: "",
//   unitType: "apartment",
//   areaSize: "",
//   bedrooms: "",
//   bathrooms: "",
//   hasKitchen: false,
//   hasBalcony: false,
//   rent: "",
//   status: "vacant",
// });

// function toDraft(u: ApiUnit): DraftUnit {
//   return {
//     id: u.id,
//     unitCode: u.unitCode,
//     unitType: u.unitType,
//     areaSize: String(u.areaSize ?? ""),
//     bedrooms: u.bedrooms != null ? String(u.bedrooms) : "",
//     bathrooms: u.bathrooms != null ? String(u.bathrooms) : "",
//     hasKitchen: !!u.hasKitchen,
//     hasBalcony: !!u.hasBalcony,
//     rent: u.rent != null ? String(u.rent) : "",
//     status: u.status,
//   };
// }

// function UnitsPage() {
//   const { admin } = useAuth();
//   const role = admin?.admin?.role;

//   const [floors, setFloors] = useState<ApiFloor[]>([]);
//   const [floorsLoading, setFloorsLoading] = useState(true);
//   const [selectedFloorId, setSelectedFloorId] = useState<string>("");

//   const [rows, setRows] = useState<DraftUnit[]>([]);
//   const [rowsLoading, setRowsLoading] = useState(false);
//   const [savingIndex, setSavingIndex] = useState<number | null>(null);

//   useEffect(() => {
//     const loadFloors = async () => {
//       setFloorsLoading(true);
//       try {
//         const result = await floorApi.list({ limit: 200 });
//         setFloors(result.items);
//       } catch (err) {
//         toast.error(err instanceof Error ? err.message : "Could not load floors");
//       } finally {
//         setFloorsLoading(false);
//       }
//     };
//     void loadFloors();
//   }, []);

//   const selectedFloor = floors.find((f) => f.id === selectedFloorId) ?? null;

//   const loadUnits = async (floorId: string) => {
//     setRowsLoading(true);
//     try {
//       const result = await unitApi.list({ floorId, limit: 200 });
//       setRows(result.items.map(toDraft));
//     } catch (err) {
//       toast.error(err instanceof Error ? err.message : "Could not load units");
//     } finally {
//       setRowsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (selectedFloorId) void loadUnits(selectedFloorId);
//     else setRows([]);
//   }, [selectedFloorId]);

//   const cap = selectedFloor?.totalUnits ?? null;
//   const atCap = cap !== null && rows.length >= cap;

//   const addRow = () => {
//     if (!selectedFloorId) {
//       toast.error("Select a floor first");
//       return;
//     }
//     if (atCap) {
//       toast.error(`This floor is capped at ${cap} unit${cap === 1 ? "" : "s"}.`);
//       return;
//     }
//     setRows((prev) => [...prev, emptyDraft()]);
//   };

//   const updateRow = (index: number, patch: Partial<DraftUnit>) => {
//     setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
//   };

//   const removeRow = async (index: number) => {
//     const row = rows[index];
//     if (!row) return;
//     if (!row.id) {
//       setRows((prev) => prev.filter((_, i) => i !== index));
//       return;
//     }
//     try {
//       await unitApi.remove(row.id);
//       toast.success("Unit deleted");
//       await loadUnits(selectedFloorId);
//     } catch (err) {
//       toast.error(err instanceof Error ? err.message : "Could not delete unit");
//     }
//   };

//   const saveRow = async (index: number) => {
//     const row = rows[index];
//     if (!row) return;

//     if (!row.unitCode.trim()) {
//       toast.error("Unit code is required");
//       return;
//     }
//     if (!row.areaSize || Number(row.areaSize) <= 0) {
//       toast.error("Area size must be greater than 0");
//       return;
//     }

//     setSavingIndex(index);
//     try {
//       const payload = {
//         floorId: selectedFloorId,
//         unitCode: row.unitCode.trim(),
//         unitType: row.unitType,
//         areaSize: Number(row.areaSize),
//         bedrooms: row.bedrooms === "" ? null : Number(row.bedrooms),
//         bathrooms: row.bathrooms === "" ? null : Number(row.bathrooms),
//         hasKitchen: row.hasKitchen,
//         hasBalcony: row.hasBalcony,
//         rent: row.rent === "" ? null : Number(row.rent),
//         status: row.status,
//       };

//       const result = row.id ? await unitApi.update(row.id, payload) : await unitApi.create(payload);
//       toast.success(row.id ? "Unit updated" : "Unit created");

//       const warning = (result as ApiUnit & { areaWarning?: string }).areaWarning;
//       if (warning) toast.warning(warning);

//       await loadUnits(selectedFloorId);
//     } catch (err) {
//       toast.error(err instanceof Error ? err.message : "Could not save unit");
//     } finally {
//       setSavingIndex(null);
//     }
//   };

//   return (
//     <AppShell>
//       <PageHeader
//         title="Units"
//         description="Pick a floor, then add or edit its units directly in the table below."
//       />

//       <div className="mb-4 flex items-center gap-3">
//         <div className="w-64">
//           <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
//             <SelectTrigger>
//               <SelectValue placeholder={floorsLoading ? "Loading floors…" : "Select a floor…"} />
//             </SelectTrigger>
//             <SelectContent>
//               {floors.map((f) => (
//               <SelectItem key={f.id} value={f.id}>
//   Floor {f.floorNumber}
//   {f.name && f.name.trim() && f.name.trim().toLowerCase() !== `floor ${f.floorNumber}` ? ` (${f.name.trim()})` : ""}
// </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//         {selectedFloor ? (
//           <p className="text-sm text-muted-foreground">
//             {cap !== null ? `${rows.length} of ${cap} units used on this floor.` : "No unit cap set on this floor."}
//           </p>
//         ) : (
//           <p className="text-sm text-muted-foreground">
//             <ArrowRight className="mr-1 inline size-3.5" />
//             Select a floor to manage its units.
//           </p>
//         )}
//    <Button size="sm" className="ml-auto" onClick={addRow} disabled={!selectedFloorId || atCap}>
//   <Plus className="size-4" />
//   {atCap ? "Floor full" : cap !== null ? `Add unit (${cap - rows.length} left)` : "Add unit"}
// </Button>
//       </div>

//       {selectedFloorId ? (
//         <div className="overflow-hidden rounded-xl border border-border bg-card">
//           <div className="overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Unit code</TableHead>
//                   <TableHead>Type</TableHead>
//                   <TableHead>Area (sqft)</TableHead>
//                   <TableHead>Bedrooms</TableHead>
//                   <TableHead>Bathrooms</TableHead>
//                   <TableHead>Kitchen</TableHead>
//                   <TableHead>Balcony</TableHead>
//                   <TableHead>Rent</TableHead>
//                   <TableHead>Status</TableHead>
//                   <TableHead className="w-20 text-right">Actions</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {rowsLoading ? (
//                   <TableRow>
//                     <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
//                       Loading…
//                     </TableCell>
//                   </TableRow>
//                 ) : rows.length === 0 ? (
//                   <TableRow>
//                     <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
//                       No units yet. Click "Add unit" to create one.
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   rows.map((row, index) => (
//                     <TableRow key={row.id ?? `new-${index}`}>
//                       <TableCell>
//                         <Input
//                           value={row.unitCode}
//                           onChange={(e) => updateRow(index, { unitCode: e.target.value })}
//                           placeholder="A1"
//                           className="h-8 w-24"
//                         />
//                       </TableCell>
//                       <TableCell>
//                         <Select value={row.unitType} onValueChange={(v) => updateRow(index, { unitType: v as UnitType })}>
//                           <SelectTrigger className="h-8 w-28">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {["apartment", "office", "shop", "parking", "common"].map((t) => (
//                               <SelectItem key={t} value={t}>
//                                 {t}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       </TableCell>
//                       <TableCell>
//                         <Input
//                           type="number"
//                           value={row.areaSize}
//                           onChange={(e) => updateRow(index, { areaSize: e.target.value })}
//                           className="h-8 w-20"
//                         />
//                       </TableCell>
//                       <TableCell>
//                         <Input
//                           type="number"
//                           value={row.bedrooms}
//                           onChange={(e) => updateRow(index, { bedrooms: e.target.value })}
//                           className="h-8 w-16"
//                           disabled={row.unitType === "parking" || row.unitType === "common"}
//                         />
//                       </TableCell>
//                       <TableCell>
//                         <Input
//                           type="number"
//                           value={row.bathrooms}
//                           onChange={(e) => updateRow(index, { bathrooms: e.target.value })}
//                           className="h-8 w-16"
//                           disabled={row.unitType === "parking" || row.unitType === "common"}
//                         />
//                       </TableCell>
//                       <TableCell>
//                         <Select
//                           value={row.hasKitchen ? "true" : "false"}
//                           onValueChange={(v) => updateRow(index, { hasKitchen: v === "true" })}
//                           disabled={row.unitType === "parking" || row.unitType === "common"}
//                         >
//                           <SelectTrigger className="h-8 w-20">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="true">Yes</SelectItem>
//                             <SelectItem value="false">No</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </TableCell>
//                       <TableCell>
//                         <Select
//                           value={row.hasBalcony ? "true" : "false"}
//                           onValueChange={(v) => updateRow(index, { hasBalcony: v === "true" })}
//                           disabled={row.unitType === "parking" || row.unitType === "common"}
//                         >
//                           <SelectTrigger className="h-8 w-20">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem value="true">Yes</SelectItem>
//                             <SelectItem value="false">No</SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </TableCell>
//                       <TableCell>
//                         <Input
//                           type="number"
//                           value={row.rent}
//                           onChange={(e) => updateRow(index, { rent: e.target.value })}
//                           className="h-8 w-20"
//                         />
//                       </TableCell>
//                       <TableCell>
//                         <Select value={row.status} onValueChange={(v) => updateRow(index, { status: v as UnitStatus })}>
//                           <SelectTrigger className="h-8 w-28">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             {["vacant", "occupied", "reserved", "maintenance"].map((s) => (
//                               <SelectItem key={s} value={s}>
//                                 {s}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <div className="flex justify-end gap-1">
//                           <Button
//                             variant="ghost"
//                             size="icon"
//                             onClick={() => void saveRow(index)}
//                             disabled={savingIndex === index}
//                             aria-label="Save"
//                           >
//                             <Save className="size-4 text-emerald-600" />
//                           </Button>
//                           <Button variant="ghost" size="icon" onClick={() => void removeRow(index)} aria-label="Delete">
//                             {row.id ? <Trash2 className="size-4 text-destructive" /> : <X className="size-4" />}
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </div>
//       ) : (
//         <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
//           Pick a floor above to see and manage its units.
//         </div>
//       )}
//     </AppShell>
//   );
// }