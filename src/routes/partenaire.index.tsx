import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/partenaire/")({
  beforeLoad: () => {
    throw redirect({ to: "/partenaire/commandes" });
  },
});
