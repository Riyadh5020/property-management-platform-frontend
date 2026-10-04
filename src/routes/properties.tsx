import { OwnerDrill } from "@/components/owner-drill";
import { ResourcePage } from "@/components/resource-page";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

export const Route = createFileRoute("/properties")({
  validateSearch: (s: Record<string, unknown>): { ownerId?: string | undefined; view?: "all" | undefined } => ({
    ownerId: str(s["ownerId"]),
    view: s["view"] === "all" ? "all" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Properties — EstateOps" },
      { name: "description", content: "Properties registered on the platform." },
      { property: "og:title", content: "Properties — EstateOps" },
      { property: "og:description", content: "Properties registered on the platform." },
    ],
  }),
  component: PropertiesRoute,
});

function PropertiesRoute() {
  const { ownerId, view } = Route.useSearch();
  const { admin } = useAuth();
  const navigate = useNavigate();
  const role = admin?.admin?.role;

  if (role === "superAdmin" && !ownerId && view !== "all") {
    return (
      <OwnerDrill
        title="Properties"
        description="Pick an owner to see and manage their properties."
        propertyButton=""
        ownerId={undefined}
        onOwner={(id) => void navigate({ to: "/properties", search: { ownerId: id } })}
        onProperty={() => undefined}
        onBack={() => undefined}
        headerActions={
          <Button size="sm" variant="secondary" onClick={() => void navigate({ to: "/properties", search: { view: "all" } })}>
            All properties / New property
          </Button>
        }
      />
    );
  }
  return <ResourcePage key={ownerId ?? "all"} resource="properties" fixedOwnerId={ownerId} />;
}