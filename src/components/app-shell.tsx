import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CarFront,
  ClipboardList,
  FileSignature,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  UserCog,
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

const propertyNav: { group: string; items: NavItem[] }[] = [
  {
    group: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Portfolio",
    items: [
      { to: "/buildings", label: "Buildings", icon: Building2 },
      { to: "/units", label: "Units", icon: Warehouse },
      { to: "/amenities", label: "Amenities", icon: Sparkles },
      { to: "/parking", label: "Parking", icon: CarFront },
    ],
  },
  {
    group: "Occupancy",
    items: [
      { to: "/tenants", label: "Tenants", icon: Users },
      { to: "/leases", label: "Leases", icon: FileSignature },
      { to: "/owners", label: "Owners", icon: PieChart },
    ],
  },
  {
    group: "Operations",
    items: [
      { to: "/billing", label: "Rent & billing", icon: Receipt },
      { to: "/utilities", label: "Utilities", icon: Gauge },
      { to: "/maintenance", label: "Maintenance", icon: Wrench },
      { to: "/visitors", label: "Visitors & security", icon: ShieldCheck },
      { to: "/staff", label: "Staff", icon: ClipboardList },
    ],
  },
  {
    group: "Insights",
    items: [
      { to: "/reports", label: "Reports", icon: PieChart },
      { to: "/profile", label: "My account", icon: UserCog },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AppShell({
  children,
  variant = "user",
}: {
  children: ReactNode;
  variant?: "user" | "admin";
}) {
  const navigate = useNavigate();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = variant === "admin";
  const session = isAdmin ? auth.admin : auth.user;

  const adminNav: { group: string; items: NavItem[] }[] = [
    {
      group: "Console",
      items: [
        { to: "/admin", label: "Overview", icon: LayoutDashboard },
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/admins", label: "Administrators", icon: Shield },
      ],
    },
  ];
  const nav = isAdmin ? adminNav : propertyNav;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!auth.ready) return;
    if (!session) navigate({ to: isAdmin ? "/admin/login" : "/login", replace: true });
  }, [auth.ready, session, isAdmin, navigate]);

  if (!auth.ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  const handleSignOut = () => {
    if (isAdmin) auth.logoutAdmin();
    else auth.logoutUser();
    navigate({ to: isAdmin ? "/admin/login" : "/login", replace: true });
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
              {isAdmin ? "Admin console" : "Property management"}
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
              {initials(session.user)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName(session.user)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {session.user?.email ?? "Signed in"}
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
            {isAdmin ? "Administration" : "Workspace"}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {isAdmin ? (
              <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
                Property workspace
              </Link>
            ) : (
              <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground">
                Admin console
              </Link>
            )}
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
