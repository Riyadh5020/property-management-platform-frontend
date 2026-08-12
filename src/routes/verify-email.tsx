import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AuthLayout, FormError } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  head: () => ({
    meta: [
      { title: "Verify email — EstateOps" },
      {
        name: "description",
        content: "Confirm your EstateOps email address or request a new verification link.",
      },
      { property: "og:title", content: "Verify email — EstateOps" },
      { property: "og:description", content: "Activate your EstateOps account." },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await usersApi.verifyEmail({ token });
      setMessage("Email verified. You can sign in now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    setMessage(null);
    try {
      await usersApi.resendVerification({ email });
      setMessage("If that account is pending, a new verification email is on the way.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend");
    }
  };

  return (
    <AuthLayout
      badge="Account activation"
      title="Verify your email"
      subtitle="Paste the token from your verification email, or request a new one."
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={verify} className="space-y-4">
        <FormError message={error} />
        {message ? (
          <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            {message}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="token">Verification token</Label>
          <Input id="token" required value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <div className="space-y-2 border-t border-border pt-4">
        <Label htmlFor="resend-email">Resend verification email</Label>
        <div className="flex gap-2">
          <Input
            id="resend-email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="button" variant="secondary" onClick={resend} disabled={!email}>
            Resend
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
