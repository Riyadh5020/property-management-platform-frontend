import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CarFront,
  ClipboardList,
  CreditCard,
  FileSignature,
  Gauge,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PhoneCall,
  PieChart,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  UserCog,
  Wallet,
  Wrench,
  Warehouse,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { displayName, initials, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Building2;
}

type NavSection = { group: string; items: NavItem[] };

const managerNav: NavSection[] = [
  {
    group: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Operations",
    items: [
      { to: "/expenses", label: "Expenses", icon: Wallet },
      { to: "/parking", label: "Parking", icon: CarFront },
      { to: "/tenants", label: "Tenants", icon: Users },
      { to: "/maintenance", label: "Maintenance", icon: Wrench },
      { to: "/billing", label: "Rent & billing", icon: Receipt },
      { to: "/staff", label: "Staff", icon: ClipboardList },
      { to: "/emergency-contacts", label: "Emergency contacts", icon: PhoneCall },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/notices", label: "Notices", icon: Megaphone },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ownerNav: NavSection[] = [
  {
    group: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Operations",
    items: [
      { to: "/expenses", label: "Expenses", icon: Wallet },
      { to: "/parking", label: "Parking", icon: CarFront },
      { to: "/tenants", label: "Tenants", icon: Users },
      { to: "/maintenance", label: "Maintenance approvals", icon: Wrench },
      { to: "/billing", label: "Rent & billing", icon: Receipt },
      { to: "/staff", label: "Staff", icon: ClipboardList },
      { to: "/emergency-contacts", label: "Emergency contacts", icon: PhoneCall },
    ],
  },
  {
    group: "Ownership",
    items: [
      { to: "/flat-status", label: "Flat status", icon: Building2 },
      { to: "/admin/admins", label: "Manage managers", icon: Shield },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/notices", label: "Notices", icon: Megaphone },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const superAdminConsoleNav: NavSection[] = [
  {
    group: "Console",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard },
      { to: "/admin/admins", label: "Administrators", icon: Shield },
    ],
  },
  {
    group: "Platform",
    items: [
      { to: "/reports", label: "Reports", icon: PieChart },
      { to: "/buildings", label: "Property update", icon: Building2 },
      { to: "/building-accounts", label: "Building accounts", icon: CreditCard },
      { to: "/subscriptions", label: "Subscription", icon: Sparkles },
      { to: "/notices", label: "Notices", icon: Megaphone },
    ],
  },
];

export function AppShell({
  children,
  variant = "workspace",
}: {
  children: ReactNode;
  variant?: "workspace" | "console";
}) {
   const navigate = useNavigate();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = auth.admin;
  const role = session?.admin?.role;
  const isConsole = variant === "console" || role === "superAdmin";

  const nav = isConsole
    ? superAdminConsoleNav
    : role === "owner"
      ? ownerNav
      : managerNav;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!auth.ready) return;
    if (!session) navigate({ to: "/admin/login", replace: true });
  }, [auth.ready, session, navigate]);

  if (!auth.ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  const handleSignOut = () => {
    auth.logoutAdmin();
    navigate({ to: "/admin/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div
            className="flex size-10 items-center justify-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Building2 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">EstateOps</p>
            <p className="truncate text-xs text-muted-foreground">
              {isConsole ? "Admin console" : "Property management"}
            </p>
          </div>
          <button
            className="ml-auto text-muted-foreground lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {nav.map((section) => (
            <div key={section.group}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.group}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.to === "/admin" }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_0_var(--sidebar-primary)]",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(session.admin)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName(session.admin)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {session.admin?.email ?? "Signed in"}
              </p>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full" onClick={handleSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:px-8">
          <button
            className="text-muted-foreground lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <p className="text-sm text-muted-foreground">
            {isConsole ? "Administration" : "Workspace"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {isConsole ? (
              <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
                Property workspace
              </Link>
            ) : role !== "manager" ? (
              <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">
                Admin console
              </Link>
            ) : null}
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}