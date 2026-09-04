import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/floors")({
  head: () => ({
    meta: [
      { title: "Floors — EstateOps" },
      { name: "description", content: "Floors registered under each building." },
      { property: "og:title", content: "Floors — EstateOps" },
      { property: "og:description", content: "Floors registered under each building." },
    ],
  }),
  component: () => <ResourcePage resource="floors" />,
});