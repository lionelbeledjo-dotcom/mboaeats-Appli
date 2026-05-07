import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BottomDock } from "@/components/BottomDock";
import { CartFab } from "@/components/CartFab";
import { NotificationBell } from "@/components/NotificationBell";
import { Toaster } from "@/components/ui/sonner";
import { useSessionUser } from "@/hooks/useSessionUser";

const PUBLIC_ROUTES = ["/connexion", "/admin/login", "/healthcheck"];
const PUBLIC_PREFIXES = ["/admin"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useSessionUser();

  const path = location.pathname;
  const isPublic =
    PUBLIC_ROUTES.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      navigate({ to: "/connexion", replace: true });
    }
  }, [loading, user, isPublic, navigate]);

  if (loading) return null;
  if (!user && !isPublic) return null;
  return <>{children}</>;
}

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MboaEats — Livraison de repas premium au Cameroun" },
      { name: "description", content: "Commandez vos plats préférés à Douala, Yaoundé et Bafoussam. Livraison rapide, paiement Mobile Money, mode Tablée." },
      { name: "theme-color", content: "#1A1A2E" },
      { property: "og:title", content: "MboaEats — Livraison de repas premium au Cameroun" },
      { property: "og:description", content: "Commandez vos plats préférés à Douala, Yaoundé et Bafoussam. Livraison rapide, paiement Mobile Money, mode Tablée." },
      { property: "og:type", content: "website" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "MboaEats" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "twitter:title", content: "MboaEats — Livraison de repas premium au Cameroun" },
      { name: "twitter:description", content: "Commandez vos plats préférés à Douala, Yaoundé et Bafoussam. Livraison rapide, paiement Mobile Money, mode Tablée." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d3729ec-9cf5-45e7-96f4-a8819c3aa5ef/id-preview-649f056f--0ac923c5-ec65-4717-8223-98b35712ae67.lovable.app-1778071659144.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d3729ec-9cf5-45e7-96f4-a8819c3aa5ef/id-preview-649f056f--0ac923c5-ec65-4717-8223-98b35712ae67.lovable.app-1778071659144.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const location = useLocation();
  const path = location.pathname;
  const hideDock =
    PUBLIC_ROUTES.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  return (
    <AuthGate>
      <Outlet />
      {!hideDock && (
        <div className="fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
          <NotificationBell />
        </div>
      )}
      {!hideDock && <CartFab />}
      {!hideDock && <BottomDock />}
      <Toaster position="top-right" richColors closeButton />
    </AuthGate>
  );
}
