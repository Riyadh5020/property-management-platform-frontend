import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, FormError } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — EstateOps" },
      { name: "description", content: "Set a new password for your EstateOps account." },
      { property: "og:title", content: "Reset password — EstateOps" },
      { property: "og:description", content: "Choose a new EstateOps password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("token");
    if (fromUrl) setToken(fromUrl);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await usersApi.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate({ to: "/login" }), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badge="Password recovery"
      title="Set a new password"
      subtitle="Paste the token from the reset email and choose a new password."
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Back to sign inasf
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        {done ? (
          <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            Password updated. Redirecting to sign in…
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="token">Reset token</Label>
          <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
