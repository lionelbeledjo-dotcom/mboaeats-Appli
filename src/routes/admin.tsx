import { createFileRoute, Link, Outlet, redirect, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Store, Bike, AlertTriangle, Coins, Settings, ArrowLeft,
  TrendingUp, Users, ShieldCheck, ShieldAlert, Search, Star, Check, X, MoreHorizontal, MapPin, LogOut, Utensils, Menu,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
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
          <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-surface/70 px-4 backdrop-blur">
            <SidebarTrigger className="text-muted-foreground" />
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Site
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input placeholder="Rechercher commande, resto, livreur…" className="w-72 bg-transparent outline-none" />
              </div>
              {loading ? (
                <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">Vérification…</span>
                </div>
              ) : isAdmin ? (
                <div
                  className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5"
                  title={adminInfo?.email ?? "Admin connecté"}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    Admin connecté
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
                  className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 hover:bg-destructive/20"
                  title="Vous n'êtes pas admin"
                >
                  <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs font-semibold text-destructive">Non admin · Se connecter</span>
                </Link>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await supabase.auth.signOut({ scope: "global" }); } catch {}
    navigate({ to: "/admin/login", replace: true });
  };

  const isActive = (item: typeof navItems[number]) =>
    item.exact ? path === item.url : path.startsWith(item.url);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 pt-4 pb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-display text-sm font-bold">Mboa Console</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Pilotage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item);
                const tone = TONES[item.tone];
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
          <SidebarGroupLabel>Compte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/parametres" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Paramètres</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 text-destructive">
                    <LogOut className="h-4 w-4" />
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
