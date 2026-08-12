import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/utilities")({
  head: () => ({
    meta: [
      { title: "Utilities — EstateOps" },
      { name: "description", content: "Meter readings, utility bill calculation and vendor management." },
      { property: "og:title", content: "Utilities — EstateOps" },
      { property: "og:description", content: "Meter readings, utility bill calculation and vendor management." },
    ],
  }),
  component: () => <ResourcePage resource="utilities" />,
});
