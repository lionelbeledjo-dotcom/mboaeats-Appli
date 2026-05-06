import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  User, Crown, MapPin, CreditCard, Bell, Shield, HelpCircle,
  LogOut, ChevronRight, Heart, Bike, Store, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — MboaEats" },
      { name: "description", content: "Espace utilisateur, Mboa Points et paramètres." },
    ],
  }),
  component: ProfilPage,
});

function ProfilPage() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const doLogout = async () => {
    setSigningOut(true);
    try { await supabase.auth.signOut(); } catch {}
    try {
      localStorage.removeItem("mboa_demo_user");
      localStorage.removeItem("mboa_tastes");
    } catch {}
    navigate({ to: "/connexion", replace: true });
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="glass border-b border-border/40">
        <div className="mx-auto max-w-md px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground shadow-glow">
              LB
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg font-bold">Lionel Brown</p>
              <p className="truncate text-xs text-muted-foreground">lionelbrown2728@yahoo.fr</p>
            </div>
            <Link to="/connexion" aria-label="Aller à la connexion" className="rounded-full border border-border bg-surface/60 p-2">
              <LogOut className="h-4 w-4" />
            </Link>
          </div>

          <Link
            to="/fidelite"
            className="mt-4 flex items-center justify-between rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 to-primary/10 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20">
                <Crown className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mboa Gold</p>
                <p className="font-bold">1 240 <span className="text-xs font-normal text-muted-foreground">points</span></p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-6">
        <Section title="Mon compte">
          <Row to="/commandes" icon={Heart} label="Commandes & favoris" />
          <Row to="/adresses" icon={MapPin} label="Mes adresses" />
          <Row to="/checkout" icon={CreditCard} label="Moyens de paiement" />
          <Row to="/mboapass" icon={Crown} label="MboaPass Premium" />
          <Row to="/parrainage" icon={Sparkles} label="Parrainage (500 F offerts)" />
          <Row to="/fidelite" icon={Sparkles} label="Mboa Points & avantages" />
        </Section>

        <Section title="Pour les pros">
          <Row to="/devenir-livreur" icon={Bike} label="Devenir livreur" />
          <Row to="/devenir-resto" icon={Store} label="Devenir restaurateur" />
        </Section>

        <Section title="Préférences">
          <Row to="/profil" icon={Bell} label="Notifications" />
          <Row to="/confidentialite" icon={Shield} label="Confidentialité & RGPD" />
          <Row to="/aide" icon={HelpCircle} label="Aide & support" />
        </Section>

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          MboaEats v1.0 · Fait avec ❤️ à Douala
        </p>

        {/* Discreet owner access — barely visible dot at the very bottom */}
        <div className="flex justify-center pt-6 pb-2 opacity-30 hover:opacity-100 transition-opacity">
          <Link
            to="/admin-login"
            aria-label="Administration"
            title="Administration"
            className="h-2 w-2 rounded-full bg-muted-foreground hover:bg-primary"
          />
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <ul className="mt-2 divide-y divide-border/60 rounded-2xl border border-border bg-surface/60">
        {children}
      </ul>
    </section>
  );
}

function Row({ to, icon: Icon, label }: { to: string; icon: typeof User; label: string }) {
  return (
    <li>
      <Link to={to as never} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface/80 transition">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </li>
  );
}
