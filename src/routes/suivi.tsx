import { createFileRoute, redirect } from "@tanstack/react-router";

// Page legacy : redirige vers la liste des commandes.
// Le vrai suivi temps réel vit sur /suivi/$orderId.
export const Route = createFileRoute("/suivi")({
  beforeLoad: () => {
    throw redirect({ to: "/commandes" });
  },
  component: () => null,
});
