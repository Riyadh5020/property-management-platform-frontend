import { createFileRoute } from "@tanstack/react-router";
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
import { formatMoney, useCollection } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — EstateOps" },
      {
        name: "description",
        content:
          "Occupancy rate, rent collection, vacancy, maintenance cost and revenue per building.",
      },
      { property: "og:title", content: "Reports & Analytics — EstateOps" },
      { property: "og:description", content: "Portfolio performance analytics per building." },
    ],
  }),
  component: ReportsPage,
});

const COLORS = ["#10b981", "#38bdf8", "#f59e0b", "#f43f5e", "#a78bfa"];

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
  const buildings = useCollection("buildings");
  const units = useCollection("units");
  const invoices = useCollection("invoices");
  const maintenance = useCollection("maintenance");

  const perBuilding = buildings.rows.map((b) => {
    const name = String(b["name"]);
    const bUnits = units.rows.filter((u) => u["building"] === name);
    const occupied = bUnits.filter((u) => u["status"] === "Occupied").length;
    const revenue = bUnits.reduce((sum, u) => sum + Number(u["rent"] ?? 0), 0);
    const cost = maintenance.rows
      .filter((m) => m["building"] === name)
      .reduce((sum, m) => sum + Number(m["cost"] ?? 0), 0);
    return {
      name,
      occupancy: bUnits.length ? Math.round((occupied / bUnits.length) * 100) : 0,
      vacant: bUnits.length - occupied,
      revenue,
      cost,
    };
  });

  const statusBreakdown = ["Occupied", "Vacant", "Reserved", "Under maintenance"].map((status) => ({
    name: status,
    value: units.rows.filter((u) => u["status"] === status).length,
  }));

  const billed = invoices.rows.reduce(
    (sum, i) =>
      sum + Number(i["rent"] ?? 0) + Number(i["utilities"] ?? 0) + Number(i["penalty"] ?? 0),
    0,
  );
  const collected = invoices.rows.reduce((sum, i) => sum + Number(i["paid"] ?? 0), 0);

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
        description="Occupancy, collections, vacancy and maintenance cost across the portfolio."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Rent billed</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(billed)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Rent collected</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{formatMoney(collected)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Collection rate</p>
          <p className="mt-2 text-2xl font-semibold">
            {billed ? Math.round((collected / billed) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Revenue per building" subtitle="Contracted monthly rent roll">
          <BarChart data={perBuilding}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Unit status mix" subtitle="Across all buildings">
          <PieChart>
            <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
              {statusBreakdown.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Occupancy rate per building" subtitle="Percentage of occupied units">
          <BarChart data={perBuilding}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="occupancy" fill="#38bdf8" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Maintenance cost per building" subtitle="Work order spend to date">
          <BarChart data={perBuilding}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="cost" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Vacancy report</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {perBuilding.map((b) => (
            <div key={b.name} className="rounded-lg border border-border px-4 py-3">
              <p className="text-sm font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.vacant} unit(s) not occupied</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
