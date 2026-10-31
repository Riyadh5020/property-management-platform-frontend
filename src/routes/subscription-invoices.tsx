import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
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
import { billingApi, type ApiSubscriptionInvoice } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/subscription-invoices")({
  head: () => ({
    meta: [
      { title: "Billing — EstateOps" },
      { name: "description", content: "Subscription invoices and payment history." },
    ],
  }),
  component: SubscriptionInvoicesPage,
});

const PAGE_SIZE = 20;
const today = () => new Date().toISOString().slice(0, 10);

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "paid") return "default";
  if (status === "due") return "secondary";
  return "outline";
}

function SubscriptionInvoicesPage() {
  const { admin, ready } = useAuth();
  const isSuperAdmin = admin?.admin?.role === "superAdmin";
  const [items, setItems] = useState<ApiSubscriptionInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paying, setPaying] = useState<ApiSubscriptionInvoice | null>(null);
  const [payment, setPayment] = useState({ method: "cash", paidOn: today(), reference: "" });
  const [couponFor, setCouponFor] = useState<ApiSubscriptionInvoice | null>(null);
  const [code, setCode] = useState("");
  const [voiding, setVoiding] = useState<ApiSubscriptionInvoice | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await billingApi.invoices({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(status !== "all" ? { status } : {}),
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    if (ready && admin?.token) void load();
  }, [ready, admin?.token, load]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      setPaying(null);
      setCouponFor(null);
      setVoiding(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That did not work");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Billing"
        description={
          isSuperAdmin
            ? "Subscription invoices for every owner. Record a payment when you receive it."
            : "Your subscription invoices and what you have paid."
        }
        actions={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="due">Due</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">{total} in total</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                {isSuperAdmin ? <TableHead>Owner</TableHead> : null}
                <TableHead>For</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center">
                    <p className="text-destructive">Could not load invoices: {loadError}</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => void load()}>
                      Try again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No invoices yet. One appears when a paid plan starts or renews.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="whitespace-nowrap font-medium">{inv.invoiceNo}</TableCell>
                    {isSuperAdmin ? (
                      <TableCell className="whitespace-nowrap text-sm">{inv.ownerEmail ?? "—"}</TableCell>
                    ) : null}
                    <TableCell className="text-sm">{inv.description}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatMoney(inv.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {Number(inv.discountAmount) > 0 ? formatMoney(inv.discountAmount) : "—"}
                      {inv.couponCode ? ` (${inv.couponCode})` : ""}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{String(inv.dueDate).slice(0, 10)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {inv.paidOn ? `${String(inv.paidOn).slice(0, 10)} · ${inv.method ?? ""}` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {inv.status === "due" ? (
                        <>
                          {!inv.couponCode ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCode("");
                                setCouponFor(inv);
                              }}
                            >
                              Use coupon
                            </Button>
                          ) : null}
                          {isSuperAdmin ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setPayment({ method: "cash", paidOn: today(), reference: "" });
                                  setPaying(inv);
                                }}
                              >
                                Mark paid
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setVoiding(inv)}>
                                Void
                              </Button>
                            </>
                          ) : null}
                        </>
                      ) : null}
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
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
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

      <Dialog open={paying !== null} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {paying?.invoiceNo}: {formatMoney(paying?.amount)}. This does not take money; it records money you already received.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paid by</Label>
              <Select value={payment.method} onValueChange={(v) => setPayment({ ...payment, method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-paid-on">Date</Label>
              <Input
                id="sub-paid-on"
                type="date"
                value={payment.paidOn}
                onChange={(e) => setPayment({ ...payment, paidOn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-ref">Reference (optional)</Label>
              <Input
                id="sub-ref"
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPaying(null)}>
              Back
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (!paying) return;
                void run(
                  () =>
                    billingApi.pay(paying.id, {
                      method: payment.method,
                      paidOn: payment.paidOn,
                      reference: payment.reference.trim() || null,
                    }),
                  "Payment recorded",
                );
              }}
            >
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={couponFor !== null} onOpenChange={(o) => !o && setCouponFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Use a coupon</DialogTitle>
            <DialogDescription>Each invoice can use one coupon.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="coupon-code">Coupon code</Label>
            <Input id="coupon-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCouponFor(null)}>
              Back
            </Button>
            <Button
              disabled={busy || !code.trim()}
              onClick={() => {
                if (!couponFor) return;
                void run(() => billingApi.applyCoupon(couponFor.id, code.trim()), "Coupon applied");
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={voiding !== null} onOpenChange={(o) => !o && setVoiding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void this invoice?</DialogTitle>
            <DialogDescription>
              {voiding?.invoiceNo} will no longer be owed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setVoiding(null)}>
              Back
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (!voiding) return;
                void run(() => billingApi.voidInvoice(voiding.id), "Invoice voided");
              }}
            >
              Void invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
