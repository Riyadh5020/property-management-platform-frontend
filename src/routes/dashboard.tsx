import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, useCollection } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EstateOps Property Management" },
      {
        name: "description",
        content: "Portfolio overview: occupancy, rent collection, open maintenance and overdue invoices.",
      },
      { property: "og:title", content: "Dashboard — EstateOps" },
      { property: "og:description", content: "Your property portfolio at a glance." },
    ],
  }),
  component: DashboardPage,
});

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function DashboardPage() {
  const properties = useCollection("properties");
  const units = useCollection("units");
  const tenants = useCollection("tenants");
  const invoices = useCollection("invoices");
  const maintenance = useCollection("maintenance");
  const leases = useCollection("leases");

  const occupied = units.rows.filter((u) => u["status"] === "occupied").length;
  const occupancy = units.rows.length ? Math.round((occupied / units.rows.length) * 100) : 0;
  const billed = invoices.rows.reduce(
    (sum, i) => sum + Number(i["rent"] ?? 0) + Number(i["utilities"] ?? 0) + Number(i["penalty"] ?? 0),
    0,
  );
  const collected = invoices.rows.reduce((sum, i) => sum + Number(i["paid"] ?? 0), 0);
  const overdue = invoices.rows.filter((i) => i["status"] === "Overdue" || i["status"] === "Unpaid");
  const openWork = maintenance.rows.filter((m) => m["status"] !== "Completed" && m["status"] !== "Cancelled");

  const expiring = leases.rows
    .filter((l) => {
      const end = new Date(String(l["endDate"] ?? ""));
      if (Number.isNaN(end.getTime())) return false;
      const days = (end.getTime() - Date.now()) / 86_400_000;
      return days < 240;
    })
    .slice(0, 4);

  return (
    <AppShell>
      <PageHeader
        title="Portfolio overview"
        description="Live snapshot across every property you manage."
        actions={
          <Button asChild size="sm" variant="secondary">
            <Link to="/reports">View reports</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Properties"
          value={String(properties.rows.length)}
          hint={`${units.rows.length} units registered`}
          icon={Building2}
        />
        <StatCard
          label="Occupancy"
          value={`${occupancy}%`}
          hint={`${occupied} occupied · ${units.rows.length - occupied} available`}
          icon={TrendingUp}
        />
        <StatCard
          label="Collected this cycle"
          value={formatMoney(collected)}
          hint={`of ${formatMoney(billed)} billed`}
          icon={ReceiptText}
        />
        <StatCard
          label="Active tenants"
          value={String(tenants.rows.filter((t) => t["status"] === "Active").length)}
          hint={`${tenants.rows.length} tenant records`}
          icon={Users}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Payments needing attention</h2>
            <Button asChild size="sm" variant="ghost">
              <Link to="/billing">Open billing</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">Everything is collected. Nice.</p>
            ) : (
              overdue.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{String(invoice["tenant"])}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(invoice["number"])} · unit {String(invoice["unit"])} · due {String(invoice["dueDate"])}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {formatMoney(
                        Number(invoice["rent"] ?? 0) +
                          Number(invoice["utilities"] ?? 0) +
                          Number(invoice["penalty"] ?? 0) -
                          Number(invoice["paid"] ?? 0),
                      )}
                    </span>
                    <Badge variant="destructive">{String(invoice["status"])}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Open work orders</h2>
            <ClipboardList className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {openWork.slice(0, 5).map((task) => (
              <div key={task.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-sm font-medium">{String(task["title"])}</p>
                <p className="text-xs text-muted-foreground">
                  {String(task["building"])} · {String(task["priority"])} priority
                </p>
              </div>
            ))}
            {openWork.length === 0 ? <p className="text-sm text-muted-foreground">No open maintenance.</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="size-4 text-primary" />
          <h2 className="font-semibold">Lease renewals coming up</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {expiring.length === 0 ? (
            <p className="text-sm text-muted-foreground">No renewals within the alert window.</p>
          ) : (
            expiring.map((lease) => (
              <div key={lease.id} className="rounded-lg border border-border px-4 py-3">
                <p className="text-sm font-medium">{String(lease["tenant"])}</p>
                <p className="text-xs text-muted-foreground">
                  Unit {String(lease["unit"])} · ends {String(lease["endDate"])}
                </p>
                <p className="mt-2 text-xs text-primary">+{String(lease["escalation"])}% escalation on renewal</p>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}