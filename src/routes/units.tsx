
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
               key={floor.id} to="/units/$floorId" params={{ floorId: floor.id }}
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
