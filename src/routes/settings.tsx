import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiBaseUrl, setApiBaseUrl } from "@/lib/api";
import { resetAllDemoData } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EstateOps" },
      {
        name: "description",
        content: "Configure the backend API base URL and reset demo data for EstateOps.",
      },
      { property: "og:title", content: "Settings — EstateOps" },
      { property: "og:description", content: "Workspace and API connection settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(getApiBaseUrl());
  }, []);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setApiBaseUrl(baseUrl);
    setBaseUrl(getApiBaseUrl());
    toast.success("API base URL saved");
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Connection to your backend and demo-data controls."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Backend API</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            All authentication and user/admin management screens call this API. Point it at your
            local server while developing, or your deployed URL in production.
          </p>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:8000/api/v1"
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: a browser served over https cannot call an http://localhost API. Run this app
            locally (or deploy your API over https) for the live endpoints to work.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Demo data</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Property modules (buildings, units, tenants, leases, billing, maintenance, visitors,
            parking, staff, utilities, owners) use local demo data until you wire matching backend
            endpoints. Resetting restores the original sample records.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              resetAllDemoData();
              toast.success("Demo data restored");
            }}
          >
            Reset all demo data
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
