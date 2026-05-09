import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  User, Crown, MapPin, CreditCard, Bell, Shield, HelpCircle,
  LogOut, ChevronRight, Heart, Bike, Store, Sparkles, Volume2, VolumeX,
  Loader2, Check, ShieldCheck, LayoutDashboard, Coins, AlertTriangle, Settings, Package,
  Sun, Moon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isCartSoundEnabled, setCartSoundEnabled, CART_SOUND_EVT } from "@/lib/cart-sound";
import { getMyProfile, upsertMyProfile, getMyLoyalty } from "@/server/account.functions";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useTheme } from "@/components/ThemeProvider";

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
  const { user: sessionUser, loading: sessionLoading, refresh: refreshSession } = useSessionUser();
  const { theme, toggle: toggleTheme } = useTheme();
  const [authChecked, setAuthChecked] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authedSb, setAuthedSb] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; city: string | null } | null>(null);
  const [loyalty, setLoyalty] = useState<{ points: number; currentTier: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", city: "Douala" });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const authed = authedSb || !!sessionUser?.identifier;

  useEffect(() => {
    setSoundOn(isCartSoundEnabled());
    const sync = () => setSoundOn(isCartSoundEnabled());
    window.addEventListener(CART_SOUND_EVT, sync);

    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      setAuthChecked(true);
      if (!u) return;
      setAuthedSb(true);
      if (u.email) setAuthEmail(u.email);
      try {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", u.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!role);
      } catch {}
      try {
        const [p, l] = await Promise.all([getMyProfile(), getMyLoyalty()]);
        setProfile(p.profile ?? null);
        setForm({
          full_name: p.profile?.full_name ?? "",
          phone: p.profile?.phone ?? u.phone ?? "",
          city: p.profile?.city ?? "Douala",
        });
        setLoyalty({ points: l.points, currentTier: l.currentTier });
      } catch {}
    }).catch(() => { setAuthChecked(true); });

    return () => window.removeEventListener(CART_SOUND_EVT, sync);
  }, []);

  // Route guard: redirect to /connexion if unauthenticated once auth checks settle
  useEffect(() => {
    if (!authChecked || sessionLoading) return;
    if (!authedSb && !sessionUser?.identifier) {
      navigate({ to: "/connexion", search: { redirect: "/profil" } as never, replace: true } as never);
    }
  }, [authChecked, sessionLoading, authedSb, sessionUser, navigate]);

  if (!authChecked || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authedSb && !sessionUser?.identifier) {
    return null;
  }

  const identifier = authEmail || profile?.phone || "Invité";
  const displayName = profile?.full_name || (authEmail ? authEmail.split("@")[0] : "Mon compte");
  const initials = (displayName.match(/[a-zA-Z]/g) || ["U"]).slice(0, 2).join("").toUpperCase();

  const save = async () => {
    setSaving(true);
    try {
      await upsertMyProfile({ data: form });
      setProfile({ ...form });
      setSavedFlash(true);
      setEditing(false);
      setTimeout(() => setSavedFlash(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    setSigningOut(true);
    try { await supabase.auth.signOut({ scope: "global" }); } catch {}
    try {
      const { logoutSession } = await import("@/lib/session.functions");
      await logoutSession();
    } catch {}
    try {
      const { invalidateSessionCache } = await import("@/hooks/useSessionUser");
      invalidateSessionCache();
      localStorage.removeItem("mboa_tastes");
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.startsWith("supabase."))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    setAuthedSb(false);
    setAuthEmail(null);
    setProfile(null);
    await refreshSession();
    navigate({ to: "/connexion", replace: true });
  };

  return (
    <div data-brand-actions className="min-h-screen bg-background text-foreground">
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
            {authed ? (
              <button onClick={() => setEditing((v) => !v)} className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-semibold">
                {editing ? "Annuler" : "Modifier"}
              </button>
            ) : (
              <Link to="/connexion" className="rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow">
                Se connecter
              </Link>
            )}
          </div>

          {savedFlash && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary animate-fade-in">
              <Check className="h-3.5 w-3.5" /> Profil mis à jour
            </div>
          )}

          {editing && authed && (
            <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-3 animate-fade-in">
              <input
                placeholder="Nom complet"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                placeholder="+237 6XX XX XX XX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option>Douala</option><option>Yaoundé</option><option>Bafoussam</option>
              </select>
              <button
                onClick={save}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </button>
            </div>
          )}

          <Link
            to="/fidelite"
            className="mt-4 flex items-center justify-between rounded-2xl border border-brand-cm-green/40 bg-gradient-to-r from-brand-cm-green/15 to-brand-cm-green/5 p-3 shadow-[0_8px_24px_-12px_rgba(6,193,103,0.45)] transition-all hover:scale-[1.01] dark:border-brand-cm-green/50 dark:from-brand-cm-green/20 dark:to-brand-cm-green/5 dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cm-green/20 dark:bg-brand-cm-green/25">
                <Crown className="h-5 w-5 text-brand-cm-green" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground/80">
                  Mboa {loyalty?.currentTier ?? "Pistache"}
                </p>
                <p className="font-bold text-foreground">
                  {(loyalty?.points ?? 0).toLocaleString("fr-FR")}{" "}
                  <span className="text-xs font-normal text-foreground/70">points</span>
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-brand-cm-green" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-6">
        <Section title="Mon compte">
          <Row to="/commandes" icon={Package} label="Mes commandes" />
          <Row to="/favoris" icon={Heart} label="Mes favoris" />
          <Row to="/adresses" icon={MapPin} label="Mes adresses" />
          <Row to="/checkout" icon={CreditCard} label="Moyens de paiement" />
          <Row to="/mboapass" icon={Crown} label="MboaPass Premium" />
          <Row to="/parrainage" icon={Sparkles} label="Parrainage (500 F offerts)" />
          <Row to="/fidelite" icon={Sparkles} label="Mboa Points & avantages" />
        </Section>

        {isAdmin && (
          <Section title="Administration">
            <Row to="/admin" icon={ShieldCheck} label="Espace Super Admin" />
          </Section>
        )}

        <Section title="Pour les pros">
          <Row to="/devenir-livreur" icon={Bike} label="Devenir livreur" />
          <Row to="/devenir-resto" icon={Store} label="Devenir restaurateur" />
        </Section>

        <Section title="Préférences">
          <li>
            <button
              type="button"
              onClick={toggleTheme}
              aria-pressed={theme === "dark"}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface/80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <span className="flex-1 text-sm font-medium">
                Thème {theme === "dark" ? "sombre" : "clair"}
                <span className="block text-[11px] font-normal text-muted-foreground">
                  Bascule entre le mode clair et sombre
                </span>
              </span>
              <span
                className={`relative h-6 w-11 rounded-full transition ${theme === "dark" ? "bg-primary" : "bg-muted"}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${theme === "dark" ? "translate-x-[22px]" : "translate-x-0.5"}`}
                />
              </span>
            </button>
          </li>
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
          <Row to="/preferences" icon={Bell} label="Préférences de notifications" />
          <Row to="/confidentialite" icon={Shield} label="Confidentialité & RGPD" />
          <Row to="/aide" icon={HelpCircle} label="Aide & support" />
        </Section>

        {authed && (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3.5 text-sm font-semibold text-destructive transition hover:bg-destructive/20 active:scale-[0.99]"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        )}

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

      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-white">{title}</h2>
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
