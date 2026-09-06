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

export const Route = createFileRoute("/admin/reset-password")({
  head: () => ({
    meta: [{ title: "Reset password — EstateOps" }],
  }),
  validateSearch: searchSchema,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { email: prefillEmail } = Route.useSearch();
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await adminApi.resetPassword({ email, code, newPassword });
      void navigate({ to: "/admin/login" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      badge="Restricted area"
      title="Reset your password"
      subtitle="Enter the code we emailed you along with your new password."
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
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Resetting…" : "Reset password"}
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