import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { AuthLayout, FormError } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminApi } from "@/lib/api";

const searchSchema = z.object({
  email: z.string().optional(),
});

export const Route = createFileRoute("/admin/forgot-password")({
  head: () => ({
    meta: [{ title: "Forgot password — EstateOps" }],
  }),
  validateSearch: searchSchema,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { email: prefillEmail } = Route.useSearch();
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await adminApi.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setResetLoading(true);
    try {
      await adminApi.resetPassword({ email, code, newPassword });
      void navigate({ to: "/admin/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        badge="Restricted area"
        title="Enter your reset code"
        subtitle={`We sent a 6-digit code to ${email}.`}
      >
        <form onSubmit={submitReset} className="space-y-4">
          <FormError message={error} />
          <div className="space-y-2">
            <Label htmlFor="code">Reset code</Label>
            <Input
              id="code"
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={resetLoading}>
            {resetLoading ? "Resetting…" : "Reset password"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Didn't get a code?{" "}
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-foreground hover:underline"
            >
              Try a different email
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      badge="Restricted area"
      title="Forgot your password?"
      subtitle="Enter your admin email and we'll send you a reset code."
    >
      <form onSubmit={sendCode} className="space-y-4">
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset code"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/admin/login" className="text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}