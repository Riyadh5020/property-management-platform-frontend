import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CarFront,
  FileSignature,
  Gauge,
  PieChart,
  Receipt,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EstateOps — Multi-building Property Management" },
      {
        name: "description",
        content:
          "Manage buildings, units, tenants, leases, rent, utilities, maintenance and visitors in one place.",
      },
      { property: "og:title", content: "EstateOps — Property Management Console" },
      {
        property: "og:description",
        content: "Buildings, tenants, leases, billing and facilities in one operations platform.",
      },
    ],
  }),
  component: LandingPage,
});

const modules = [
  { icon: Building2, title: "Buildings & units", text: "Multi-building registry with floor, unit type, furnishing and live status." },
  { icon: Users, title: "Tenants", text: "Contact details, ID documents, co-tenants and move-in / move-out dates." },
  { icon: FileSignature, title: "Leases", text: "Agreements, deposits and yearly rent increases." },
  { icon: Receipt, title: "Rent & billing", text: "Automatic monthly invoices, partial payments and printable receipts." },
  { icon: Wrench, title: "Maintenance", text: "Repair requests, owner approval and automatic expense records." },
  { icon: ShieldCheck, title: "Visitors", text: "A simple log of guests, deliveries and incidents." },
  { icon: CarFront, title: "Parking", text: "Assign slots to units and track each slot's fee." },
  { icon: Gauge, title: "Utilities", text: "Meter readings with the bill worked out for you." },
  { icon: PieChart, title: "Records", text: "A full history of who changed what, and when." },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-6">
        <div
          className="flex size-9 items-center justify-center rounded-xl text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Building2 className="size-5" />
        </div>
        <span className="font-semibold">EstateOps</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link to="/admin/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10">
        <p className="mb-4 inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          Property management platform
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Run your buildings, tenants and rent from one place.
        </h1>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          See which flats are occupied, who has paid and what needs fixing, whether you run the building yourself or with a manager.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/admin/signup">Start free trial</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/admin/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div key={module.title} className="rounded-xl border border-border bg-card p-5">
              <module.icon className="size-5 text-primary" />
              <h2 className="mt-3 font-semibold">{module.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{module.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground">
          <p>© 2026 EstateOps</p>
          <div className="flex gap-4">
            <Link to="/admin/login" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}