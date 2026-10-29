import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { type ApiExpense, type ApiProperty, expenseApi, propertyApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — EstateOps" },
      { name: "description", content: "Operating expenses logged per property." },
    ],
  }),
  component: ExpensesPage,
});

const PAGE_SIZE = 20;
const today = () => new Date().toISOString().slice(0, 10);
const catLabel: Record<string, string> = {
  utilities: "Utilities", maintenance: "Maintenance", salary: "Salary",
  supplies: "Supplies", tax: "Tax", other: "Other",
};

const emptyForm = {
  propertyId: "", title: "", category: "other", amount: "",
  expenseDate: today(), paidBy: "", status: "paid", notes: "",
};
type Form = typeof emptyForm;

function ExpensesPage() {
  const { admin, ready } = useAuth();
  // Managers may add and correct records but not delete them (the API enforces this too).
  const canDelete = admin?.admin?.role !== "manager";
  const [items, setItems] = useState<ApiExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiExpense | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ApiExpense | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(0); }, [debounced, statusFilter, categoryFilter, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await expenseApi.list({
        limit: PAGE_SIZE, offset: page * PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalAmount(res.totalAmount);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load expenses");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, statusFilter, categoryFilter, from, to]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    void load();
  }, [ready, admin?.token, load]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    propertyApi.list({ limit: 100 }).then((r) => setProperties(r.items)).catch(() => undefined);
  }, [ready, admin?.token]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm, expenseDate: today() }); setOpen(true); };
  const openEdit = (e: ApiExpense) => {
    setEditing(e);
    setForm({
      propertyId: e.propertyId, title: e.title, category: e.category, amount: String(e.amount),
      expenseDate: e.expenseDate, paidBy: e.paidBy ?? "", status: e.status, notes: e.notes ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!editing && !form.propertyId) { toast.error("Select a property"); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error("Enter an amount greater than 0"); return; }
    if (!form.expenseDate) { toast.error("Date is required"); return; }
    const nullable = (s: string) => (s.trim() ? s.trim() : null);
    const common = {
      title: form.title.trim(), category: form.category, amount: Number(form.amount),
      expenseDate: form.expenseDate, paidBy: nullable(form.paidBy), status: form.status,
      notes: nullable(form.notes),
    };
    setSaving(true);
    try {
      if (editing) {
        await expenseApi.update(editing.id, common);
        toast.success("Expense updated");
      } else {
        await expenseApi.create({ propertyId: form.propertyId, ...common });
        toast.success("Expense added");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save expense");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await expenseApi.remove(deleting.id);
      toast.success("Expense deleted");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete expense");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Expenses"
        description="Operating expenses logged per property."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New expense
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Total (current filters)</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(totalAmount)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Records</p>
          <p className="mt-2 text-2xl font-semibold">{total}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or paid by…" className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {Object.entries(catLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Paid by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No expenses found.</TableCell></TableRow>
              ) : (
                items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap font-medium">{e.title}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.propertyTitle}</TableCell>
                    <TableCell className="whitespace-nowrap">{catLabel[e.category]}</TableCell>
                    <TableCell>{formatMoney(e.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.expenseDate}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.paidBy ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === "paid" ? "default" : "secondary"}>{e.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => openEdit(e)}>
                          <Pencil className="size-4" />
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Delete"
                            onClick={() => setDeleting(e)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
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
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
          <Button variant="secondary" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "New expense"}</DialogTitle>
            <DialogDescription>
              {editing ? "The property cannot be changed." : "Log an operating expense for a property."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {!editing ? (
              <div className="space-y-2 sm:col-span-2">
                <Label>Property <span className="text-destructive">*</span></Label>
                <Select value={form.propertyId} onValueChange={(v) => set("propertyId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select property…" /></SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="e-title">Expense <span className="text-destructive">*</span></Label>
              <Input id="e-title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(catLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-amount">Amount <span className="text-destructive">*</span></Label>
              <Input id="e-amount" type="number" min={1} value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-date">Date <span className="text-destructive">*</span></Label>
              <Input id="e-date" type="date" value={form.expenseDate} onChange={(e) => set("expenseDate", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="e-paid">Paid by</Label>
              <Input id="e-paid" value={form.paidBy} onChange={(e) => set("paidBy", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="e-notes">Notes</Label>
              <Textarea id="e-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Back</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete expense?</DialogTitle>
            <DialogDescription>
              “{deleting?.title}” will be removed from the list. The record is kept for history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Back</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}