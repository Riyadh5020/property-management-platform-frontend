import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — EstateOps" },
      { name: "description", content: "Tenant requests, preventive schedules and common area upkeep." },
      { property: "og:title", content: "Maintenance — EstateOps" },
      { property: "og:description", content: "Tenant requests, preventive schedules and common area upkeep." },
    ],
  }),
  component: () => <ResourcePage resource="maintenance" />,
});
