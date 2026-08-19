import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscription — EstateOps" },
      { name: "description", content: "Platform subscription plan and billing." },
      { property: "og:title", content: "Subscription — EstateOps" },
      { property: "og:description", content: "Platform subscription plan and billing." },
    ],
  }),
  component: () => <ResourcePage resource="subscriptions" />,
});