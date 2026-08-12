import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Trash2 } from "lucide-react";
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
import { adminApi, type AccountStatus, type ApiUser } from "@/lib/api";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "User management — EstateOps admin" },
      {
        name: "description",
        content: "Browse registered users, update account status and remove accounts.",
      },
      { property: "og:title", content: "User management — EstateOps admin" },
      { property: "og:description", content: "Administer registered EstateOps users." },
    ],
  }),
  component: AdminUsersPage,
});

const STATUSES: AccountStatus[] = ["active", "inactive", "suspended", "pending"];

function statusVariant(status?: string) {
  if (status === "active") return "default" as const;
  if (status === "pending") return "secondary" as const;
  return "destructive" as const;
}

function AdminUsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminApi.listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (user: ApiUser, status: AccountStatus) => {
    try {
      await adminApi.updateUserStatus(user.id, status);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, status } : u)));
      toast.success(`Status set to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const removeUser = async (user: ApiUser) => {
    if (!window.confirm(`Delete ${user.email}?`)) return;
    try {
      await adminApi.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("User deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filtered = users.filter((u) =>
    `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <AppShell variant="admin">
      <PageHeader
        title="Users"
        description="GET /users/admin — live data from your backend."
        actions={
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />

      <div className="mb-4 max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users…"
        />
      </div>

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
                <TableHead>Status</TableHead>
                <TableHead>Change status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No users returned by the API.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(user.status)}>{user.status ?? "unknown"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.status ?? ""}
                        onValueChange={(value) => void changeStatus(user, value as AccountStatus)}
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
                        aria-label="Delete user"
                        onClick={() => void removeUser(user)}
                      >
                        <Trash2 className="size-4 text-destructive" />
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
