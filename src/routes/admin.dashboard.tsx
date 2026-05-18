import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias /admin/dashboard → /admin (la racine admin EST le dashboard).
// Existe pour que le bouton "Accueil" du header admin ait une URL stable
// et explicite, conforme à la nav interne demandée.
export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
