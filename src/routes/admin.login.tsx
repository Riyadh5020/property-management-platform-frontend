import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, FormError } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Administrator sign in — EstateOps" },
      {
        name: "description",
        content: "Administrator console sign in for EstateOps user and admin management.",
      },
      { property: "og:title", content: "Administrator sign in — EstateOps" },
      { property: "og:description", content: "Restricted administrator access." },
    ],
  }),
  component: AdminLoginPage,
});

function homeFor(role: string | undefined) {
  return role === "superAdmin" ? "/admin" : "/dashboard";
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.ready && auth.admin) {
      navigate({ to: homeFor(auth.admin.admin?.role), replace: true });
    }
  }, [auth.ready, auth.admin, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.loginAdmin(email, password);
      // navigation happens via the useEffect above once auth.admin updates
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badge="Restricted area"
      title="Administrator sign in"
      subtitle="Separate credentials from tenant/manager accounts."
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <div className="space-y-2">
          <Label htmlFor="email">Admin email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="superadmin@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}