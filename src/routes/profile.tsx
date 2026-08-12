import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My account — EstateOps" },
      {
        name: "description",
        content: "Update your EstateOps profile, password and profile image.",
      },
      { property: "og:title", content: "My account — EstateOps" },
      { property: "og:description", content: "Manage your EstateOps account details." },
    ],
  }),
  component: ProfilePage,
});

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-4 text-xs text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}

function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    address: "",
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .me()
      .then((me) => {
        if (cancelled) return;
        auth.setUserProfile(me);
        setProfile({
          firstName: me.firstName ?? "",
          lastName: me.lastName ?? "",
          phoneNumber: me.phoneNumber ?? "",
          address: me.address ?? "",
        });
        setImageUrl(me.profileImageUrl ?? "");
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Could not load profile");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const updated = await usersApi.updateMe(profile);
      auth.setUserProfile(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await usersApi.changePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change failed");
    }
  };

  const saveImage = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const updated = await usersApi.updateProfileImage({ profileImageUrl: imageUrl });
      auth.setUserProfile(updated);
      toast.success("Profile image updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    try {
      await usersApi.deleteMe();
      auth.logoutUser();
      navigate({ to: "/login", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="My account"
        description="These fields are read from and written to your backend API."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Profile" description="PATCH /users/me">
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone</Label>
              <Input
                id="phoneNumber"
                value={profile.phoneNumber}
                onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
            </div>
            <Button type="submit" disabled={loading}>
              Save profile
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card title="Change password" description="PATCH /users/change-password">
            <form onSubmit={savePassword} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  required
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  required
                  minLength={6}
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                />
              </div>
              <Button type="submit" variant="secondary">
                Update password
              </Button>
            </form>
          </Card>

          <Card title="Profile image" description="PATCH /users/profile-image (URL)">
            <form onSubmit={saveImage} className="flex gap-2">
              <Input
                value={imageUrl}
                placeholder="https://example.com/avatar.jpg"
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <Button type="submit" variant="secondary">
                Save
              </Button>
            </form>
          </Card>

          <Card title="Danger zone" description="DELETE /users/me — permanently removes your account">
            <Button variant="destructive" onClick={deleteAccount}>
              Delete my account
            </Button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
