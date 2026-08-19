import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — EstateOps" },
      { name: "description", content: "Operating expenses logged per building." },
      { property: "og:title", content: "Expenses — EstateOps" },
      { property: "og:description", content: "Operating expenses logged per building." },
    ],
  }),
  component: () => <ResourcePage resource="expenses" />,
});