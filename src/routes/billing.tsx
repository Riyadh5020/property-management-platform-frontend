import { createFileRoute } from "@tanstack/react-router";

import { ResourcePage } from "@/components/resource-page";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Rent & Billing — EstateOps" },
      { name: "description", content: "Monthly rent invoices, utility charges, penalties and receipts." },
      { property: "og:title", content: "Rent & Billing — EstateOps" },
      { property: "og:description", content: "Monthly rent invoices, utility charges, penalties and receipts." },
    ],
  }),
  component: () => <ResourcePage resource="invoices" />,
});
