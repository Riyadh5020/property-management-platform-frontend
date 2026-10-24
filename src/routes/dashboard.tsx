import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  Layers,
  LayoutGrid,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardApi, type ApiDashboardStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EstateOps Property Management" },
      {
        name: "description",
        content: "Portfolio overview: properties, floors, units, managers and subscriptions.",
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

const STATUS_COLORS: Record<string, string> = {
  vacant: "bg-emerald-500",
  occupied: "bg-blue-500",
  reserved: "bg-amber-500",
  maintenance: "bg-red-500",
};

function DashboardPage() {
  const { admin, ready } = useAuth();
  const role = admin?.admin?.role;
  const [stats, setStats] = useState<ApiDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    dashboardApi
      .stats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load dashboard"));
  }, [ready, admin?.token]);

  const totalUnits = stats?.totals.units ?? 0;
  const statusMap = new Map((stats?.unitsByStatus ?? []).map((s) => [s.status, s.count]));
  const occupied = statusMap.get("occupied") ?? 0;
  const occupancy = totalUnits ? Math.round((occupied / totalUnits) * 100) : 0;

  return (
    <AppShell>
      <PageHeader
        title="Portfolio overview"
        description="Live snapshot across every property you manage."
        actions={
          role !== "manager" ? (
            <Button asChild size="sm" variant="secondary">
              <Link to="/requests">Requests</Link>
            </Button>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Properties"
              value={String(stats.totals.properties)}
              hint={`${stats.totals.floors} floors in total`}
              icon={Building2}
            />
            <StatCard
              label="Units"
              value={String(stats.totals.units)}
              hint={`${occupancy}% occupied`}
              icon={LayoutGrid}
            />
            <StatCard
              label="Floors"
              value={String(stats.totals.floors)}
              hint="across your properties"
              icon={Layers}
            />
            {role !== "manager" ? (
              <StatCard
                label="Managers"
                value={String(stats.totals.managers)}
                hint={role === "owner" ? "working for you" : "on the platform"}
                icon={Users}
              />
            ) : null}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
              <h2 className="mb-4 font-semibold">Units by status</h2>
              {stats.unitsByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">No units yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.unitsByStatus.map((s) => {
                    const pct = totalUnits ? Math.round((s.count / totalUnits) * 100) : 0;
                    return (
                      <div key={s.status}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="capitalize">{s.status}</span>
                          <span className="text-muted-foreground">
                            {s.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full ${STATUS_COLORS[s.status] ?? "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {stats.pendingRequests ? (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">Pending requests</h2>
                  <ClipboardList className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between rounded-lg border border-border px-3 py-2">
                    <span>Property requests</span>
                    <Badge variant="secondary">{stats.pendingRequests.property}</Badge>
                  </div>
                  <div className="flex justify-between rounded-lg border border-border px-3 py-2">
                    <span>Floor requests</span>
                    <Badge variant="secondary">{stats.pendingRequests.floor}</Badge>
                  </div>
                  <Button asChild size="sm" variant="ghost" className="w-full">
                    <Link to="/requests">Open requests</Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {role !== "manager" ? (
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="size-4 text-primary" />
                <h2 className="font-semibold">Subscriptions ending within 30 days</h2>
              </div>
              {stats.expiringSubscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions are ending soon.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {stats.expiringSubscriptions.map((s) => (
                    <div key={s.id} className="rounded-lg border border-border px-4 py-3">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.planName ?? "No plan"} · ends {String(s.subscriptionEndsAt).slice(0, 10)}
                      </p>
                      <Badge
                        className="mt-2"
                        variant={s.daysLeft <= 7 ? "destructive" : "secondary"}
                      >
                        {s.daysLeft <= 0 ? "Expired" : `${s.daysLeft} days left`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}