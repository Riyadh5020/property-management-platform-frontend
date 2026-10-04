import { OwnerDrill } from "@/components/owner-drill";
import { PropertyPicker } from "@/components/property-picker";
import { ResourcePage } from "@/components/resource-page";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/floors")({
  validateSearch: (s: Record<string, unknown>): { ownerId?: string | undefined; propertyId?: string | undefined } => ({
    ownerId: str(s["ownerId"]),
    propertyId: str(s["propertyId"]),
  }),
  head: () => ({
    meta: [
      { title: "Floors — EstateOps" },
      { name: "description", content: "Floors registered under each building." },
      { property: "og:title", content: "Floors — EstateOps" },
      { property: "og:description", content: "Floors registered under each building." },
    ],
  }),
  component: FloorsRoute,
});

function FloorsRoute() {
  const { ownerId, propertyId } = Route.useSearch();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const role = admin?.admin?.role;

  if (!propertyId) {
    if (role === "superAdmin") {
      return (
        <OwnerDrill
          title="Floors"
          description="Pick an owner, then a property, to manage its floors."
          propertyButton="View floors"
          ownerId={ownerId}
          onOwner={(id) => void navigate({ to: "/floors", search: { ownerId: id } })}
          onProperty={(id) => void navigate({ to: "/floors", search: { ownerId, propertyId: id } })}
          onBack={() => void navigate({ to: "/floors", search: {} })}
        />
      );
    }
    return (
      <PropertyPicker
        title="Floors"
        description="Pick a property to see its floors."
        buttonLabel="View floors"
        onProperty={(id) => void navigate({ to: "/floors", search: { propertyId: id } })}
      />
    );
  }

  return <ResourcePage key={propertyId} resource="floors" fixedParentId={propertyId} />;
}