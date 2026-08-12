import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  badge,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  badge?: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between p-12 lg:flex" style={{ background: "var(--gradient-brand)" }}>
        <Link to="/" className="flex items-center gap-3 text-primary-foreground">
          <Building2 className="size-6" />
          <span className="text-lg font-semibold">EstateOps</span>
        </Link>
        <div className="text-primary-foreground">
          <h2 className="max-w-md text-3xl font-semibold leading-tight">
            Buildings, tenants, leases, billing and facilities in one operations console.
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-80">
            Multi-building portfolios, unit-level status tracking, rent collection and owner
            payouts — built for property managers.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/70">© 2026 EstateOps</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {badge ? (
            <span className="mb-4 inline-flex rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {badge}
            </span>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8 space-y-4">{children}</div>
          {footer ? <div className="mt-6 text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
