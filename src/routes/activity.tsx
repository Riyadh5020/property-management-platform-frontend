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
import { type ApiAuditLog, auditLogApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity log — EstateOps" },
      { name: "description", content: "Who changed what, and when." },
    ],
  }),
  component: ActivityPage,
});

const PAGE_SIZE = 20;

const entityLabel: Record<string, string> = {
  tenant: "Tenant",
  lease: "Lease",
  invoice: "Invoice",
  expense: "Expense",
  maintenance: "Maintenance",
  parking: "Parking",
  admin: "User",
  property: "Property",
};
const actionLabel: Record<string, string> = {
  create: "Added",
  update: "Edited",
  delete: "Deleted",
  review: "Reviewed",
  generate: "Generated",
  payment: "Payment",
  reverse_payment: "Payment reversed",
  void: "Voided",
  status: "Status changed",
  reset_password: "Password reset",
  assign: "Assignments",
  subscription: "Subscription",
};

function actionVariant(a: string): "default" | "secondary" | "destructive" | "outline" {
  if (a === "delete" || a === "void" || a === "reverse_payment") return "destructive";
  if (a === "create" || a === "generate" || a === "payment") return "default";
  return "secondary";
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ActivityPage() {
  const { admin, ready } = useAuth();
  const [items, setItems] = useState<ApiAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("all");

  useEffect(() => {
    setPage(0);
  }, [entity]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditLogApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(entity !== "all" ? { entityType: entity } : {}),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load the activity log");
    } finally {
      setLoading(false);
    }
  }, [page, entity]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    void load();
  }, [ready, admin?.token, load]);

  return (
    <AppShell>
      <PageHeader
        title="Activity log"
        description="Every change to tenants, leases, invoices, expenses, maintenance and parking: who made it and when."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everything</SelectItem>
            {Object.entries(entityLabel).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
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
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No activity yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{log.actorName ?? log.actorEmail ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{log.actorRole ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(log.action)}>
                        {actionLabel[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{log.summary}</div>
                      <div className="text-xs text-muted-foreground">
                        {entityLabel[log.entityType] ?? log.entityType}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{log.propertyTitle ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {log.changes ? (
                        <ul className="space-y-0.5">
                          {Object.entries(log.changes).map(([field, change]) => (
                            <li key={field}>
                              <span className="font-medium">{field}</span>: {show(change.from)} →{" "}
                              {show(change.to)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
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
