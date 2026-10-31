import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { billingApi } from "@/lib/api";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "Export data — EstateOps" },
      { name: "description", content: "Download your records as spreadsheet files." },
    ],
  }),
  component: ExportPage,
});

const TYPES = [
  { type: "properties", label: "Properties" },
  { type: "tenants", label: "Tenants" },
  { type: "leases", label: "Leases" },
  { type: "invoices", label: "Rent invoices" },
  { type: "payments", label: "Rent payments" },
  { type: "expenses", label: "Expenses" },
];

function ExportPage() {
  const [busy, setBusy] = useState<string | null>(null);

  const download = async (type: string) => {
    setBusy(type);
    try {
      const { filename, csv } = await billingApi.exportData(type);
      // The byte order mark makes Excel read Bangla text correctly.
      const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Export data"
        description="Download a copy of your records. The files open in Excel or Google Sheets and include private tenant details, so keep them safe."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TYPES.map((t) => (
          <div key={t.type} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <span className="text-sm font-medium">{t.label}</span>
            <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => void download(t.type)}>
              <Download className="size-4" /> {busy === t.type ? "Preparing…" : "Download"}
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
