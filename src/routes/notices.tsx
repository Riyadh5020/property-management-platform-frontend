import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/notices")({
  head: () => ({
    meta: [
      { title: "Notices — EstateOps" },
      { name: "description", content: "Announcements posted to owners and managers." },
      { property: "og:title", content: "Notices — EstateOps" },
      { property: "og:description", content: "Announcements posted to owners and managers." },
    ],
  }),
  component: () => <ResourcePage resource="notices" />,
});