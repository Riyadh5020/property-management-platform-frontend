import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AuthLayout, FormError } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — EstateOps" },
      { name: "description", content: "Request a password reset link for your EstateOps account." },
      { property: "og:title", content: "Forgot password — EstateOps" },
      { property: "og:description", content: "Recover access to your EstateOps workspace." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await usersApi.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badge="Password recovery"
      title="Forgot your password?"
      subtitle="We'll email you a reset link with a token."
      footer={
        <p className="space-x-3">
          <Link to="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
          <Link to="/reset-password" className="hover:text-foreground">
            I already have a token
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <FormError message={error} />
        {sent ? (
          <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            Reset link sent to {email}.
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
