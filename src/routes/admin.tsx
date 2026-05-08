import { createFileRoute, Link, Outlet, redirect, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Store, Bike, AlertTriangle, Coins, Settings, ArrowLeft,
  TrendingUp, Users, ShieldCheck, ShieldAlert, Search, Star, Check, X, MoreHorizontal, MapPin, LogOut, Utensils,
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
  head: () => ({
    meta: [
      { title: "Admin · MboaEats Console" },
      { name: "description", content: "Console d'administration MboaEats : commissions, restaurants, livreurs, litiges." },
    ],
  }),
});

const navItems = [
  { title: "Vue d'ensemble", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Commissions", url: "/admin/commissions", icon: Coins },
  { title: "Zones livraison", url: "/admin/zones", icon: MapPin },
  { title: "Restaurants", url: "/admin/restaurants", icon: Store },
  { title: "Menus & Catégories", url: "/admin/menus", icon: Utensils },
  { title: "Livreurs", url: "/admin/livreurs", icon: Bike },
  { title: "Litiges", url: "/admin/litiges", icon: AlertTriangle, badge: 4 },
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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.badge && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
