import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/amenities")({
  head: () => ({
    meta: [
      { title: "Amenities — EstateOps" },
      { name: "description", content: "Gym, parking, rooftop and other shared building amenities." },
      { property: "og:title", content: "Amenities — EstateOps" },
      { property: "og:description", content: "Gym, parking, rooftop and other shared building amenities." },
    ],
  }),
  component: () => <ResourcePage resource="amenities" />,
});
