import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/building-accounts")({
  head: () => ({
    meta: [
      { title: "Building Accounts — EstateOps" },
      { name: "description", content: "Per-building financial summary." },
      { property: "og:title", content: "Building Accounts — EstateOps" },
      { property: "og:description", content: "Per-building financial summary." },
    ],
  }),
  component: () => <ResourcePage resource="buildingAccounts" />,
});