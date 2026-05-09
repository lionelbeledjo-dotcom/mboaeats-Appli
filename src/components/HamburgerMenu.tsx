import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu, Home, Compass, Package, Heart, MapPin, CreditCard, Crown,
  Sparkles, Bell, Shield, HelpCircle, User, Bike, Store, LogOut, X,
  Search, Utensils,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { useSessionUser } from "@/hooks/useSessionUser";
import { supabase } from "@/integrations/supabase/client";
import { restaurants as allRestaurants } from "@/data/restaurants";

type Item = { to: string; params?: Record<string, string>; label: string; icon: typeof Home; group: string };

const ITEMS: Item[] = [
  // Navigation
  { to: "/", label: "Accueil", icon: Home, group: "Navigation" },
  { to: "/decouvrir", label: "Découvrir", icon: Compass, group: "Navigation" },
  { to: "/commandes", label: "Mes commandes", icon: Package, group: "Navigation" },
  { to: "/favoris", label: "Mes favoris", icon: Heart, group: "Navigation" },
  { to: "/adresses", label: "Mes adresses", icon: MapPin, group: "Navigation" },
  { to: "/checkout", label: "Moyens de paiement", icon: CreditCard, group: "Navigation" },
  // Avantages
  { to: "/mboapass", label: "MboaPass Premium", icon: Crown, group: "Avantages" },
  { to: "/parrainage", label: "Parrainage", icon: Sparkles, group: "Avantages" },
  { to: "/fidelite", label: "Mboa Points", icon: Sparkles, group: "Avantages" },
  // Pros
  { to: "/devenir-livreur", label: "Devenir livreur", icon: Bike, group: "Pour les pros" },
  { to: "/devenir-resto", label: "Devenir restaurateur", icon: Store, group: "Pour les pros" },
  // Settings
  { to: "/preferences", label: "Notifications", icon: Bell, group: "Paramètres" },
  { to: "/profil", label: "Profil & sécurité", icon: User, group: "Paramètres" },
  { to: "/confidentialite", label: "Confidentialité", icon: Shield, group: "Paramètres" },
  { to: "/aide", label: "Aide & support", icon: HelpCircle, group: "Paramètres" },
];

const RESTAURANT_ITEMS: Item[] = allRestaurants.map((r) => ({
  to: "/restaurants/$restoId",
  params: { restoId: r.id },
  label: r.name,
  icon: Utensils,
  group: "Restaurants",
}));

const GROUPS_ORDER = ["Navigation", "Avantages", "Pour les pros", "Paramètres", "Restaurants"];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function HamburgerMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { user } = useSessionUser();
  const authed = !!user?.identifier;

  const close = () => { setOpen(false); setQuery(""); };

  const grouped = useMemo(() => {
    const q = normalize(query.trim());
    const all = q ? [...ITEMS, ...RESTAURANT_ITEMS] : ITEMS;
    const filtered = q ? all.filter((it) => normalize(it.label).includes(q)) : all;
    const map: Record<string, Item[]> = {};
    for (const it of filtered) (map[it.group] ||= []).push(it);
    return GROUPS_ORDER.map((g) => [g, map[g] ?? []] as const).filter(([, arr]) => arr.length > 0);
  }, [query]);

  const doLogout = async () => {
    try { await supabase.auth.signOut({ scope: "global" }); } catch {}
    try {
      const { logoutSession } = await import("@/lib/session.functions");
      await logoutSession();
    } catch {}
    try {
      const { invalidateSessionCache } = await import("@/hooks/useSessionUser");
      invalidateSessionCache();
    } catch {}
    window.location.href = "/connexion";
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir le menu"
          className={
            className ??
            "flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-sm hover:bg-neutral-50 active:scale-95 transition"
          }
        >
          <Menu className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="flex w-[88vw] max-w-[340px] flex-col border-r border-border bg-white p-0 text-black dark:bg-card dark:text-foreground"
      >
        <SheetHeader className="space-y-3 border-b border-border bg-gradient-to-br from-[#06C167]/10 to-transparent p-5 text-left">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base font-bold text-black dark:text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#06C167] text-lg">🍲</span>
              MboaEats
            </SheetTitle>
            <SheetClose asChild>
              <button aria-label="Fermer" className="rounded-full p-1.5 text-black/60 hover:bg-black/5 dark:text-foreground/70">
                <X className="h-4 w-4" />
              </button>
            </SheetClose>
          </div>
          <p className="text-xs text-neutral-600 dark:text-muted-foreground">
            {authed ? user?.identifier : "Non connecté"}
          </p>

          {/* Search */}
          <label className="flex h-10 items-center gap-2 rounded-xl bg-neutral-100 px-3 focus-within:ring-2 focus-within:ring-[#06C167]/40 dark:bg-muted/40">
            <Search className="h-4 w-4 text-neutral-500 dark:text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une page, un restaurant…"
              className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 outline-none dark:text-foreground"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer"
                className="text-neutral-400 hover:text-black dark:hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {grouped.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-neutral-500 dark:text-muted-foreground">
              Aucun résultat pour « {query} »
            </p>
          ) : (
            grouped.map(([label, items]) => (
              <Group key={label} label={label} items={items} onClick={close} />
            ))
          )}

          <div className="mt-4 border-t border-border pt-4">
            {authed ? (
              <button
                type="button"
                onClick={doLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            ) : (
              <Link
                to="/connexion"
                preload="intent"
                onClick={close}
                aria-label="Se connecter"
                className="flex items-center justify-center gap-2 rounded-full bg-[#064E3B] px-5 py-3.5 text-base font-bold text-white border-2 border-white/95 shadow-[0_8px_24px_-8px_rgba(6,193,103,0.55)] transition-all duration-150 hover:border-[#D4AF37] active:scale-95"
              >
                <User className="h-5 w-5" strokeWidth={2.5} />
                Se connecter
              </Link>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function Group({ label, items, onClick }: { label: string; items: Item[]; onClick: () => void }) {
  return (
    <div className="mb-2">
      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-muted-foreground">
        {label}
      </p>
      <ul>
        {items.map((it) => (
          <li key={`${it.to}-${it.label}`}>
            <Link
              to={it.to as never}
              params={it.params as never}
              onClick={onClick}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black hover:bg-neutral-100 dark:text-foreground dark:hover:bg-muted/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#06C167]/10 text-[#06C167]">
                <it.icon className="h-4 w-4" />
              </span>
              <span className="truncate">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
