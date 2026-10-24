import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell, PageHeader } from "@/components/app-shell";
import { reportApi, type ApiReportProperty } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — EstateOps" },
      {
        name: "description",
        content: "Occupancy, vacancy and rent roll per property.",
      },
      { property: "og:title", content: "Reports & Analytics — EstateOps" },
      { property: "og:description", content: "Portfolio performance analytics per property." },
    ],
  }),
  component: ReportsPage,
});

const COLORS = ["#10b981", "#38bdf8", "#f59e0b", "#f43f5e"];

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { admin, ready } = useAuth();
  const [rows, setRows] = useState<ApiReportProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !admin?.token) return;
    reportApi
      .stats()
      .then((res) => setRows(res.properties))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load reports"));
  }, [ready, admin?.token]);

  const properties = rows ?? [];
  const perProperty = properties.map((p) => ({
    name: p.title,
    occupancy: p.units ? Math.round((p.occupied / p.units) * 100) : 0,
    notOccupied: p.units - p.occupied,
    rentRoll: p.rentRoll,
    occupiedRent: p.occupiedRent,
  }));

  const sum = (k: "occupied" | "vacant" | "reserved" | "maintenance" | "units") =>
    properties.reduce((s, p) => s + p[k], 0);
  const statusBreakdown = [
    { name: "Occupied", value: sum("occupied") },
    { name: "Vacant", value: sum("vacant") },
    { name: "Reserved", value: sum("reserved") },
    { name: "Maintenance", value: sum("maintenance") },
  ].filter((s) => s.value > 0);

  const totalRentRoll = properties.reduce((s, p) => s + p.rentRoll, 0);
  const totalOccupiedRent = properties.reduce((s, p) => s + p.occupiedRent, 0);
  const totalUnits = sum("units");
  const overallOccupancy = totalUnits ? Math.round((sum("occupied") / totalUnits) * 100) : 0;

  const tooltipStyle = {
    background: "oklch(0.26 0.03 258)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#f8fafc",
    fontSize: 12,
  };

  return (
    <AppShell>
      <PageHeader
        title="Reports & analytics"
        description="Occupancy, vacancy and rent roll across your properties."
      />

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Monthly rent roll</p>
              <p className="mt-2 text-2xl font-semibold">{formatMoney(totalRentRoll)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Sum of unit rents</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Rent from occupied units</p>
              <p className="mt-2 text-2xl font-semibold text-primary">
                {formatMoney(totalOccupiedRent)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Occupancy</p>
              <p className="mt-2 text-2xl font-semibold">{overallOccupancy}%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {sum("occupied")} of {totalUnits} units
              </p>
            </div>
          </div>

          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">No properties to report on yet.</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Rent roll per property" subtitle="Total monthly rent of all units">
                <BarChart data={perProperty}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="rentRoll" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartCard>

              <ChartCard title="Unit status mix" subtitle="Across all properties">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ChartCard>

              <ChartCard title="Occupancy per property" subtitle="Percentage of occupied units">
                <BarChart data={perProperty}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="occupancy" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartCard>

              <ChartCard title="Units not occupied" subtitle="Vacant, reserved and under maintenance">
                <BarChart data={perProperty}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="notOccupied" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartCard>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 font-semibold">Vacancy report</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {properties.map((p) => (
                <div key={p.id} className="rounded-lg border border-border px-4 py-3">
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.vacant} vacant · {p.reserved} reserved · {p.maintenance} in maintenance
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.floors} floors · {p.units} units
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}