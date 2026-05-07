import { createFileRoute } from "@tanstack/react-router";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const Route = createFileRoute("/admin_/login")({
  component: AdminLoginForm,
  head: () => ({
    meta: [
      { title: "MboaEats Administration · Connexion" },
      { name: "description", content: "Console privée MboaEats — accès propriétaire." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});
