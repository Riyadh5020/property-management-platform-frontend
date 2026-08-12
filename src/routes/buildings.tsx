import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/buildings")({
  head: () => ({
    meta: [
      { title: "Buildings — EstateOps" },
      { name: "description", content: "Register multiple buildings, floors and unit counts across your portfolio." },
      { property: "og:title", content: "Buildings — EstateOps" },
      { property: "og:description", content: "Register multiple buildings, floors and unit counts across your portfolio." },
    ],
  }),
  component: () => <ResourcePage resource="buildings" />,
});
