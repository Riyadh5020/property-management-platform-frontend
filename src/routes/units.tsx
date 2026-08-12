import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/units")({
  head: () => ({
    meta: [
      { title: "Units — EstateOps" },
      { name: "description", content: "Apartment, office and shop units with size, furnishing and live status." },
      { property: "og:title", content: "Units — EstateOps" },
      { property: "og:description", content: "Apartment, office and shop units with size, furnishing and live status." },
    ],
  }),
  component: () => <ResourcePage resource="units" />,
});
