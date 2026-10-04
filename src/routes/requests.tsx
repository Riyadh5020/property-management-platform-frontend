

import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CountBadge } from "@/components/count-badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  type ApiFloorRequest,
  type ApiProperty,
  type ApiPropertyRequest,
  type ApiSubscriptionPlan,
  floorRequestApi,
  propertyApi,
  propertyRequestApi,
  subscriptionPlanApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePendingRequests } from "@/lib/use-pending-requests";
import { useQueryClient } from "@tanstack/react-query";
export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Requests — EstateOps" },
      {
        name: "description",
        content: "Property and floor requests in one place.",
      },
    ],
  }),
  component: RequestsPage,
});

function statusVariant(
  status: "pending" | "approved" | "denied",
): "default" | "secondary" | "destructive" {
  if (status === "approved") return "default";
  if (status === "denied") return "destructive";
  return "secondary";
}

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function sortPendingFirst<T extends { status: string; createdAt?: string }>(
  rows: T[],
) {
  return [...rows].sort((a, b) => {
    const ap = a.status === "pending";
    const bp = b.status === "pending";

    if (ap !== bp) return ap ? -1 : 1;

    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

function RequestFilters({
  search,
  onSearch,
  status,
  onStatus,
  placeholder,
}: {
  search: string;
  onSearch: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      <Select value={status} onValueChange={onStatus}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="denied">Denied</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}




function RequestsPage() {
  const { admin } = useAuth();
  const role = admin?.admin?.role;
  const isSuperAdmin = role === "superAdmin";
const pending = usePendingRequests();
  return (
    <AppShell variant={isSuperAdmin ? "console" : "workspace"}>
      <PageHeader
        title="Requests"
        description={
          isSuperAdmin
            ? "Review and approve owners' requests for additional properties or floors."
            : "Request an additional property, or additional floors on one of your properties."
        }
      />

      <Tabs defaultValue="properties">
        <TabsList>
                    <TabsTrigger value="properties">
            Property requests
            {isSuperAdmin ? <CountBadge n={pending.property} className="ml-2" /> : null}
          </TabsTrigger>
          <TabsTrigger value="floors">
            Floor requests
            {isSuperAdmin ? <CountBadge n={pending.floor} className="ml-2" /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties">
          <PropertyRequestsPanel isSuperAdmin={isSuperAdmin} />
        </TabsContent>

        <TabsContent value="floors">
          <FloorRequestsPanel isSuperAdmin={isSuperAdmin} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}


const emptyPropertyForm = {
  title: "",
  buildingNumber: "",
  floors: "",
  totalUnits: "",
  totalArea: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};
type PropertyForm = typeof emptyPropertyForm;

const PROPERTY_FIELDS: {
  key: keyof PropertyForm;
  label: string;
  required?: boolean;
  number?: boolean;
}[] = [
  { key: "title", label: "Title / Building name", required: true },
  { key: "buildingNumber", label: "Building number" },
  { key: "floors", label: "Floors", required: true, number: true },
  { key: "totalUnits", label: "Total units", number: true },
  { key: "totalArea", label: "Total area", number: true },
  { key: "address", label: "Address", required: true },
  { key: "city", label: "City", required: true },
  { key: "state", label: "State", required: true },
  { key: "country", label: "Country", required: true },
  { key: "postalCode", label: "Postal code" },
];

function PropertyRequestsPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const [requests, setRequests] = useState<ApiPropertyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PropertyForm>(emptyPropertyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [approving, setApproving] = useState<ApiPropertyRequest | null>(null);
  const [plans, setPlans] = useState<ApiSubscriptionPlan[]>([]);
  const [planId, setPlanId] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const visible = sortPendingFirst(requests).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.ownerName, r.ownerEmail, r.title, r.city, r.note].some((v) =>
      (v ?? "").toLowerCase().includes(q),
    );
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await propertyRequestApi.list({ limit: 100 });
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
    const missing = PROPERTY_FIELDS.find((f) => f.required && !form[f.key].trim());
    if (missing) {
      toast.error(`${missing.label} is required`);
      return;
    }
    const floors = Number(form.floors);
    if (!Number.isInteger(floors) || floors < 1) {
      toast.error("Floors must be a whole number of 1 or more");
      return;
    }

    setSubmitting(true);
    try {
      await propertyRequestApi.create({
        title: form.title.trim(),
        buildingNumber: form.buildingNumber.trim() || null,
        floors,
        totalUnits: form.totalUnits ? Number(form.totalUnits) : null,
        totalArea: form.totalArea ? Number(form.totalArea) : null,
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
        postalCode: form.postalCode.trim() || null,
      });
      toast.success("Request submitted — waiting for superAdmin review");
      setOpen(false);
      setForm(emptyPropertyForm);
      await load();
      void qc.invalidateQueries({ queryKey: ["pending-requests"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const openApprove = async (req: ApiPropertyRequest) => {
    setApproving(req);
    setPlanId("");
    if (plans.length === 0) {
      try {
        const res = await subscriptionPlanApi.list({ status: "active", limit: 100 });
        setPlans(res.items);
      } catch {
        toast.error("Could not load subscription plans");
      }
    }
  };

  const decide = async (id: string, decision: "approve" | "deny", plan?: string) => {
    setActioningId(id);
    try {
      if (decision === "approve") {
        await propertyRequestApi.approve(id, plan ?? "");
      } else {
        await propertyRequestApi.deny(id);
      }
      toast.success(
        decision === "approve" ? "Request approved — property created" : "Request denied",
      );
      setApproving(null);
      await load();
      void qc.invalidateQueries({ queryKey: ["pending-requests"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update request");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>

        {!isSuperAdmin ? (
          <Button
            size="sm"
            onClick={() => {
              setForm(emptyPropertyForm);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            New request
          </Button>
        ) : null}
      </div>

      <RequestFilters
        search={search}
        onSearch={setSearch}
        status={statusFilter}
        onStatus={setStatusFilter}
        placeholder="Search owner, building or city…"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isSuperAdmin ? <TableHead>Requested by</TableHead> : null}
                <TableHead>Property</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead>Used</TableHead>
                {isSuperAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 7 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 7 : 5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((req) => (
                  <TableRow key={req.id}>
                    {isSuperAdmin ? (
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-medium">{req.ownerName || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{req.ownerEmail ?? ""}</div>
                      </TableCell>
                    ) : null}

                    <TableCell className="max-w-xs" title={req.address ?? ""}>
                      <div className="truncate text-sm font-medium">
                        {req.title ?? req.note ?? "—"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[req.city, req.country].filter(Boolean).join(", ")}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(req.createdAt)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(req.reviewedAt)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(req.consumedAt)}
                    </TableCell>

                    {isSuperAdmin ? (
                      <TableCell className="text-right">
                        {req.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actioningId === req.id}
                              onClick={() => void openApprove(req)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request an additional property</DialogTitle>
            <DialogDescription>
              Fill in the property details. On approval it is created automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            {PROPERTY_FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`pr-${f.key}`}>
                  {f.label} {f.required ? <span className="text-destructive">*</span> : null}
                </Label>
                <Input
                  id={`pr-${f.key}`}
                  type={f.number ? "number" : "text"}
                  min={f.number ? 0 : undefined}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
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

      <Dialog open={approving !== null} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve “{approving?.title ?? "property"}”</DialogTitle>
            <DialogDescription>
              The property is created as active for {approving?.ownerName || "the owner"}. Choose
              its subscription plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Subscription plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subscription plan…" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.billingCycle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setApproving(null)}>
              Cancel
            </Button>
            <Button
              disabled={!planId || actioningId === approving?.id}
              onClick={() => approving && void decide(approving.id, "approve", planId)}
            >
              Approve & create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Floor requests panel                                                */
/* ------------------------------------------------------------------ */

function FloorRequestsPanel({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean;
}) {
    const qc = useQueryClient();
  const [requests, setRequests] = useState<ApiFloorRequest[]>([]);
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [requestedFloorCount, setRequestedFloorCount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const propertyLabel = (id: string) =>
    properties.find((p) => p.id === id)?.title ?? id;

  const visible = sortPendingFirst(requests).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) {
      return false;
    }

    const q = search.trim().toLowerCase();

    if (!q) {
      return true;
    }

    return [
      r.ownerName,
      r.ownerEmail,
      r.note,
      propertyLabel(r.propertyId),
    ].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [requestResult, propertyResult] = await Promise.all([
        floorRequestApi.list({ limit: 100 }),
        propertyApi.list({ limit: 100 }),
      ]);

      setRequests(requestResult.items);
      setProperties(propertyResult.items);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not load floor requests",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setPropertyId("");
    setRequestedFloorCount("");
    setNote("");
    setOpen(true);
  };

  const submitRequest = async () => {
    if (!propertyId) {
      toast.error("Please select a property");
      return;
    }

    const count = Number(requestedFloorCount);

    if (
      !requestedFloorCount ||
      !Number.isInteger(count) ||
      count <= 0
    ) {
      toast.error("Please enter how many floors you'd like to add");
      return;
    }

    if (!note.trim()) {
      toast.error("Please add a short note for the superAdmin");
      return;
    }

    setSubmitting(true);

    try {
      await floorRequestApi.create({
        propertyId,
        requestedFloorCount: count,
        note: note.trim(),
      });

      toast.success(
        "Request submitted — waiting for superAdmin review",
      );

      setOpen(false);
      setPropertyId("");
      setRequestedFloorCount("");
      setNote("");

         await load();
      void qc.invalidateQueries({ queryKey: ["pending-requests"] });
        } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not submit request",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (
    id: string,
    decision: "approve" | "deny",
  ) => {
    setActioningId(id);

    try {
      if (decision === "approve") {
        await floorRequestApi.approve(id);
      } else {
        await floorRequestApi.deny(id);
      }

      toast.success(
        `Request ${
          decision === "approve"
            ? "approved — floors created"
            : "denied"
        }`,
      );

      await load();
      void qc.invalidateQueries({ queryKey: ["pending-requests"] });
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not update request",
      );
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>

        {!isSuperAdmin ? (
          <Button
            size="sm"
            onClick={openCreate}
          >
            <Plus className="size-4" />
            New request
          </Button>
        ) : null}
      </div>

      <RequestFilters
        search={search}
        onSearch={setSearch}
        status={statusFilter}
        onStatus={setStatusFilter}
        placeholder="Search owner, property or note…"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>

                {isSuperAdmin ? (
                  <TableHead>Requested by</TableHead>
                ) : null}

                <TableHead>Floors requested</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Reviewed</TableHead>

                {isSuperAdmin ? (
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 8 : 6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 8 : 6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="whitespace-nowrap">
                      {propertyLabel(req.propertyId)}
                    </TableCell>

                    {isSuperAdmin ? (
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-medium">
                          {req.ownerName || "Unknown"}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {req.ownerEmail ?? ""}
                        </div>
                      </TableCell>
                    ) : null}

                    <TableCell>
                      {req.requestedFloorCount}
                    </TableCell>

                    <TableCell
                      className="max-w-xs truncate"
                      title={req.note}
                    >
                      {req.note}
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant(req.status)}>
                        {req.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(req.createdAt)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(req.reviewedAt)}
                    </TableCell>

                    {isSuperAdmin ? (
                      <TableCell className="text-right">
                        {req.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actioningId === req.id}
                              onClick={() =>
                                void decide(req.id, "approve")
                              }
                              aria-label="Approve"
                            >
                              <Check className="size-4 text-emerald-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={actioningId === req.id}
                              onClick={() =>
                                void decide(req.id, "deny")
                              }
                              aria-label="Deny"
                            >
                              <X className="size-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Reviewed
                          </span>
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

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Request additional floors
            </DialogTitle>

            <DialogDescription>
              Choose the property and how many floors you'd like
              added. You'll be notified once it's reviewed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-property">
                Property
              </Label>

              <Select
                value={propertyId}
                onValueChange={setPropertyId}
              >
                <SelectTrigger id="request-property">
                  <SelectValue placeholder="Select a property…" />
                </SelectTrigger>

                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                    >
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-count">
                How many floors?
              </Label>

              <Input
                id="request-count"
                type="number"
                min={1}
                value={requestedFloorCount}
                onChange={(e) =>
                  setRequestedFloorCount(e.target.value)
                }
                placeholder="e.g. 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-note">
                Reason
              </Label>

              <Textarea
                id="request-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Adding two more floors to accommodate new tenants"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={() => void submitRequest()}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

``