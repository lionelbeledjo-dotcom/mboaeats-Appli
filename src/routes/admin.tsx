import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Store, Bike, AlertTriangle, Coins, Settings, ArrowLeft,
  TrendingUp, Users, ShieldCheck, Search, Star, Check, X, MoreHorizontal, MapPin,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/admin-login" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/admin-login" });
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
  { title: "Livreurs", url: "/admin/livreurs", icon: Bike },
  { title: "Litiges", url: "/admin/litiges", icon: AlertTriangle, badge: 4 },
];

function AdminLayout() {
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
              <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold">Admin</span>
              </div>
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
                  <Link to="/admin" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Paramètres</span>}
                  </Link>
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
