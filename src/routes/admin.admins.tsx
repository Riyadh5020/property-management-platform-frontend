import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Pencil, Plus, RefreshCw, Search } from "lucide-react";
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
  adminApi,
  propertyApi,
  type AccountStatus,
  type AdminRole,
  type ApiAdmin,
  type ApiProperty,
  type ManagerPermissions,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
export const Route = createFileRoute("/admin/admins")({
  head: () => ({
    meta: [
      { title: "Users — EstateOps admin" },
      {
        name: "description",
        content: "Create users, edit their details and manage their access status.",
      },
      { property: "og:title", content: "Users — EstateOps admin" },
      { property: "og:description", content: "Manage owners and managers on the platform." },
    ],
  }),
  component: AdminAdminsPage,
});

const STATUSES: AccountStatus[] = ["active", "inactive", "suspended", "pending"];
const ROLES: AdminRole[] = ["superAdmin", "owner", "manager"];
const PAGE_SIZE = 20;
const PERMISSION_OPTIONS: { key: keyof ManagerPermissions; label: string }[] = [
  { key: "tenants", label: "Tenants" },
  { key: "rent", label: "Rent & billing" },
  { key: "expenses", label: "Expenses" },
  { key: "maintenance", label: "Maintenance" },
];
const noPermissions: ManagerPermissions = {
  tenants: false,
  rent: false,
  expenses: false,
  maintenance: false,
};
const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
    phoneNumber: "",
  password: "",
  role: "manager" as AdminRole,
};

function AdminAdminsPage() {
  const [admins, setAdmins] = useState<ApiAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAdmin | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerProperties, setOwnerProperties] = useState<ApiProperty[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [propsLoading, setPropsLoading] = useState(false);

  const [permissions, setPermissions] = useState<ManagerPermissions>({ ...noPermissions });
  const [resetTarget, setResetTarget] = useState<ApiAdmin | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<{
    admin: ApiAdmin;
    status: AccountStatus;
  } | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState(false);

  const auth = useAuth();
  const actingRole = auth.admin?.admin?.role;
  const actingId = auth.admin?.admin?.id;
  const targetRoleForCreate: AdminRole = actingRole === "superAdmin" ? "owner" : "manager";

  const navigate = useNavigate();
  const canAssign = actingRole === "owner";

  useEffect(() => {
    if (!auth.ready || !canAssign) return;
    propertyApi
      .list({ limit: 200 })
      .then((res) => setOwnerProperties(res.items))
      .catch(() => toast.error("Could not load properties"));
  }, [auth.ready, canAssign]);
  useEffect(() => {
    if (auth.ready && actingRole === "manager") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [auth.ready, actingRole, navigate]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAdminsPaged({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(roleFilter ? { role: roleFilter as AdminRole } : {}),
      });
      setAdmins(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

   const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, role: targetRoleForCreate });
        setPermissions({ ...noPermissions });
    setSelectedPropertyIds([]);
    setOpen(true);
  };

  const openEdit = (admin: ApiAdmin) => {
    setEditing(admin);
    setForm({
      firstName: admin.firstName ?? "",
      lastName: admin.lastName ?? "",
      email: admin.email,
      phoneNumber: admin.phoneNumber ?? "",
      password: "",
      role: admin.role ?? "manager",
    });
    setPermissions(admin.permissions ?? { ...noPermissions });
    setSelectedPropertyIds([]);
    if (canAssign && admin.role === "manager") {
      setPropsLoading(true);
      adminApi
        .getManagerProperties(admin.id)
        .then((r) => setSelectedPropertyIds(r.propertyIds))
        .catch((err) =>
          toast.error(err instanceof Error ? err.message : "Could not load assigned properties"),
        )
        .finally(() => setPropsLoading(false));
    }
    setOpen(true);
  };

  const submit = async (event?: React.FormEvent, roleChangeConfirmed = false) => {
    event?.preventDefault();
    if (saving) return;
    // A role change alters what the user can see and do, so ask before saving it.
    if (
      editing &&
      actingRole === "superAdmin" &&
      form.role !== editing.role &&
      !roleChangeConfirmed
    ) {
      setConfirmRoleChange(true);
      return;
    }
    setSaving(true);
    try {
          if (editing) {
        await adminApi.updateAdmin(editing.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
         phoneNumber: form.phoneNumber.trim() === "" ? null : form.phoneNumber.trim(),
          ...(actingRole === "superAdmin" ? { role: form.role } : {}),
                    ...(canAssign && editing.role === "manager" ? { permissions } : {}),
        });
        if (canAssign && editing.role === "manager") {
          await adminApi.setManagerProperties(editing.id, selectedPropertyIds);
        }
        toast.success("User updated");
      } else {
  const created = await adminApi.createAdmin({
    ...form,
    phoneNumber:
      form.phoneNumber.trim() === "" ? null : form.phoneNumber.trim(),
    ...(canAssign ? { permissions } : {}),
  });

  if (canAssign && selectedPropertyIds.length > 0) {
    await adminApi.setManagerProperties(created.id, selectedPropertyIds);
  }

  toast.success("User created");
}
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };
  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget || resetting) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setResetting(true);
    try {
      await adminApi.resetUserPassword(resetTarget.id, newPassword);
      toast.success(`Password reset for ${resetTarget.email}`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };


  const applyStatus = async (admin: ApiAdmin, status: AccountStatus) => {
    try {
      await adminApi.updateAdminStatus(admin.id, status);
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, status } : a)));
      toast.success(`Status set to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const requestStatus = (admin: ApiAdmin, status: AccountStatus) => {
    if (status === admin.status) return;
    if (status === "active") void applyStatus(admin, status);
    else setPendingStatus({ admin, status });
  };

  return (
    <AppShell variant={actingRole === "superAdmin" ? "console" : "workspace"}>
      <PageHeader
        title={actingRole === "superAdmin" ? "Users" : "Managers"}
        description={
          actingRole === "superAdmin"
            ? "Owners and managers on the platform."
            : "Managers under your properties."
        }
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New {targetRoleForCreate}
            </Button>
          </>
        }
      />

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="pl-9"
          />
        </div>
        {actingRole === "superAdmin" ? (
          <Select
            value={roleFilter || "__all__"}
            onValueChange={(v) => {
              setRoleFilter(v === "__all__" ? "" : v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All roles</SelectItem>
              <SelectItem value="owner">owner</SelectItem>
              <SelectItem value="manager">manager</SelectItem>
              <SelectItem value="superAdmin">superAdmin</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                                {actingRole === "superAdmin" ? <TableHead>Owner</TableHead> : null}
                                <TableHead>Properties</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Change status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={actingRole === "superAdmin" ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={actingRole === "superAdmin" ? 8 : 7} className="py-10 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      {[admin.firstName, admin.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.role ?? "manager"}</TableCell>
                    {actingRole === "superAdmin" ? (
                      <TableCell>{admin.role === "manager" ? (admin.ownerName ?? "—") : "—"}</TableCell>
                    ) : null}

                                        <TableCell>
                      {admin.role === "manager" ? (admin.propertyCount ?? 0) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.status === "active" ? "default" : "secondary"}>
                        {admin.status ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={admin.status ?? ""}
                        disabled={admin.id === actingId}
                        onValueChange={(value) => requestStatus(admin, value as AccountStatus)}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Set status" />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                                      <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit user"
                        onClick={() => openEdit(admin)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {actingRole === "superAdmin" && admin.role === "owner" && admin.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            auth
                              .viewAsOwner(admin.id)
                              .then(() => navigate({ to: "/dashboard" }))
                              .catch((err: unknown) => {
                                toast.error(err instanceof Error ? err.message : "Could not open this account");
                              });
                          }}
                        >
                          View as owner
                        </Button>
                      ) : null}
                      {admin.id !== actingId &&
                      (actingRole === "superAdmin" ||
                        (actingRole === "owner" && admin.role === "manager")) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Reset password"
                          title="Reset password"
                          onClick={() => {
                            setNewPassword("");
                            setResetTarget(admin);
                          }}
                        >
                          <KeyRound className="size-4" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
          {total}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : `New ${targetRoleForCreate}`}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update account details."
                : `Create a new ${targetRoleForCreate} account.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
         
        <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* নতুন Phone number field */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+8801XXXXXXXXX"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm({ ...form, phoneNumber: e.target.value })
                }
              />
            </div>

            {editing ? null : (


              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}

            {editing && actingRole === "superAdmin" ? (
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as AdminRole })}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.filter((r) => r !== "superAdmin" || editing.role === "superAdmin").map(
                      (role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
                       ) : null}

            {canAssign && (!editing || editing.role === "manager") ? (
              <div className="space-y-2">
                <Label>
                  Properties{" "}
                  <span className="text-muted-foreground">({selectedPropertyIds.length} selected)</span>
                </Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {propsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : ownerProperties.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No properties yet.</p>
                  ) : (
                    ownerProperties.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.includes(p.id)}
                          onChange={(e) =>
                            setSelectedPropertyIds((prev) =>
                              e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                            )
                          }
                        />
                        {p.title}
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  The manager only sees the selected properties.
                </p>
              </div>
            ) : null}

            {canAssign && (!editing || editing.role === "manager") ? (
              <div className="space-y-2">
                <Label>Permissions</Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3">
                  {PERMISSION_OPTIONS.map((p) => (
                    <label key={p.key} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={permissions[p.key]}
                        onChange={(e) =>
                          setPermissions((prev) => ({ ...prev, [p.key]: e.target.checked }))
                        }
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Unticked sections stay hidden and blocked for this manager.
                </p>
              </div>
            ) : null}


            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || propsLoading}>
                {editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingStatus !== null} onOpenChange={(o) => !o && setPendingStatus(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set status to {pendingStatus?.status}?</DialogTitle>
            <DialogDescription>
              {pendingStatus
                ? `${pendingStatus.admin.email} will be signed out and cannot log in until set back to active.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingStatus(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingStatus) void applyStatus(pendingStatus.admin, pendingStatus.status);
                setPendingStatus(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRoleChange} onOpenChange={(o) => !o && setConfirmRoleChange(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role to {form.role}?</DialogTitle>
            <DialogDescription>
              {editing
                ? `${editing.email} is currently ${editing.role ?? "manager"}. Their access changes as soon as you save.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmRoleChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmRoleChange(false);
                void submit(undefined, true);
              }}
            >
              Change role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetTarget !== null} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              {resetTarget
                ? `Set a new password for ${resetTarget.email}. They will be signed out everywhere.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={resetting}>
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}