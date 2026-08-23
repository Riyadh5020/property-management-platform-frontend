import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/properties")({
  head: () => ({
    meta: [
      { title: "Properties — EstateOps" },
      { name: "description", content: "Properties registered on the platform." },
      { property: "og:title", content: "Properties — EstateOps" },
      { property: "og:description", content: "Properties registered on the platform." },
    ],
  }),
  component: () => <ResourcePage resource="properties" />,
});