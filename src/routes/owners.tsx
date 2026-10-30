import { createFileRoute, redirect } from "@tanstack/react-router";

// The old demo page; owners are managed under Users.
export const Route = createFileRoute("/owners")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/admins" });
  },
});
