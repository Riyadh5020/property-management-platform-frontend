import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants — EstateOps" },
      { name: "description", content: "Tenant profiles, ID documents, co-tenants and move-in/move-out tracking." },
      { property: "og:title", content: "Tenants — EstateOps" },
      { property: "og:description", content: "Tenant profiles, ID documents, co-tenants and move-in/move-out tracking." },
    ],
  }),
  component: () => <ResourcePage resource="tenants" />,
});
