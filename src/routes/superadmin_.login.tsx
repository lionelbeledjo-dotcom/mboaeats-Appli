import { createFileRoute } from "@tanstack/react-router";
import { SuperAdminLoginForm } from "@/components/admin/SuperAdminLoginForm";

export const Route = createFileRoute("/superadmin_/login")({
  component: SuperAdminLoginForm,
  head: () => ({
    meta: [
      { title: "MboaEats SuperAdmin · Connexion" },
      { name: "description", content: "Console SUPER_ADMIN MboaEats — accès propriétaire plateforme." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
