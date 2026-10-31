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
      { title: "Sign in — EstateOps" },
      {
        name: "description",
        content: "Sign in to EstateOps.",
      },
      { property: "og:title", content: "Sign in — EstateOps" },
      { property: "og:description", content: "Sign in to EstateOps." },
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
      title="Sign in"
      subtitle="Use the email and password you were given."
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
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
         <div className="flex justify-end">
            <Link
              to="/admin/forgot-password"
              search={{ email: email || undefined }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/admin/signup" className="underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}