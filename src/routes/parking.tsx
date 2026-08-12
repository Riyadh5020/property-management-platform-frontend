import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/parking")({
  head: () => ({
    meta: [
      { title: "Parking — EstateOps" },
      { name: "description", content: "Parking slot assignment, visitor parking and parking fees." },
      { property: "og:title", content: "Parking — EstateOps" },
      { property: "og:description", content: "Parking slot assignment, visitor parking and parking fees." },
    ],
  }),
  component: () => <ResourcePage resource="parking" />,
});
