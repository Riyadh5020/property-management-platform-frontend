import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/owners")({
  head: () => ({
    meta: [
      { title: "Owners & Investors — EstateOps" },
      { name: "description", content: "Unit ownership, owner dues, payouts and profit sharing." },
      { property: "og:title", content: "Owners & Investors — EstateOps" },
      { property: "og:description", content: "Unit ownership, owner dues, payouts and profit sharing." },
    ],
  }),
  component: () => <ResourcePage resource="owners" />,
});
