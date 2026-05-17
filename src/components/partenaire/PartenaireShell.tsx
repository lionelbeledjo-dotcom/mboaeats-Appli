import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell, ChefHat, BarChart3, Settings, Store, LogOut, ChevronDown, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePartenaire } from "./PartenaireContext";

const NAV = [
  { to: "/partenaire/commandes", label: "Commandes", icon: Bell },
  { to: "/partenaire/menu", label: "Menu", icon: ChefHat },
  { to: "/partenaire/revenus", label: "Revenus", icon: BarChart3 },
  { to: "/partenaire/parametres", label: "Paramètres", icon: Settings },
] as const;

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { restos, active, setActiveId } = usePartenaire();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display text-sm font-bold leading-none">MboaEats</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Partenaire</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Resto switcher */}
      <div className="border-t border-border p-3">
        {restos.length > 1 ? (
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{active.name}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{active.city}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {switcherOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
                {restos.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setActiveId(r.id); setSwitcherOpen(false); }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs ${
                      r.id === active.id ? "bg-primary/15 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{r.name}</span>
                    <span className="text-[10px] text-muted-foreground">{r.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <p className="truncate text-xs font-bold">{active.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">{active.city} · {active.role}</p>
          </div>
        )}

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/connexion";
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </div>
    </div>
  );
}

export function PartenaireShell({ children }: { children: React.ReactNode }) {
  const { active } = usePartenaire();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border md:block">
        <div className="sticky top-0 h-screen">
          <SidebarBody />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="rounded-lg border border-border p-2 md:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <Menu className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarBody onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">{active.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {active.neighborhood ?? active.city} · {active.cuisine ?? "—"}
              </p>
            </div>
          </div>
          <OpenToggle />
        </header>

        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}

function OpenToggle() {
  const { active, reload } = usePartenaire();
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      const { updateRestaurant } = await import("@/server/restaurant.functions");
      await updateRestaurant({ data: { restaurant_id: active.id, is_open: !active.is_open } });
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active.is_open
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500"
          : "border-border bg-surface text-muted-foreground"
      } disabled:opacity-50`}
    >
      <span className={`h-2 w-2 rounded-full ${active.is_open ? "bg-emerald-500" : "bg-muted-foreground"}`} />
      {active.is_open ? "Ouvert" : "Fermé"}
    </button>
  );
}
