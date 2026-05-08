import { createFileRoute, Link, Outlet, redirect, useRouter, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Store, Bike, AlertTriangle, Coins, Settings, ArrowLeft,
  TrendingUp, Users, ShieldCheck, ShieldAlert, Search, Star, Check, X, MoreHorizontal, MapPin, LogOut, Utensils, Menu,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { isRedirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    // Skip during SSR/prerender — no client session available, the client-side
    // re-execution after hydration will perform the real check.
    if (typeof window === "undefined") return;
    try {
      // Client-side gate via Supabase (RLS protects user_roles, so this read
      // is authoritative — a non-admin cannot fake a row here).
      // Each /admin server function additionally re-asserts the admin role
      // server-side before returning data, so no privileged data leaks even
      // if this gate is somehow bypassed in the browser.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw redirect({ to: "/admin/login" });
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) throw redirect({ to: "/admin/login" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/admin/login" });
    }
  },
  component: AdminLayout,
  errorComponent: AdminErrorBoundary,
  head: () => ({
    meta: [
      { title: "Admin · MboaEats Console" },
      { name: "description", content: "Console d'administration MboaEats : commissions, restaurants, livreurs, litiges." },
    ],
  }),
});

function AdminErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="font-display text-2xl font-bold">Une erreur est survenue</h2>
      <p className="max-w-md text-sm text-muted-foreground">{error?.message ?? "La page a planté de façon inattendue."}</p>
      <div className="flex gap-2">
        <button onClick={() => reset()} className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold hover:bg-background">
          Réessayer
        </button>
        <Link to="/admin" className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}

type NavTone = {
  bar: string; bg: string; text: string; icon: string; ring: string; glow: string;
};
const TONES: Record<string, NavTone> = {
  blue:   { bar: "bg-blue-500",    bg: "bg-blue-500/10",    text: "text-blue-300",    icon: "text-blue-400",    ring: "ring-blue-500/40",    glow: "shadow-[0_0_18px_-4px_rgba(59,130,246,0.55)]" },
  green:  { bar: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-300", icon: "text-emerald-400", ring: "ring-emerald-500/40", glow: "shadow-[0_0_18px_-4px_rgba(16,185,129,0.55)]" },
  yellow: { bar: "bg-amber-400",   bg: "bg-amber-400/10",   text: "text-amber-200",   icon: "text-amber-300",   ring: "ring-amber-400/40",   glow: "shadow-[0_0_18px_-4px_rgba(251,191,36,0.55)]" },
  purple: { bar: "bg-violet-500",  bg: "bg-violet-500/10",  text: "text-violet-300",  icon: "text-violet-400",  ring: "ring-violet-500/40",  glow: "shadow-[0_0_18px_-4px_rgba(139,92,246,0.55)]" },
  orange: { bar: "bg-orange-500",  bg: "bg-orange-500/10",  text: "text-orange-300",  icon: "text-orange-400",  ring: "ring-orange-500/40",  glow: "shadow-[0_0_18px_-4px_rgba(249,115,22,0.55)]" },
  indigo: { bar: "bg-indigo-500",  bg: "bg-indigo-500/10",  text: "text-indigo-300",  icon: "text-indigo-400",  ring: "ring-indigo-500/40",  glow: "shadow-[0_0_18px_-4px_rgba(99,102,241,0.55)]" },
  red:    { bar: "bg-red-500",     bg: "bg-red-500/10",     text: "text-red-300",     icon: "text-red-400",     ring: "ring-red-500/40",     glow: "shadow-[0_0_18px_-4px_rgba(239,68,68,0.55)]" },
};

const navItems = [
  { title: "Vue d'ensemble", url: "/admin", icon: LayoutDashboard, exact: true, tone: "blue" as const },
  { title: "Commissions", url: "/admin/commissions", icon: Coins, tone: "green" as const },
  { title: "Zones livraison", url: "/admin/zones", icon: MapPin, tone: "yellow" as const },
  { title: "Restaurants", url: "/admin/restaurants", icon: Store, tone: "purple" as const },
  { title: "Menus & Catégories", url: "/admin/menus", icon: Utensils, tone: "orange" as const },
  { title: "Livreurs", url: "/admin/livreurs", icon: Bike, tone: "indigo" as const },
  { title: "Litiges", url: "/admin/litiges", icon: AlertTriangle, badge: 4, tone: "red" as const },
];

function AdminLayout() {
  const [adminInfo, setAdminInfo] = useState<{ isAdmin: boolean; email: string | null } | null>(null);

  useEffect(() => {
    let alive = true;

    const refresh = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setAdminInfo({ isAdmin: false, email: null });
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (alive) setAdminInfo({ isAdmin: !!role, email: user.email ?? null });
    };

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        setAdminInfo(null);
        refresh();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = adminInfo?.isAdmin ?? false;
  const loading = adminInfo === null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader adminInfo={adminInfo} loading={loading} isAdmin={isAdmin} />
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminHeader({
  adminInfo,
  loading,
  isAdmin,
}: {
  adminInfo: { isAdmin: boolean; email: string | null } | null;
  loading: boolean;
  isAdmin: boolean;
}) {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const isAdminHome = path === "/admin" || path === "/admin/";
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchOpen]);

  // Cmd/Ctrl+K to open search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleBack = () => {
    // Sortie de l'espace admin → toujours rediriger vers le Profil utilisateur
    router.navigate({ to: "/profil" });
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/85 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:gap-3 sm:px-5">
        {/* Hamburger (vraies 3 barres) */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Ouvrir le menu de navigation"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-muted/50 active:scale-95"
        >
          <Menu className="h-6 w-6" strokeWidth={2.4} />
        </button>

        {/* Retour — toujours visible (sortie de l'espace admin sur la racine) */}
        <button
          type="button"
          onClick={handleBack}
          aria-label={isAdminHome ? "Quitter l'espace admin" : "Retour"}
          title={isAdminHome ? "Quitter l'espace admin" : "Retour"}
          className="group inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground transition-all hover:bg-muted/50 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" strokeWidth={2.4} />
        </button>

        {/* Titre */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="font-display text-base font-extrabold tracking-tight sm:text-lg">
            Mboa Console
          </span>
        </div>

        {/* Recherche desktop inline */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden h-11 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:inline-flex"
        >
          <Search className="h-4 w-4" />
          <span>Rechercher commande, resto, livreur…</span>
          <kbd className="ml-3 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Loupe mobile (fonctionnelle) */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Ouvrir la recherche"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground transition-colors hover:bg-muted/50 active:scale-95 md:hidden"
        >
          <Search className="h-5 w-5" strokeWidth={2.2} />
        </button>

        {/* Statut admin */}
        {loading ? (
          <div className="hidden items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 sm:inline-flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Vérification…</span>
          </div>
        ) : isAdmin ? (
          <div
            className="hidden items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 sm:inline-flex"
            title={adminInfo?.email ?? "Admin connecté"}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              Admin
              {adminInfo?.email && (
                <span className="ml-1 hidden font-normal text-muted-foreground lg:inline">
                  · {adminInfo.email}
                </span>
              )}
            </span>
          </div>
        ) : (
          <Link
            to="/admin/login"
            className="hidden items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 hover:bg-destructive/20 sm:inline-flex"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive">Se connecter</span>
          </Link>
        )}
      </header>

      {/* Modale recherche */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/70 px-4 pt-20 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Recherche"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Commande, restaurant, livreur, client…"
                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Fermer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-4 py-6 text-sm text-muted-foreground">
              {query.trim() === "" ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    Suggestions
                  </p>
                  <ul className="space-y-1">
                    {[
                      { label: "Voir les commandes en cours", to: "/admin" },
                      { label: "Restaurants", to: "/admin/restaurants" },
                      { label: "Livreurs actifs", to: "/admin/livreurs" },
                      { label: "Litiges ouverts", to: "/admin/litiges" },
                    ].map((s) => (
                      <li key={s.to}>
                        <Link
                          to={s.to}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50"
                        >
                          <span>{s.label}</span>
                          <span className="text-muted-foreground">↗</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>
                  Aucun résultat pour <span className="font-semibold text-foreground">«{query}»</span>.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Couleur "vraie" (saturée) par tonalité — visible sur fond blanc (mobile) ET fond sombre (desktop)
const ICON_BG: Record<string, string> = {
  blue:   "bg-blue-500",
  green:  "bg-emerald-500",
  yellow: "bg-amber-500",
  purple: "bg-violet-500",
  orange: "bg-orange-500",
  indigo: "bg-indigo-500",
  red:    "bg-red-500",
};

function AdminSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await supabase.auth.signOut({ scope: "global" }); } catch {}
    navigate({ to: "/admin/login", replace: true });
  };

  const isActive = (item: typeof navItems[number]) =>
    item.exact ? path === item.url : path.startsWith(item.url);

  // Sur mobile (sheet blanc) : fond blanc / texte noir / icônes colorées dans des chips.
  // Sur desktop (panneau sombre) : on conserve le rendu "premium" actuel.
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className={isMobile ? "bg-white text-neutral-900" : undefined}>
        <div className={`flex items-center gap-3 px-4 pt-5 pb-3 ${isMobile ? "border-b border-neutral-100" : ""}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className={`font-display text-base font-extrabold ${isMobile ? "text-neutral-900" : ""}`}>
                Mboa Console
              </p>
              <p className={`text-[10px] uppercase tracking-widest ${isMobile ? "text-neutral-500" : "text-muted-foreground"}`}>
                Admin
              </p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isMobile ? "text-neutral-500" : undefined}>
            Pilotage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item);
                const tone = TONES[item.tone];
                const iconBg = ICON_BG[item.tone];

                if (isMobile) {
                  // Look "App mobile" : fond blanc, texte noir profond, chips colorés.
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className="h-12 rounded-2xl px-3 text-[15px] font-semibold text-neutral-900 hover:bg-neutral-100 data-[active=true]:bg-neutral-100"
                      >
                        <Link
                          to={item.url}
                          onClick={() => setOpenMobile(false)}
                          className="flex w-full items-center gap-3"
                        >
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${iconBg}`}>
                            <item.icon className="h-5 w-5" strokeWidth={2.4} />
                          </span>
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.badge && (
                            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                              {item.badge}
                            </span>
                          )}
                          {active && (
                            <span className="ml-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Rendu desktop (sombre, premium)
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        to={item.url}
                        className={`relative flex items-center gap-2 rounded-xl transition-all duration-300 ease-out ${
                          active
                            ? `${tone.bg} ${tone.text} ${tone.glow} ring-1 ${tone.ring} scale-[1.04]`
                            : "hover:bg-muted/40"
                        }`}
                      >
                        {active && (
                          <span
                            className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full ${tone.bar} animate-fade-in`}
                            aria-hidden
                          />
                        )}
                        <item.icon className={`h-4 w-4 transition-colors ${active ? `${tone.icon} drop-shadow-[0_0_6px_currentColor]` : ""}`} />
                        {!collapsed && (
                          <>
                            <span className={`flex-1 ${active ? "font-bold tracking-wide" : ""}`}>{item.title}</span>
                            {item.badge && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? `${tone.bar} text-white` : "bg-primary/15 text-primary"}`}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={isMobile ? "text-neutral-500" : undefined}>
            Compte
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isMobile ? "h-12 rounded-2xl px-3 text-[15px] font-semibold text-neutral-900 hover:bg-neutral-100" : undefined}
                >
                  <Link
                    to="/admin/parametres"
                    onClick={() => isMobile && setOpenMobile(false)}
                    className="flex items-center gap-3"
                  >
                    {isMobile ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-white shadow-md">
                        <Settings className="h-5 w-5" strokeWidth={2.4} />
                      </span>
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                    {!collapsed && <span>Paramètres</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isMobile ? "h-12 rounded-2xl px-3 text-[15px] font-semibold text-red-600 hover:bg-red-50" : undefined}
                >
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 text-destructive">
                    {isMobile ? (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-md">
                        <LogOut className="h-5 w-5" strokeWidth={2.4} />
                      </span>
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {!collapsed && <span>Se déconnecter</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export { TrendingUp, Users, Coins, Store, Bike, AlertTriangle, Star, Check, X, MoreHorizontal };
