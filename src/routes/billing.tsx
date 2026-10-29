import { createFileRoute } from "@tanstack/react-router";
import { Eye, RefreshCw, Search, Wand2 } from "lucide-react";
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
import {
  type ApiInvoice,
  type ApiPayment,
  type PaymentMethod,
  invoiceApi,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Rent & Billing — EstateOps" },
      { name: "description", content: "Monthly rent invoices, charges, payments and reversals." },
    ],
  }),
  component: BillingPage,
});

const PAGE_SIZE = 20;
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => `${new Date().toISOString().slice(0, 7)}-01`;

function statusBadge(inv: ApiInvoice) {
  if (inv.status === "paid") return <Badge variant="default">paid</Badge>;
  if (inv.status === "void") return <Badge variant="outline">void</Badge>;
  if (inv.isOverdue) return <Badge variant="destructive">overdue</Badge>;
  return <Badge variant="secondary">{inv.status}</Badge>;
}

function BillingPage() {
  const { admin, ready } = useAuth();
  // Managers may add and correct records but not delete them (the API enforces this too).
  const canDelete = admin?.admin?.role !== "manager";
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");

  const [genOpen, setGenOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(thisMonth());
  const [genBusy, setGenBusy] = useState(false);

  const [active, setActive] = useState<ApiInvoice | null>(null);
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [charges, setCharges] = useState({ utilities: "", penalty: "", other: "", dueDate: "" });
  const [pay, setPay] = useState({ amount: "", method: "cash" as PaymentMethod, paidOn: today(), reference: "" });
  const [busy, setBusy] = useState(false);
  const [reversing, setReversing] = useState<ApiPayment | null>(null);
  const [reverseNote, setReverseNote] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debounced, statusFilter, monthFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoiceApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(monthFilter ? { month: `${monthFilter}-01` } : {}),
      });
      setInvoices(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load invoices");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, statusFilter, monthFilter]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    void load();
  }, [ready, admin?.token, load]);

  const openInvoice = async (inv: ApiInvoice) => {
    try {
      const res = await invoiceApi.get(inv.id);
      setActive({ ...inv, ...res.invoice });
      setPayments(res.payments);
      setCharges({
        utilities: String(res.invoice.utilitiesAmount),
        penalty: String(res.invoice.penaltyAmount),
        other: String(res.invoice.otherAmount),
        dueDate: res.invoice.dueDate,
      });
      setPay({ amount: "", method: "cash", paidOn: today(), reference: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open invoice");
    }
  };

  const refreshActive = async (id: string) => {
    const res = await invoiceApi.get(id);
    setActive((a) => (a ? { ...a, ...res.invoice } : a));
    setPayments(res.payments);
    await load();
  };

  const generate = async () => {
    setGenBusy(true);
    try {
      const r = await invoiceApi.generate({ month: genMonth });
      toast.success(`${r.created} invoice(s) created, ${r.skipped} already existed`);
      setGenOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate invoices");
    } finally {
      setGenBusy(false);
    }
  };

  const saveCharges = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await invoiceApi.update(active.id, {
        utilitiesAmount: Number(charges.utilities || 0),
        penaltyAmount: Number(charges.penalty || 0),
        otherAmount: Number(charges.other || 0),
        dueDate: charges.dueDate,
      });
      toast.success("Charges updated");
      await refreshActive(active.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update charges");
    } finally {
      setBusy(false);
    }
  };

  const addPayment = async () => {
    if (!active) return;
    if (!pay.amount || Number(pay.amount) <= 0) {
      toast.error("Enter a payment amount");
      return;
    }
    setBusy(true);
    try {
      await invoiceApi.addPayment(active.id, {
        amount: Number(pay.amount),
        method: pay.method,
        paidOn: pay.paidOn,
        reference: pay.reference.trim() || null,
      });
      toast.success("Payment recorded");
      setPay({ amount: "", method: "cash", paidOn: today(), reference: "" });
      await refreshActive(active.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  };

  const reverse = async () => {
    if (!active || !reversing) return;
    if (reverseNote.trim().length < 3) {
      toast.error("Enter a reason (min 3 characters)");
      return;
    }
    setBusy(true);
    try {
      await invoiceApi.reverse(active.id, reversing.id, reverseNote.trim());
      toast.success("Payment reversed");
      setReversing(null);
      setReverseNote("");
      await refreshActive(active.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reverse payment");
    } finally {
      setBusy(false);
    }
  };

  const voidInvoice = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await invoiceApi.void(active.id);
      toast.success("Invoice voided");
      await refreshActive(active.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not void invoice");
    } finally {
      setBusy(false);
    }
  };

  const reversedIds = new Set(payments.filter((p) => p.reversesPaymentId).map((p) => p.reversesPaymentId));
  const balance = active ? active.totalAmount - active.paidAmount : 0;
  const editable = active !== null && active.status !== "void";

  return (
    <AppShell>
      <PageHeader
        title="Rent & billing"
        description="Monthly invoices from active leases, charges, payments and reversals."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setGenOpen(true)}>
              <Wand2 className="size-4" /> Generate invoices
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant or invoice no…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="month"
          className="w-44"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        />
        <p className="ml-auto text-sm text-muted-foreground">
          {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Property / unit</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Total</TableHead>
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
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    No invoices. Use “Generate invoices” to bill active leases.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="whitespace-nowrap font-medium">{inv.invoiceNo}</TableCell>
                    <TableCell className="whitespace-nowrap">{inv.tenantName}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{inv.propertyTitle}</div>
                      <div className="text-xs text-muted-foreground">Unit {inv.unitCode}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{inv.billingMonth.slice(0, 7)}</TableCell>
                    <TableCell className="whitespace-nowrap">{inv.dueDate}</TableCell>
                    <TableCell>{formatMoney(inv.totalAmount)}</TableCell>
                    <TableCell>{formatMoney(inv.paidAmount)}</TableCell>
                    <TableCell>{statusBadge(inv)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" aria-label="Open" onClick={() => void openInvoice(inv)}>
                        <Eye className="size-4" />
                      </Button>
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
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
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

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate invoices</DialogTitle>
            <DialogDescription>
              Creates one invoice per active lease for the month. Existing invoices are skipped.
              Rent includes yearly escalation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Billing month</Label>
            <Input
              type="month"
              value={genMonth.slice(0, 7)}
              onChange={(e) => setGenMonth(e.target.value ? `${e.target.value}-01` : "")}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGenOpen(false)}>
              Back
            </Button>
            <Button onClick={() => void generate()} disabled={genBusy || !genMonth}>
              {genBusy ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {active?.invoiceNo} {active ? statusBadge(active) : null}
            </DialogTitle>
            <DialogDescription>
              {active?.tenantName} · {active?.propertyTitle} · Unit {active?.unitCode} · {active?.billingMonth.slice(0, 7)}
            </DialogDescription>
          </DialogHeader>

          {active ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">{formatMoney(active.totalAmount)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-semibold">{formatMoney(active.paidAmount)}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-semibold">{formatMoney(balance)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Charges (rent {formatMoney(active.rentAmount)})
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Utilities</Label>
                    <Input type="number" min={0} disabled={!editable} value={charges.utilities}
                      onChange={(e) => setCharges({ ...charges, utilities: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Late penalty</Label>
                    <Input type="number" min={0} disabled={!editable} value={charges.penalty}
                      onChange={(e) => setCharges({ ...charges, penalty: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Other</Label>
                    <Input type="number" min={0} disabled={!editable} value={charges.other}
                      onChange={(e) => setCharges({ ...charges, other: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Due date</Label>
                    <Input type="date" disabled={!editable} value={charges.dueDate}
                      onChange={(e) => setCharges({ ...charges, dueDate: e.target.value })} />
                  </div>
                </div>
                {editable ? (
                  <Button className="mt-3" size="sm" variant="secondary" disabled={busy} onClick={() => void saveCharges()}>
                    Save charges
                  </Button>
                ) : null}
              </div>

              {editable && balance > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Record payment
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Amount</Label>
                      <Input type="number" min={1} max={balance} value={pay.amount}
                        onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                        placeholder={`up to ${balance}`} />
                    </div>
                    <div className="space-y-1">
                      <Label>Method</Label>
                      <Select value={pay.method} onValueChange={(v) => setPay({ ...pay, method: v as PaymentMethod })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="bkash">bKash</SelectItem>
                          <SelectItem value="nagad">Nagad</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Paid on</Label>
                      <Input type="date" value={pay.paidOn} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Reference</Label>
                      <Input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
                    </div>
                  </div>
                  <Button className="mt-3" size="sm" disabled={busy} onClick={() => void addPayment()}>
                    Record payment
                  </Button>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment history
                </p>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {payments.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                        <span>
                          <span className={p.amount < 0 ? "text-destructive" : ""}>{formatMoney(p.amount)}</span>{" "}
                          · {p.method}
                          {p.reference ? ` · ${p.reference}` : ""} · {p.paidOn}
                          {p.reversesPaymentId ? " · reversal" : ""}
                          {p.note ? ` — ${p.note}` : ""}
                        </span>
                        {p.amount > 0 && !reversedIds.has(p.id) ? (
                          <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setReversing(p); setReverseNote(""); }}>
                            Reverse
                          </Button>
                        ) : p.amount > 0 ? (
                          <span className="text-xs text-muted-foreground">reversed</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {editable && canDelete && active.paidAmount === 0 ? (
                <Button variant="destructive" size="sm" disabled={busy} onClick={() => void voidInvoice()}>
                  Void invoice
                </Button>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={reversing !== null} onOpenChange={(o) => !o && setReversing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse payment?</DialogTitle>
            <DialogDescription>
              A negative entry of {formatMoney(reversing?.amount ?? 0)} is added. The original stays on record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input value={reverseNote} onChange={(e) => setReverseNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setReversing(null)}>
              Back
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void reverse()}>
              Reverse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}