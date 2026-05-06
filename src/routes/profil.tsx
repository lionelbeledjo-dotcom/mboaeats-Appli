import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User, Crown, MapPin, CreditCard, Bell, Shield, HelpCircle,
  LogOut, ChevronRight, Heart, Bike, Store, Sparkles, Volume2, VolumeX,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isCartSoundEnabled, setCartSoundEnabled, CART_SOUND_EVT } from "@/lib/cart-sound";

type DemoUser = { mode?: "phone" | "email"; identifier?: string };

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
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mboa_demo_user");
      if (raw) setDemoUser(JSON.parse(raw));
    } catch {}
    setSoundOn(isCartSoundEnabled());
    const sync = () => setSoundOn(isCartSoundEnabled());
    window.addEventListener(CART_SOUND_EVT, sync);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setAuthEmail(data.user.email);
    }).catch(() => {});
    return () => window.removeEventListener(CART_SOUND_EVT, sync);
  }, []);

  const identifier = authEmail || demoUser?.identifier || "Invité";
  const displayName =
    authEmail
      ? authEmail.split("@")[0]
      : demoUser?.mode === "email" && demoUser.identifier
        ? demoUser.identifier.split("@")[0]
        : demoUser?.identifier || "Mon compte";
  const initials = (displayName.match(/[a-zA-Z]/g) || ["U"]).slice(0, 2).join("").toUpperCase();

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
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg font-bold capitalize">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{identifier}</p>
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
          <li>
            <button
              type="button"
              onClick={() => setCartSoundEnabled(!soundOn)}
              aria-pressed={soundOn}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface/80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </span>
              <span className="flex-1 text-sm font-medium">
                Son du panier
                <span className="block text-[11px] font-normal text-muted-foreground">
                  Bip discret à l'ajout / retrait
                </span>
              </span>
              <span
                className={`relative h-6 w-11 rounded-full transition ${soundOn ? "bg-primary" : "bg-muted"}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${soundOn ? "translate-x-[22px]" : "translate-x-0.5"}`}
                />
              </span>
            </button>
          </li>
          <Row to="/profil" icon={Bell} label="Notifications" />
          <Row to="/confidentialite" icon={Shield} label="Confidentialité & RGPD" />
          <Row to="/aide" icon={HelpCircle} label="Aide & support" />
        </Section>

        {/* Logout button (UX pro, élégant) */}
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20 active:scale-[0.99]"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>

        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          MboaEats v1.0 · Fait avec ❤️ à Douala
        </p>

        {confirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => !signingOut && setConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl animate-scale-in"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-2xl">
                🍲
              </div>
              <h3 className="text-center font-display text-lg font-bold">
                Voulez-vous vraiment nous quitter ?
              </h3>
              <p className="mt-1 text-center text-sm text-muted-foreground">
                Votre Ndolé vous attendra !
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setConfirm(false)}
                  disabled={signingOut}
                  className="h-11 flex-1 rounded-full border border-border bg-background text-sm font-semibold"
                >
                  Rester
                </button>
                <button
                  onClick={doLogout}
                  disabled={signingOut}
                  className="h-11 flex-[1.2] rounded-full bg-destructive text-sm font-semibold text-destructive-foreground disabled:opacity-60"
                >
                  {signingOut ? "Déconnexion…" : "Se déconnecter"}
                </button>
              </div>
            </div>
          </div>
        )}

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
