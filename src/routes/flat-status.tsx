import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { type ApiFlat, type FlatRestrictedField, flatStatusApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/flat-status")({
  head: () => ({
    meta: [
      { title: "Flat status — EstateOps" },
      { name: "description", content: "Live occupancy and condition per flat." },
    ],
  }),
  component: FlatStatusPage,
});

const PAGE_SIZE = 20;

function occVariant(o: string): "default" | "secondary" | "destructive" | "outline" {
  if (o === "occupied") return "default";
  if (o === "reserved") return "secondary";
  if (o === "maintenance") return "destructive";
  return "outline";
}

function FlatStatusPage() {
  const { admin, ready } = useAuth();
  const [items, setItems] = useState<ApiFlat[]>([]);
  const [total, setTotal] = useState(0);
  const [restricted, setRestricted] = useState<FlatRestrictedField[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [occ, setOcc] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setPage(0);
  }, [debounced, occ]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await flatStatusApi.list({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(debounced ? { search: debounced } : {}),
        ...(occ !== "all" ? { occupancy: occ } : {}),
      });
      setItems(res.items);
      setTotal(res.total);
      setRestricted(res.restrictedFields);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, occ]);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    void load();
  }, [ready, admin?.token, load]);

  // Columns the backend withheld for this manager are hidden rather than shown as empty.
  const shows = (field: FlatRestrictedField) => !restricted.includes(field);
  const columnCount = 7 - restricted.length;

  return (
    <AppShell>
      <PageHeader
        title="Flat status"
        description="Live occupancy, tenant, open maintenance and overdue invoices per flat."
        actions={
          <Button variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search unit or property…"
            className="pl-9"
          />
        </div>
        <Select value={occ} onValueChange={setOcc}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="vacant">Vacant</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
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
                <TableHead>Unit</TableHead>
                <TableHead>Property / floor</TableHead>
                <TableHead>Occupancy</TableHead>
                {shows("tenantName") ? <TableHead>Tenant</TableHead> : null}
                {shows("leaseEnd") ? <TableHead>Lease ends</TableHead> : null}
                {shows("openMaintenance") ? <TableHead>Open work orders</TableHead> : null}
                {shows("overdueInvoices") ? <TableHead>Overdue invoices</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="py-10 text-center">
                    <p className="text-destructive">Could not load flat status: {loadError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => void load()}
                    >
                      Try again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columnCount}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No flats found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((f) => (
                  <TableRow key={f.unitId}>
                    <TableCell className="font-medium">{f.unitCode}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{f.propertyTitle}</div>
                      <div className="text-xs text-muted-foreground">Floor {f.floorNumber}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={occVariant(f.occupancy)}>{f.occupancy}</Badge>
                    </TableCell>
                    {shows("tenantName") ? (
                      <TableCell className="whitespace-nowrap">{f.tenantName ?? "—"}</TableCell>
                    ) : null}
                    {shows("leaseEnd") ? (
                      <TableCell className="whitespace-nowrap">{f.leaseEnd ?? "—"}</TableCell>
                    ) : null}
                    {shows("openMaintenance") ? (
                      <TableCell>{f.openMaintenance ?? 0}</TableCell>
                    ) : null}
                    {shows("overdueInvoices") ? (
                      <TableCell>
                        {(f.overdueInvoices ?? 0) > 0 ? (
                          <Badge variant="destructive">{f.overdueInvoices}</Badge>
                        ) : (
                          0
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
