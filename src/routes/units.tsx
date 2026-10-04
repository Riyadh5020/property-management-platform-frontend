import { AppShell, PageHeader } from "@/components/app-shell";
import { OwnerDrill } from "@/components/owner-drill";
import { PropertyPicker } from "@/components/property-picker";
import { Button } from "@/components/ui/button";
import { floorApi, propertyApi, type ApiFloor, type ApiProperty } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/units")({
  validateSearch: (s: Record<string, unknown>): { ownerId?: string | undefined; propertyId?: string | undefined } => ({
    ownerId: str(s["ownerId"]),
    propertyId: str(s["propertyId"]),
  }),
  head: () => ({ meta: [{ title: "Units — EstateOps" }] }),
  component: UnitsRoute,
});

function UnitsRoute() {
  const { ownerId, propertyId } = Route.useSearch();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const role = admin?.admin?.role;

  if (propertyId) {
    return (
      <PropertyFloors
        propertyId={propertyId}
        onBack={() => void navigate({ to: "/units", search: { ownerId } })}
      />
    );
  }

  if (role === "superAdmin") {
    return (
      <OwnerDrill
        title="Units"
        description="Pick an owner, then a property, then a floor to manage its units."
        propertyButton="View floors"
        ownerId={ownerId}
        onOwner={(id) => void navigate({ to: "/units", search: { ownerId: id } })}
        onProperty={(id) => void navigate({ to: "/units", search: { ownerId, propertyId: id } })}
        onBack={() => void navigate({ to: "/units", search: {} })}
      />
    );
  }

  return (
    <PropertyPicker
      title="Units"
      description="Pick a property, then a floor, to manage its units."
      buttonLabel="View floors"
      onProperty={(id) => void navigate({ to: "/units", search: { propertyId: id } })}
    />
  );
}

function FloorCards({ floors, titleOf }: { floors: ApiFloor[]; titleOf: (f: ApiFloor) => string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {floors.map((floor) => (
        <Link
          key={floor.id}
          to="/units/$floorId"
          params={{ floorId: floor.id }}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {titleOf(floor)}
              {floor.name ? ` (${floor.name})` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {floor.totalUnits != null ? `Capacity: ${floor.totalUnits} units` : "No unit cap set"}
            </p>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

function PropertyFloors({ propertyId, onBack }: { propertyId: string; onBack: () => void }) {
  const [floors, setFloors] = useState<ApiFloor[]>([]);
  const [property, setProperty] = useState<ApiProperty | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [f, p] = await Promise.all([
          floorApi.list({ propertyId, limit: 200, sortBy: "floorNumber", sortDir: "asc" }),
          propertyApi.get(propertyId),
        ]);
        setFloors(f.items);
        setProperty(p);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load floors");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [propertyId]);

  return (
    <AppShell>
      <Button variant="ghost" size="sm" className="mb-2" onClick={onBack}>
        <ArrowLeft className="size-4" /> Back to properties
      </Button>
      <PageHeader title={property?.title ?? "Units"} description="Pick a floor to view and manage its units." />
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading floors…</p>
      ) : floors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
          No floors on this property yet.
        </div>
      ) : (
        <FloorCards floors={floors} titleOf={(f) => `Floor ${f.floorNumber}`} />
      )}
    </AppShell>
  );
}

// function FlatFloors() {
//   const [floors, setFloors] = useState<ApiFloor[]>([]);
//   const [properties, setProperties] = useState<Record<string, ApiProperty>>({});
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const load = async () => {
//       setLoading(true);
//       try {
//         const floorResult = await floorApi.list({ limit: 200 });
//         setFloors(floorResult.items);
//         const propertyResult = await propertyApi.list({ limit: 200 });
//         const byId: Record<string, ApiProperty> = {};
//         propertyResult.items.forEach((p) => (byId[p.id] = p));
//         setProperties(byId);
//       } catch (err) {
//         toast.error(err instanceof Error ? err.message : "Could not load floors");
//       } finally {
//         setLoading(false);
//       }
//     };
//     void load();
//   }, []);

//   return (
//     <AppShell>
//       <PageHeader title="Units" description="Pick a floor to view and manage its units." />
//       {loading ? (
//         <p className="text-sm text-muted-foreground">Loading floors…</p>
//       ) : floors.length === 0 ? (
//         <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
//           No floors yet. Ask your superAdmin to add floors under a property first.
//         </div>
//       ) : (
//         <FloorCards
//           floors={floors}
//           titleOf={(f) => `${properties[f.propertyId]?.title ?? "Property"} — Floor ${f.floorNumber}`}
//         />
//       )}
//     </AppShell>
//   );
// }