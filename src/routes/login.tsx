import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, FormError } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — EstateOps Property Management" },
      {
        name: "description",
        content: "Sign in to the EstateOps console to manage buildings, tenants, leases and rent.",
      },
      { property: "og:title", content: "Sign in — EstateOps" },
      { property: "og:description", content: "Access your property management workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.ready && auth.user) navigate({ to: "/dashboard", replace: true });
  }, [auth.ready, auth.user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await auth.loginUser(email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badge="Tenant & manager access"
      title="Sign in"
      subtitle="Use the account you registered with the EstateOps API."
      footer={
        <div className="space-y-2">
          <p>
            No account?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
          <p>
            <Link to="/admin/login" className="hover:text-foreground">
              Administrator sign in →
            </Link>
          </p>
        </div>
      }
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
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
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
        <p className="text-center text-xs text-muted-foreground">
          Email not verified yet?{" "}
          <Link to="/verify-email" className="text-primary hover:underline">
            Verify or resend
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
