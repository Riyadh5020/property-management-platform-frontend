import { countOf } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type ApiProperty, propertyApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/subscription-status")({
  head: () => ({
    meta: [
      { title: "Subscription status — EstateOps" },
      { name: "description", content: "Every property's plan, end date and days left." },
    ],
  }),
  component: SubscriptionStatusPage,
});

const PAGE_SIZE = 20;
const DAY_MS = 86_400_000;

function daysLeft(endsAt?: string | null): number | null {
  if (!endsAt) return null;
  return Math.ceil((new Date(endsAt).getTime() - Date.now()) / DAY_MS);
}

function daysVariant(d: number | null): "default" | "secondary" | "destructive" | "outline" {
  if (d === null) return "outline";
  if (d < 0) return "destructive";
  if (d <= 7) return "secondary";
  return "default";
}

function shortDate(value?: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function SubscriptionStatusPage() {
  const { admin, ready } = useAuth();
  const [items, setItems] = useState<ApiProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setPage(0);
  }, [filter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await propertyApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sortBy: "subscriptionEndsAt",
        sortDir: "asc",
        ...(filter !== "all" ? { subscription: filter } : {}),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    void load();
  }, [ready, admin?.token, load]);

  return (
    <AppShell variant="console">
      <PageHeader
        title="Subscription status"
        description="Every property's plan and end date, soonest first. Renew or adjust a plan from the property's edit form."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            <SelectItem value="expiring">Ending in 7 days</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
          {total}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Ends</TableHead>
                <TableHead>Days left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No properties match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((p) => {
                  const d = daysLeft(p.subscriptionEndsAt);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap font-medium">{p.title}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.ownerName ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.planName ?? "—"}</TableCell>
                      <TableCell>{p.subscriptionStatus ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {shortDate(p.subscriptionStartsAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {shortDate(p.subscriptionEndsAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysVariant(d)}>
                          {d === null ? "No plan" : d < 0 ? `Expired ${-d}d ago` : countOf(d, "day")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {total > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}
