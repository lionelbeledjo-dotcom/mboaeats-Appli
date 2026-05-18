import { createFileRoute, Link, Outlet, redirect, isRedirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Crown, ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/superadmin")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw redirect({ to: "/superadmin/login" });
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "superadmin")
        .maybeSingle();
      if (!role) throw redirect({ to: "/superadmin/login" });
      // Vérifie 2FA
      const { get2faStatus } = await import("@/lib/superadmin-2fa.functions");
      const status = await get2faStatus();
      if (!status.enabled) throw redirect({ to: "/superadmin/setup-2fa" });
      if (!status.sessionValid) throw redirect({ to: "/superadmin/login" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/superadmin/login" });
    }
  },
  component: SuperAdminLayout,
  head: () => ({
    meta: [
      { title: "Super Admin · MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function SuperAdminLayout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const handleLogout = async () => {
    try { await supabase.auth.signOut({ scope: "global" }); } catch {}
    navigate({ to: "/superadmin/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 border-b border-border bg-surface/70 px-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Crown className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-display text-sm font-bold">Super Admin</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Console propriétaire</p>
          </div>
        </div>
        <Link to="/superadmin/dashboard" className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Accueil
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5" title={email ?? "SUPER_ADMIN connecté"}>
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">SUPER_ADMIN{email && <span className="ml-1 hidden font-normal text-muted-foreground lg:inline">· {email}</span>}</span>
          </div>
          <button type="button" onClick={handleLogout} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
