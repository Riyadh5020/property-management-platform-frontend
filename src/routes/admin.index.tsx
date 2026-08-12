import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Users } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { displayName, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin console — EstateOps" },
      {
        name: "description",
        content: "Administrator console for managing EstateOps users and administrators.",
      },
      { property: "og:title", content: "Admin console — EstateOps" },
      { property: "og:description", content: "Manage platform users and administrators." },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const auth = useAuth();

  return (
    <AppShell variant="admin">
      <PageHeader
        title={`Welcome, ${displayName(auth.admin?.user)}`}
        description="Account administration backed by your live API."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <Users className="size-5 text-primary" />
          <h2 className="mt-3 font-semibold">Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            List every registered user, review their status and activate, suspend or delete
            accounts.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/admin/users">Manage users</Link>
          </Button>
        </div>

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
