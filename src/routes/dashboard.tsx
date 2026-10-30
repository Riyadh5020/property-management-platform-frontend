import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Circle,
  ClipboardList,
  Layers,
  LayoutGrid,
  Receipt,
  UserPlus,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { dashboardApi, type ApiDashboardStats } from "@/lib/api";
import { invoiceApi, maintenanceApi } from "@/lib/api";
import { displayName, useAuth } from "@/lib/auth";

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

// One-click shortcuts to the most common jobs, limited to what this person may do.
function QuickActions({ can }: { can: (key: "tenants" | "rent" | "maintenance" | "expenses") => boolean }) {
  const actions = [
    { to: "/tenants", label: "Add a tenant", icon: UserPlus, show: can("tenants") },
    { to: "/billing", label: "Record rent", icon: Receipt, show: can("rent") },
    { to: "/maintenance", label: "Report a repair", icon: Wrench, show: can("maintenance") },
    { to: "/expenses", label: "Add an expense", icon: Wallet, show: can("expenses") },
  ].filter((a) => a.show);
  if (actions.length === 0) return null;
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
        >
          <a.icon className="size-5 text-primary" />
          {a.label}
        </Link>
      ))}
    </div>
  );
}

// What needs attention right now, with a link straight to it.
function TodayTasks({ can, isManager }: { can: (key: "rent" | "maintenance") => boolean; isManager: boolean }) {
  const [tasks, setTasks] = useState<{ to: string; label: string; count: number }[] | null>(null);

  useEffect(() => {
    const count = (promise: Promise<{ total: number }>) => promise.then((r) => r.total).catch(() => 0);
    void Promise.all([
      can("rent") ? count(invoiceApi.list({ status: "unpaid", limit: 1 })) : 0,
      can("rent") ? count(invoiceApi.list({ status: "partial", limit: 1 })) : 0,
      can("maintenance") ? count(maintenanceApi.list({ status: "open", limit: 1 })) : 0,
      can("maintenance") && !isManager ? count(maintenanceApi.list({ approvalStatus: "pending", limit: 1 })) : 0,
    ]).then(([unpaid, partial, repairs, approvals]) => {
      setTasks(
        [
          { to: "/billing", label: "Rent invoices waiting for payment", count: unpaid + partial },
          { to: "/maintenance", label: "Repairs not started yet", count: repairs },
          { to: "/maintenance", label: "Repair requests waiting for your approval", count: approvals },
        ].filter((task) => task.count > 0),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tasks) return null;
  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">To do</h2>
      {tasks.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">You are all caught up.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <li key={task.label}>
              <Link to={task.to} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent">
                {task.label}
                <span className="font-semibold">{task.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Shown until the basics exist, so a new owner always knows the next step.
function GettingStarted({ stats }: { stats: ApiDashboardStats }) {
  const steps = [
    { done: stats.totals.properties > 0, label: "Add your first property", hint: "Send a request; it is usually how a new building starts.", to: "/requests" },
    { done: stats.totals.units > 0, label: "Add units to a floor", hint: "Open a floor and add its flats, shops or offices.", to: "/floors" },
    { done: stats.totals.managers > 0, label: "Add a manager (optional)", hint: "Skip this if you run the building yourself.", to: "/admin/admins" },
  ];
  if (steps[0]?.done && steps[1]?.done) return null;
  return (
    <div className="mb-6 rounded-xl border border-primary/40 bg-accent/40 p-5">
      <h2 className="font-semibold">Get started</h2>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="flex items-start gap-3 rounded-lg p-2 hover:bg-accent">
              {s.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <span>
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
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
  const perms = admin?.admin?.permissions;
  const can = (key: "tenants" | "rent" | "maintenance" | "expenses") =>
    role !== "manager" || perms?.[key] === true;

  return (
    <AppShell>
      <PageHeader
        title={`Welcome, ${displayName(admin?.admin)}`}
        description="Here is what is happening across your buildings today."
      />

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : !stats ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          {role === "owner" ? <GettingStarted stats={stats} /> : null}
          {role !== "superAdmin" ? <TodayTasks can={can} isManager={role === "manager"} /> : null}
          <QuickActions can={can} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Properties"
              value={String(stats.totals.properties)}
              hint={`${stats.totals.floors} ${stats.totals.floors === 1 ? "floor" : "floors"} in total`}
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
              <h2 className="mb-4 font-semibold">Are your units occupied?</h2>
              {stats.unitsByStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No units yet. Open Floors to add your first one.
                </p>
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