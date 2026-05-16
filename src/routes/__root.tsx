import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts, useLocation } from "@tanstack/react-router";
import { Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { RouteSkeleton } from "@/components/RouteSkeleton";
import { BottomDock } from "@/components/BottomDock";
import { CartFab } from "@/components/CartFab";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/auth/components/AuthProvider";
import { AuthGate } from "@/auth/components/AuthGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SplashScreen } from "@/components/SplashScreen";
import { SiteHeader } from "@/components/SiteHeader";
import { OnboardingCarousel } from "@/components/OnboardingCarousel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { PendingPaymentWatcher } from "@/components/PendingPaymentWatcher";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useKeyboardViewport } from "@/hooks/useKeyboardViewport";
import { usePrefetchOnIdle } from "@/auth/hooks/usePrefetch";

// Mode invité : pages de découverte accessibles sans compte. Le checkout reste protégé via une porte dédiée.
const PUBLIC_ROUTES = [
  "/", "/connexion", "/inscription", "/reset-password", "/cgu", "/confidentialite",
  "/admin/login", "/healthcheck", "/recherche", "/explorer", "/panier", "/cuisines", "/proximite", "/populaire",
  "/decouvrir", "/aide", "/contact", "/devenir-livreur", "/devenir-resto", "/mboapass",
  "/parrainage", "/favoris",
];
const PUBLIC_PREFIXES = ["/admin", "/r/", "/restaurants/", "/categorie/", "/aide/"];

function OnboardingGate() {
  const { seen, hydrated, markSeen } = useOnboarding();
  const location = useLocation();
  // Ne pas afficher l'onboarding sur les pages auth/admin
  const blocked = location.pathname.startsWith("/admin") ||
    ["/connexion", "/inscription", "/reset-password"].includes(location.pathname);
  if (!hydrated || seen || blocked) return null;
  return <OnboardingCarousel onDone={markSeen} />;
}

// AuthGate est maintenant importé depuis @/auth/components/AuthGate (refonte sécurité).
// Le mode `?preview=1` (bypass auth) a été supprimé — corrige audit C6.


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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { title: "MboaEats — Commandez vos repas préférés livrés chez vous au Cameroun" },
      { name: "description", content: "Commandez vos repas préférés livrés chez vous au Cameroun. Livraison rapide à Douala, Yaoundé et Bafoussam, paiement Mobile Money." },
      { name: "theme-color", content: "#142D22" },
      { property: "og:title", content: "MboaEats — Livraison de repas au Cameroun" },
      { property: "og:description", content: "Commandez vos repas préférés livrés chez vous au Cameroun." },
      { property: "og:type", content: "website" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "MboaEats" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "twitter:title", content: "MboaEats — Livraison de repas au Cameroun" },
      { name: "twitter:description", content: "Commandez vos repas préférés livrés chez vous au Cameroun." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d3729ec-9cf5-45e7-96f4-a8819c3aa5ef/id-preview-649f056f--0ac923c5-ec65-4717-8223-98b35712ae67.lovable.app-1778071659144.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1d3729ec-9cf5-45e7-96f4-a8819c3aa5ef/id-preview-649f056f--0ac923c5-ec65-4717-8223-98b35712ae67.lovable.app-1778071659144.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" },
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
  useKeyboardViewport();
  usePrefetchOnIdle([
    { to: "/panier" },
    { to: "/commandes" },
    { to: "/profil" },
    { to: "/recherche" },
  ]);
  const { queryClient } = Route.useRouteContext();
  const location = useLocation();
  const path = location.pathname;
  const isPreview =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1";
  const hideDock =
    isPreview ||
    PUBLIC_ROUTES.includes(path) ||
    PUBLIC_PREFIXES.some((p) => path.startsWith(p));
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <SplashScreen />
          <OfflineBanner />
          <AuthGate>
            {!hideDock && <SiteHeader />}
            {/* Suspense global : permet à une route lazy de streamer sans
                démonter Header / BottomDock. RootErrorBoundary capture les
                crashs en localisant l'erreur sous l'Outlet uniquement. */}
            <RootErrorBoundary>
              <Suspense fallback={<RouteSkeleton />}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={path}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{ minHeight: "100dvh" }}
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </Suspense>
            </RootErrorBoundary>
            {!hideDock && <CartFab />}
            <BottomDock />
            <Toaster position="top-right" richColors closeButton />
          </AuthGate>
          <PendingPaymentWatcher />
          <OnboardingGate />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
