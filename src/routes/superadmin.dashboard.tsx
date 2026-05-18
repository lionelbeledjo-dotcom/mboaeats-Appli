import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias /superadmin/dashboard → /superadmin (la racine superadmin EST le dashboard).
export const Route = createFileRoute("/superadmin/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/superadmin" });
  },
});
