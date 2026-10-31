import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { billingApi, type ApiCoupon } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons — EstateOps" },
      { name: "description", content: "Discount codes for subscription invoices." },
    ],
  }),
  component: CouponsPage,
});

const emptyForm = { code: "", discountType: "percent", value: "", maxUses: "", expiresOn: "" };

function CouponsPage() {
  const { admin, ready } = useAuth();
  const [coupons, setCoupons] = useState<ApiCoupon[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setCoupons(await billingApi.coupons());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "unknown error");
    }
  }, []);

  useEffect(() => {
    if (ready && admin?.token) void load();
  }, [ready, admin?.token, load]);

  const create = async () => {
    setSaving(true);
    try {
      await billingApi.createCoupon({
        code: form.code.trim(),
        discountType: form.discountType,
        value: Number(form.value),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresOn: form.expiresOn || null,
      });
      toast.success("Coupon created");
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create coupon");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (coupon: ApiCoupon) => {
    try {
      await billingApi.setCouponStatus(coupon.id, coupon.status === "active" ? "inactive" : "active");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change coupon");
    }
  };

  return (
    <AppShell variant="console">
      <PageHeader
        title="Coupons"
        description="Discount codes owners can use on a due subscription invoice."
      />

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">New coupon</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="c-code">Code</Label>
            <Input id="c-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Discount type</Label>
            <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percent</SelectItem>
                <SelectItem value="fixed">Fixed amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-value">{form.discountType === "percent" ? "Percent off" : "Taka off"}</Label>
            <Input
              id="c-value"
              type="number"
              min={1}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-max">Use limit (optional)</Label>
            <Input
              id="c-max"
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-exp">Ends on (optional)</Label>
            <Input
              id="c-exp"
              type="date"
              value={form.expiresOn}
              onChange={(e) => setForm({ ...form, expiresOn: e.target.value })}
            />
          </div>
        </div>
        <Button
          className="mt-4"
          size="sm"
          disabled={saving || !form.code.trim() || !form.value}
          onClick={() => void create()}
        >
          Create coupon
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Ends on</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <p className="text-destructive">Could not load coupons: {loadError}</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => void load()}>
                      Try again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No coupons yet.
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.code}</TableCell>
                    <TableCell>
                      {c.discountType === "percent" ? `${Number(c.value)}%` : formatMoney(c.value)}
                    </TableCell>
                    <TableCell>
                      {c.usedCount}
                      {c.maxUses ? ` of ${c.maxUses}` : ""}
                    </TableCell>
                    <TableCell>{c.expiresOn ? String(c.expiresOn).slice(0, 10) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "outline"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => void toggle(c)}>
                        {c.status === "active" ? "Turn off" : "Turn on"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
}
