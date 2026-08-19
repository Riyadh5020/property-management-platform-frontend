import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { useEffect } from "react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { displayName, useAuth } from "@/lib/auth";

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

function AdminHome() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.ready && auth.admin && auth.admin.admin?.role !== "superAdmin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [auth.ready, auth.admin, navigate]);

  return (
    <AppShell variant="console">
      <PageHeader
        title={`Welcome, ${displayName(auth.admin?.admin)}`}
        description="Account administration backed by your live API."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <Shield className="size-5 text-primary" />
          <h2 className="mt-3 font-semibold">Administrators</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create administrators, edit their details and control their access status.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/admin/admins">Manage admins</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}