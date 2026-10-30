import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [{ title: "Support — EstateOps" }, { name: "description", content: "Report a problem and read the reply." }],
  }),
  component: () => <ResourcePage resource="tickets" />,
});
