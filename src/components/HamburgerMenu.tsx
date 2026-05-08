import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Menu, Home, Compass, Package, Heart, MapPin, CreditCard, Crown,
  Sparkles, Bell, Shield, HelpCircle, User, Bike, Store, LogOut, X,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose,
} from "@/components/ui/sheet";
import { useSessionUser } from "@/hooks/useSessionUser";
import { supabase } from "@/integrations/supabase/client";

type Item = { to: string; label: string; icon: typeof Home };

const MAIN: Item[] = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/decouvrir", label: "Découvrir", icon: Compass },
  { to: "/commandes", label: "Mes commandes", icon: Package },
  { to: "/favoris", label: "Mes favoris", icon: Heart },
  { to: "/adresses", label: "Mes adresses", icon: MapPin },
  { to: "/checkout", label: "Moyens de paiement", icon: CreditCard },
];

const PERKS: Item[] = [
  { to: "/mboapass", label: "MboaPass Premium", icon: Crown },
  { to: "/parrainage", label: "Parrainage", icon: Sparkles },
  { to: "/fidelite", label: "Mboa Points", icon: Sparkles },
];

const PRO: Item[] = [
  { to: "/devenir-livreur", label: "Devenir livreur", icon: Bike },
  { to: "/devenir-resto", label: "Devenir restaurateur", icon: Store },
];

const SETTINGS: Item[] = [
  { to: "/preferences", label: "Notifications", icon: Bell },
  { to: "/profil", label: "Profil & sécurité", icon: User },
  { to: "/confidentialite", label: "Confidentialité", icon: Shield },
  { to: "/aide", label: "Aide & support", icon: HelpCircle },
];

export function HamburgerMenu({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useSessionUser();
  const authed = !!user?.identifier;

  const close = () => setOpen(false);

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
    <Sheet open={open} onOpenChange={setOpen}>
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
        className="w-[88vw] max-w-[340px] overflow-y-auto border-r border-border bg-white p-0 text-black dark:bg-card dark:text-foreground"
      >
        <SheetHeader className="space-y-2 border-b border-border bg-gradient-to-br from-[#06C167]/10 to-transparent p-5 text-left">
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
        </SheetHeader>

        <nav className="px-3 py-4">
          <Group label="Navigation" items={MAIN} onClick={close} />
          <Group label="Avantages" items={PERKS} onClick={close} />
          <Group label="Pour les pros" items={PRO} onClick={close} />
          <Group label="Paramètres" items={SETTINGS} onClick={close} />

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
                onClick={close}
                className="flex items-center justify-center gap-2 rounded-full bg-[#06C167] px-4 py-3 text-sm font-bold text-white"
              >
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
          <li key={it.to}>
            <Link
              to={it.to as never}
              onClick={onClick}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-black hover:bg-neutral-100 dark:text-foreground dark:hover:bg-muted/40"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#06C167]/10 text-[#06C167]">
                <it.icon className="h-4 w-4" />
              </span>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
