import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/visitors")({
  head: () => ({
    meta: [
      { title: "Visitors & Security — EstateOps" },
      { name: "description", content: "Visitor logs, deliveries, guard duty and incident reports." },
      { property: "og:title", content: "Visitors & Security — EstateOps" },
      { property: "og:description", content: "Visitor logs, deliveries, guard duty and incident reports." },
    ],
  }),
  component: () => <ResourcePage resource="visitors" />,
});
