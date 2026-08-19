import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/emergency-contacts")({
  head: () => ({
    meta: [
      { title: "Emergency Contacts — EstateOps" },
      { name: "description", content: "Emergency contacts per building." },
      { property: "og:title", content: "Emergency Contacts — EstateOps" },
      { property: "og:description", content: "Emergency contacts per building." },
    ],
  }),
  component: () => <ResourcePage resource="emergencyContacts" />,
});