import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Pencil, Plus, RefreshCw, Search, X } from "lucide-react";
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
  type PropertyType,
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

const PROPERTY_TYPES: PropertyType[] = ["apartment", "house", "villa", "office", "shop", "land"];

function statusVariant(
  status: "pending" | "approved" | "denied" | "cancelled",
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "denied") return "destructive";
  if (status === "cancelled") return "outline";
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

function sortPendingFirst<T extends { status: string; createdAt?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const ap = a.status === "pending";
    const bp = b.status === "pending";
    if (ap !== bp) return ap ? -1 : 1;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Back
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DenyDialog({
  open,
  title,
  description,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  loading: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const valid = reason.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="deny-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="deny-reason"
            rows={4}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell the owner why (min 3 characters)"
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Back
          </Button>
          <Button
            variant="destructive"
            disabled={!valid || loading}
            onClick={() => onConfirm(reason.trim())}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Working…" : "Reject request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

type RequestStatus = "pending" | "approved" | "denied" | "cancelled";

function StatusCell({
  status,
  reason,
}: {
  status: RequestStatus;
  reason?: string | null | undefined;
}) {
  return (
    <div>
      <Badge variant={statusVariant(status)}>{status}</Badge>
      {status === "denied" && reason ? (
        <div className="mt-1 max-w-[14rem] whitespace-normal text-xs text-muted-foreground">
          Reason: {reason}
        </div>
      ) : null}
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
  type: "apartment",
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
  const [editingReq, setEditingReq] = useState<ApiPropertyRequest | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyPropertyForm);
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [approving, setApproving] = useState<ApiPropertyRequest | null>(null);
  const [denying, setDenying] = useState<ApiPropertyRequest | null>(null);
  const [cancelling, setCancelling] = useState<ApiPropertyRequest | null>(null);
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

  const refreshAll = async () => {
    await load();
    void qc.invalidateQueries({ queryKey: ["pending-requests"] });
  };

  const openNew = () => {
    setEditingReq(null);
    setForm(emptyPropertyForm);
    setOpen(true);
  };

  const openEdit = (req: ApiPropertyRequest) => {
    setEditingReq(req);
    setForm({
      title: req.title ?? "",
      type: req.type ?? "apartment",
      buildingNumber: req.buildingNumber ?? "",
      floors: req.floors != null ? String(req.floors) : "",
      totalUnits: req.totalUnits != null ? String(req.totalUnits) : "",
      totalArea: req.totalArea != null ? String(req.totalArea) : "",
      address: req.address ?? "",
      city: req.city ?? "",
      state: req.state ?? "",
      country: req.country ?? "",
      postalCode: req.postalCode ?? "",
    });
    setOpen(true);
  };

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
      if (editingReq) {
        const body: Parameters<typeof propertyRequestApi.edit>[1] = {
          title: form.title.trim(),
          type: form.type as PropertyType,
          floors,
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          country: form.country.trim(),
        };
        if (form.buildingNumber.trim()) body.buildingNumber = form.buildingNumber.trim();
        if (form.totalUnits) body.totalUnits = Number(form.totalUnits);
        if (form.totalArea) body.totalArea = Number(form.totalArea);
        if (form.postalCode.trim()) body.postalCode = form.postalCode.trim();
        await propertyRequestApi.edit(editingReq.id, body);
        toast.success("Request updated");
      } else {
        await propertyRequestApi.create({
          title: form.title.trim(),
          type: form.type as PropertyType,
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
      }
      setOpen(false);
      setEditingReq(null);
      setForm(emptyPropertyForm);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save request");
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

  const approve = async (id: string, plan: string) => {
    setActioningId(id);
    try {
      await propertyRequestApi.approve(id, plan);
      toast.success("Request approved — property created");
      setApproving(null);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve request");
    } finally {
      setActioningId(null);
    }
  };

  const deny = async (id: string, reason: string) => {
    setActioningId(id);
    try {
      await propertyRequestApi.deny(id, reason);
      toast.success("Request denied");
      setDenying(null);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not deny request");
    } finally {
      setActioningId(null);
    }
  };

  const cancel = async (id: string) => {
    setActioningId(id);
    try {
      await propertyRequestApi.cancel(id);
      toast.success("Request cancelled");
      setCancelling(null);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel request");
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
          <Button size="sm" onClick={openNew}>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 7 : 6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 7 : 6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((req) => (
                  <TableRow
                    key={req.id}
                    className={actioningId === req.id ? "opacity-60" : undefined}
                  >
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
                        {[req.type, req.city, req.country].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>

                    <TableCell>
                      <StatusCell status={req.status} reason={req.rejectReason} />
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

                    <TableCell className="text-right">
                      {req.status !== "pending" ? (
                        <span className="text-xs text-muted-foreground">
                          {req.status === "cancelled" ? "Cancelled" : "Reviewed"}
                        </span>
                      ) : isSuperAdmin ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actioningId === req.id}
                            onClick={() => void openApprove(req)}
                            aria-label="Approve"
                          >
                            {actioningId === req.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actioningId === req.id}
                            onClick={() => setDenying(req)}
                            aria-label="Deny"
                          >
                            <X className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actioningId === req.id}
                            onClick={() => openEdit(req)}
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actioningId === req.id}
                            onClick={() => setCancelling(req)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditingReq(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReq ? "Edit property request" : "Request an additional property"}
            </DialogTitle>
            <DialogDescription>
              {editingReq
                ? "You can edit this request while it is still pending."
                : "Fill in the property details. On approval it is created automatically."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pr-type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger id="pr-type">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Listing type</Label>
              <Input value="rent" disabled />
            </div>

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
              Back
            </Button>
            <Button onClick={() => void submitRequest()} disabled={submitting}>
              {submitting ? "Saving…" : editingReq ? "Save changes" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={approving !== null}
        onOpenChange={(o) => !o && actioningId === null && setApproving(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve “{approving?.title ?? "property"}”</DialogTitle>
            <DialogDescription>
              The property is created as active for {approving?.ownerName || "the owner"}. Choose
              its subscription plan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>
              Subscription plan <span className="text-destructive">*</span>
            </Label>
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
            <Button
              variant="secondary"
              onClick={() => setApproving(null)}
              disabled={actioningId !== null}
            >
              Back
            </Button>
            <Button
              disabled={!planId || actioningId === approving?.id}
              onClick={() => approving && void approve(approving.id, planId)}
            >
              {actioningId === approving?.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {actioningId === approving?.id ? "Creating…" : "Approve & create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DenyDialog
        open={denying !== null}
        title={`Reject “${denying?.title ?? "request"}”?`}
        description={`The request from ${denying?.ownerName || "this owner"} will be marked as denied. The owner will see your reason.`}
        loading={actioningId !== null && actioningId === denying?.id}
        onCancel={() => setDenying(null)}
        onConfirm={(reason) => denying && void deny(denying.id, reason)}
      />

      <ConfirmDialog
        open={cancelling !== null}
        title={`Cancel “${cancelling?.title ?? "request"}”?`}
        description="The request will be cancelled and you can submit a new one."
        confirmLabel="Cancel request"
        destructive
        loading={actioningId !== null && actioningId === cancelling?.id}
        onCancel={() => setCancelling(null)}
        onConfirm={() => cancelling && void cancel(cancelling.id)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Floor requests panel                                                */
/* ------------------------------------------------------------------ */

function FloorRequestsPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const qc = useQueryClient();
  const [requests, setRequests] = useState<ApiFloorRequest[]>([]);
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<ApiFloorRequest | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [requestedFloorCount, setRequestedFloorCount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [approving, setApproving] = useState<ApiFloorRequest | null>(null);
  const [denying, setDenying] = useState<ApiFloorRequest | null>(null);
  const [cancelling, setCancelling] = useState<ApiFloorRequest | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const propertyLabel = (id: string) => properties.find((p) => p.id === id)?.title ?? id;

  const visible = sortPendingFirst(requests).filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [r.ownerName, r.ownerEmail, r.note, propertyLabel(r.propertyId)].some((v) =>
      (v ?? "").toLowerCase().includes(q),
    );
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
      toast.error(err instanceof Error ? err.message : "Could not load floor requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshAll = async () => {
    await load();
    void qc.invalidateQueries({ queryKey: ["pending-requests"] });
  };

  const openCreate = () => {
    setEditingReq(null);
    setPropertyId("");
    setRequestedFloorCount("");
    setNote("");
    setOpen(true);
  };

  const openEdit = (req: ApiFloorRequest) => {
    setEditingReq(req);
    setPropertyId(req.propertyId);
    setRequestedFloorCount(String(req.requestedFloorCount));
    setNote(req.note);
    setOpen(true);
  };

  const submitRequest = async () => {
    if (!editingReq && !propertyId) {
      toast.error("Please select a property");
      return;
    }

    const count = Number(requestedFloorCount);
    if (!requestedFloorCount || !Number.isInteger(count) || count <= 0) {
      toast.error("Please enter how many floors you'd like to add");
      return;
    }

    if (!note.trim()) {
      toast.error("Please add a short note for the superAdmin");
      return;
    }

    setSubmitting(true);
    try {
      if (editingReq) {
        await floorRequestApi.edit(editingReq.id, {
          requestedFloorCount: count,
          note: note.trim(),
        });
        toast.success("Request updated");
      } else {
        await floorRequestApi.create({
          propertyId,
          requestedFloorCount: count,
          note: note.trim(),
        });
        toast.success("Request submitted — waiting for superAdmin review");
      }
      setOpen(false);
      setEditingReq(null);
      setPropertyId("");
      setRequestedFloorCount("");
      setNote("");
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save request");
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (id: string) => {
    setActioningId(id);
    try {
      await floorRequestApi.approve(id);
      toast.success("Request approved — floors created");
      setApproving(null);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve request");
    } finally {
      setActioningId(null);
    }
  };

  const deny = async (id: string, reason: string) => {
    setActioningId(id);
    try {
      await floorRequestApi.deny(id, reason);
      toast.success("Request denied");
      setDenying(null);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not deny request");
    } finally {
      setActioningId(null);
    }
  };

  const cancel = async (id: string) => {
    setActioningId(id);
    try {
      await floorRequestApi.cancel(id);
      toast.success("Request cancelled");
      setCancelling(null);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel request");
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
          <Button size="sm" onClick={openCreate}>
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
                {isSuperAdmin ? <TableHead>Requested by</TableHead> : null}
                <TableHead>Floors requested</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 8 : 7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 8 : 7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No requests found.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((req) => (
                  <TableRow
                    key={req.id}
                    className={actioningId === req.id ? "opacity-60" : undefined}
                  >
                    <TableCell className="whitespace-nowrap">
                      {propertyLabel(req.propertyId)}
                    </TableCell>

                    {isSuperAdmin ? (
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm font-medium">{req.ownerName || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{req.ownerEmail ?? ""}</div>
                      </TableCell>
                    ) : null}

                    <TableCell>{req.requestedFloorCount}</TableCell>

                    <TableCell className="max-w-xs truncate" title={req.note}>
                      {req.note}
                    </TableCell>

                    <TableCell>
                      <StatusCell status={req.status} reason={req.rejectReason} />
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(req.createdAt)}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {fmtDate(req.reviewedAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      {req.status !== "pending" ? (
                        <span className="text-xs text-muted-foreground">
                          {req.status === "cancelled" ? "Cancelled" : "Reviewed"}
                        </span>
                      ) : isSuperAdmin ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actioningId === req.id}
                            onClick={() => setApproving(req)}
                            aria-label="Approve"
                          >
                            {actioningId === req.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actioningId === req.id}
                            onClick={() => setDenying(req)}
                            aria-label="Deny"
                          >
                            <X className="size-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actioningId === req.id}
                            onClick={() => openEdit(req)}
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={actioningId === req.id}
                            onClick={() => setCancelling(req)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditingReq(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingReq ? "Edit floor request" : "Request additional floors"}
            </DialogTitle>
            <DialogDescription>
              {editingReq
                ? "You can edit this request while it is still pending."
                : "Choose the property and how many floors you'd like added. You'll be notified once it's reviewed."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-property">
                Property <span className="text-destructive">*</span>
              </Label>
              <Select value={propertyId} onValueChange={setPropertyId} disabled={editingReq !== null}>
                <SelectTrigger id="request-property">
                  <SelectValue placeholder="Select a property…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-count">
                How many floors? <span className="text-destructive">*</span>
              </Label>
              <Input
                id="request-count"
                type="number"
                min={1}
                value={requestedFloorCount}
                onChange={(e) => setRequestedFloorCount(e.target.value)}
                placeholder="e.g. 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-note">
                Reason <span className="text-destructive">*</span>
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
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button onClick={() => void submitRequest()} disabled={submitting}>
              {submitting ? "Saving…" : editingReq ? "Save changes" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={approving !== null}
        title="Approve floor request?"
        description={
          approving
            ? `${approving.requestedFloorCount} floor(s) will be added to “${propertyLabel(approving.propertyId)}”.`
            : ""
        }
        confirmLabel="Approve"
        loading={actioningId !== null && actioningId === approving?.id}
        onCancel={() => setApproving(null)}
        onConfirm={() => approving && void approve(approving.id)}
      />

      <DenyDialog
        open={denying !== null}
        title="Reject floor request?"
        description={`The request from ${denying?.ownerName || "this owner"} will be marked as denied. The owner will see your reason.`}
        loading={actioningId !== null && actioningId === denying?.id}
        onCancel={() => setDenying(null)}
        onConfirm={(reason) => denying && void deny(denying.id, reason)}
      />

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel floor request?"
        description="The request will be cancelled and you can submit a new one."
        confirmLabel="Cancel request"
        destructive
        loading={actioningId !== null && actioningId === cancelling?.id}
        onCancel={() => setCancelling(null)}
        onConfirm={() => cancelling && void cancel(cancelling.id)}
      />
    </div>
  );
}