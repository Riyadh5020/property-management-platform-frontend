import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/leases")({
  head: () => ({
    meta: [
      { title: "Leases — EstateOps" },
      { name: "description", content: "Lease agreements, renewals, rent escalation and deposits." },
      { property: "og:title", content: "Leases — EstateOps" },
      { property: "og:description", content: "Lease agreements, renewals, rent escalation and deposits." },
    ],
  }),
  component: () => <ResourcePage resource="leases" />,
});
