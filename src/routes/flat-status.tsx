import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/flat-status")({
  head: () => ({
    meta: [
      { title: "Flat Status — EstateOps" },
      { name: "description", content: "Live occupancy and condition status per flat." },
      { property: "og:title", content: "Flat Status — EstateOps" },
      { property: "og:description", content: "Live occupancy and condition status per flat." },
    ],
  }),
  component: () => <ResourcePage resource="flatStatus" />,
});