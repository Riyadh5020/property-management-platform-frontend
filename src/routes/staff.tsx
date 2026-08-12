import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff — EstateOps" },
      { name: "description", content: "Building-wise staff, duty scheduling and attendance." },
      { property: "og:title", content: "Staff — EstateOps" },
      { property: "og:description", content: "Building-wise staff, duty scheduling and attendance." },
    ],
  }),
  component: () => <ResourcePage resource="staff" />,
});
