import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { type ApiPropertyRequest, propertyRequestApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/property-requests")({
  head: () => ({
    meta: [
      { title: "Property requests — EstateOps" },
      {
        name: "description",
        content: "Request additional properties, or review and approve owner requests.",
      },
    ],
  }),
  component: PropertyRequestsPage,
});

function statusVariant(status: ApiPropertyRequest["status"]): "default" | "secondary" | "destructive" {
  if (status === "approved") return "default";
  if (status === "denied") return "destructive";
  return "secondary";
}

function PropertyRequestsPage() {
  const { admin } = useAuth();
  const role = admin?.admin?.role;
  const isSuperAdmin = role === "superAdmin";

  const [requests, setRequests] = useState<ApiPropertyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await propertyRequestApi.list();
      setRequests(result.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitRequest = async () => {
    if (!note.trim()) {
      toast.error("Please describe why you need an additional property");
      return;
    }
    setSubmitting(true);
    try {
      await propertyRequestApi.create({ note: note.trim() });
      toast.success("Request submitted — waiting for superAdmin review");
      setOpen(false);
      setNote("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (id: string, decision: "approve" | "deny") => {
    setActioningId(id);
    try {
      if (decision === "approve") await propertyRequestApi.approve(id);
      else await propertyRequestApi.deny(id);
      toast.success(`Request ${decision === "approve" ? "approved" : "denied"}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <AppShell variant={isSuperAdmin ? "console" : "workspace"}>
      <PageHeader
        title="Property requests"
        description={
          isSuperAdmin
            ? "Review and approve owners' requests for an additional property."
            : "Request an additional property beyond your current allowance."
        }
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            {!isSuperAdmin ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> New request
              </Button>
            ) : null}
          </>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead>Consumed</TableHead>
                {isSuperAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No requests yet.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="max-w-xs truncate" title={req.note}>
                      {req.note}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {req.consumedAt ? new Date(req.consumedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    {isSuperAdmin ? (
                      <TableCell className="text-right">
                        {req.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actioningId === req.id}
                              onClick={() => void decide(req.id, "approve")}
                              aria-label="Approve"
                            >
                              <Check className="size-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actioningId === req.id}
                              onClick={() => void decide(req.id, "deny")}
                              aria-label="Deny"
                            >
                              <X className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Reviewed</span>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request an additional property</DialogTitle>
            <DialogDescription>
              Tell the superAdmin why you need another property. You'll be notified once it's
              reviewed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="request-note">Reason</Label>
            <Textarea
              id="request-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Expanding to a second building in Chattogram"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitRequest()} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}