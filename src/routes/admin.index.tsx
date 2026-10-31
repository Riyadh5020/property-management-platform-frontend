import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Banknote, Shield, TrendingUp, UserMinus, UserPlus, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { billingApi, type ApiBusinessStats } from "@/lib/api";
import { displayName, useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";
import { countOf } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin console — EstateOps" },
      {
        name: "description",
        content: "Administrator console for managing EstateOps administrators.",
      },
      { property: "og:title", content: "Admin console — EstateOps" },
      { property: "og:description", content: "Manage platform administrators." },
    ],
  }),
  component: AdminHome,
});

function Stat({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        <Icon className="size-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function AdminHome() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ApiBusinessStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.ready && auth.admin && auth.admin.admin?.role !== "superAdmin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [auth.ready, auth.admin, navigate]);

  useEffect(() => {
    if (!auth.ready || auth.admin?.admin?.role !== "superAdmin") return;
    billingApi
      .business()
      .then(setStats)
      .catch((err: unknown) => setStatsError(err instanceof Error ? err.message : "unknown error"));
  }, [auth.ready, auth.admin]);

  return (
    <AppShell variant="console">
      <PageHeader
        title={`Welcome, ${displayName(auth.admin?.admin)}`}
        description="How the business is doing today."
      />

      {statsError ? (
        <p className="mb-6 text-sm text-destructive">Could not load business numbers: {statsError}</p>
      ) : !stats ? (
        <p className="mb-6 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Monthly recurring revenue" value={formatMoney(stats.mrr)} hint="From active paid plans, at list price" icon={TrendingUp} />
            <Stat label="Collected this month" value={formatMoney(stats.collectedThisMonth)} hint="Payments recorded in Billing" icon={Banknote} />
            <Stat label="Waiting to be paid" value={formatMoney(stats.outstanding)} hint="Due subscription invoices" icon={Wallet} />
            <Stat label="Paying owners" value={String(stats.activeOwners)} hint="With an active paid plan" icon={Users} />
            <Stat label="On free trial" value={String(stats.trialOwners)} hint="Trial still running" icon={Users} />
            <Stat label="Expired" value={String(stats.expiredOwners)} hint="Have a property, no running plan" icon={AlertTriangle} />
            <Stat label="New in 30 days" value={String(stats.newOwners30Days)} hint="Owner accounts created" icon={UserPlus} />
            <Stat label="Left" value={String(stats.lostOwners)} hint="Inactive or suspended owners" icon={UserMinus} />
          </div>
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold">Plans in use</h2>
            {stats.plans.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No plans yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {stats.plans.map((plan) => (
                  <li key={plan.name} className="flex items-center justify-between gap-3">
                    {plan.name}
                    <span className="text-muted-foreground">{countOf(plan.properties, "property", "properties")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <Shield className="size-5 text-primary" />
          <h2 className="mt-3 font-semibold">Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add owners, edit their details and control who can sign in.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/admin/admins">Manage users</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}