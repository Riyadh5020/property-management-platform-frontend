import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, RefreshCw } from "lucide-react";
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
import { adminApi, type AccountStatus, type ApiUser } from "@/lib/api";

export const Route = createFileRoute("/admin/admins")({
  head: () => ({
    meta: [
      { title: "Administrators — EstateOps admin" },
      {
        name: "description",
        content: "Create administrators, edit their details and manage their access status.",
      },
      { property: "og:title", content: "Administrators — EstateOps admin" },
      { property: "og:description", content: "Super-admin management of platform administrators." },
    ],
  }),
  component: AdminAdminsPage,
});

const STATUSES: AccountStatus[] = ["active", "inactive", "suspended", "pending"];
const ROLES = ["admin", "superAdmin"];

const emptyForm = { firstName: "", lastName: "", email: "", password: "", role: "admin" };

function AdminAdminsPage() {
  const [admins, setAdmins] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ApiUser | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAdmins(await adminApi.listAdmins());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load administrators");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (admin: ApiUser) => {
    setEditing(admin);
    setForm({
      firstName: admin.firstName ?? "",
      lastName: admin.lastName ?? "",
      email: admin.email,
      password: "",
      role: admin.role ?? "admin",
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editing) {
        await adminApi.updateAdmin(editing.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          role: form.role,
        });
        toast.success("Administrator updated");
      } else {
        await adminApi.createAdmin(form);
        toast.success("Administrator created");
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const changeStatus = async (admin: ApiUser, status: AccountStatus) => {
    try {
      await adminApi.updateAdminStatus(admin.id, status);
      setAdmins((prev) => prev.map((a) => (a.id === admin.id ? { ...a, status } : a)));
      toast.success(`Status set to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <AppShell variant="admin">
      <PageHeader
        title="Administrators"
        description="GET /admins — super-admin token required by the backend."
        actions={
          <>
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" /> New admin
            </Button>
          </>
        }
      />

      {error ? (
        <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Change status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading administrators…
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No administrators returned by the API.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      {[admin.firstName, admin.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{admin.role ?? "admin"}</TableCell>
                    <TableCell>
                      <Badge variant={admin.status === "active" ? "default" : "secondary"}>
                        {admin.status ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={admin.status ?? ""}
                        onValueChange={(value) => void changeStatus(admin, value as AccountStatus)}
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
                        aria-label="Edit admin"
                        onClick={() => openEdit(admin)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit administrator" : "New administrator"}</DialogTitle>
            <DialogDescription>
              {editing ? "PUT /admins/:id sends a full replacement." : "POST /admins/create"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            {editing ? null : (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? "Save changes" : "Create admin"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
