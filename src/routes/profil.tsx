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
import { getMyProfile, upsertMyProfile, getMyLoyalty, listMyAddresses } from "@/server/account.functions";
import { useSessionUser } from "@/hooks/useSessionUser";
import { useSession } from "@/auth/hooks/useSession";
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
  const { user: sessionUser, refresh: refreshSession } = useSessionUser();
  const { principal, isAuthenticated, isPlatformSuperadmin } = useSession();
  const { theme, toggle: toggleTheme } = useTheme();
  // AuthGate gère désormais la redirection; pas de re-check local.
  const [confirm, setConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; phone: string | null; city: string | null } | null>(null);
  const [loyalty, setLoyalty] = useState<{ points: number; currentTier: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", city: "Douala" });
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [addresses, setAddresses] = useState<Array<{ id: string; label: string; city: string; neighborhood: string }>>([]);

  // Authed = on s'appuie sur le cache useSession (déjà chargé au root) plutôt
  // que de relancer un supabase.auth.getUser() à chaque montage : la page
  // s'ouvre immédiatement, sans état intermédiaire qui force un reload.
  const authEmail = principal?.email ?? null;
  const authed = isAuthenticated || !!sessionUser?.identifier;
  const isAdmin = isPlatformSuperadmin;

  useEffect(() => {
    setSoundOn(isCartSoundEnabled());
    const sync = () => setSoundOn(isCartSoundEnabled());
    window.addEventListener(CART_SOUND_EVT, sync);
    return () => window.removeEventListener(CART_SOUND_EVT, sync);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    (async () => {
      try {
        const [p, l, a] = await Promise.all([getMyProfile(), getMyLoyalty(), listMyAddresses()]);
        if (!alive) return;
        setProfile(p.profile ?? null);
        setForm({
          full_name: p.profile?.full_name ?? "",
          phone: p.profile?.phone ?? principal?.phone ?? "",
          city: p.profile?.city ?? "Douala",
        });
        setLoyalty({ points: l.points, currentTier: l.currentTier });
        setAddresses(((a as { addresses?: Array<{ id: string; label: string | null; city: string | null; neighborhood: string | null }> })?.addresses ?? []).map((x) => ({
          id: x.id,
          label: x.label ?? "Adresse",
          city: x.city ?? "",
          neighborhood: x.neighborhood ?? "",
        })));
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [isAuthenticated, principal?.phone]);

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
    // signOut local : invalide la session côté client immédiatement,
    // sans dépendre d'un round-trip réseau qui peut hang. Le token global
    // expirera naturellement côté serveur.
    try { await supabase.auth.signOut({ scope: "local" }); } catch {}
    try {
      const { invalidateSessionCache } = await import("@/hooks/useSessionUser");
      invalidateSessionCache();
      localStorage.removeItem("mboa_tastes");
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sb-") || k.startsWith("supabase."))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    // Fire-and-forget : ne bloque pas la navigation si le serveur ne répond pas
    void (async () => {
      try {
        const { logoutSession } = await import("@/lib/session.functions");
        await logoutSession();
      } catch {}
    })();
    setProfile(null);
    void refreshSession();
    navigate({ to: "/connexion", replace: true });
  };

  return (
    <div data-brand-actions className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-white text-foreground dark:border-brand-cm-green/30 dark:bg-brand-cm-green/15">
        <div className="mx-auto max-w-md px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-cm-green text-xl font-bold text-brand-cm-green-fg shadow-[0_8px_24px_-8px_rgba(6,193,103,0.6)]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg font-bold capitalize text-foreground dark:text-white">{displayName}</p>
              <p className="truncate text-xs font-medium text-muted-foreground dark:text-white/85">{identifier}</p>
            </div>
            {authed ? (
              <button onClick={() => setEditing((v) => !v)} className="rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-semibold">
                {editing ? "Annuler" : "Modifier"}
              </button>
            ) : (
              <Link
                to="/connexion"
                preload="intent"
                aria-label="Se connecter"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#064E3B] px-4 py-2.5 text-sm font-bold text-white border-2 border-white/95 shadow-[0_6px_18px_-6px_rgba(6,193,103,0.55)] transition-all duration-150 hover:border-[#D4AF37] hover:shadow-[0_8px_22px_-6px_rgba(212,175,55,0.55)] active:scale-95 min-h-11 min-w-[44px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <User className="h-4 w-4" strokeWidth={2.5} />
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
            <div className="mt-4 space-y-4 rounded-2xl border border-border bg-card p-4 animate-fade-in">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Nom complet</span>
                <input
                  placeholder="Ex. Jean Dupont"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  maxLength={80}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[16px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Téléphone</span>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+237 6XX XX XX XX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  maxLength={20}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[16px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ville</span>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-3 text-[16px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                >
                  <option>Douala</option><option>Yaoundé</option><option>Bafoussam</option>
                </select>
              </label>
              <button
                onClick={save}
                disabled={saving}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary text-[15px] font-bold text-primary-foreground shadow-glow active:scale-[0.99] transition-transform disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </button>
            </div>
          )}

          <Link
            to="/fidelite"
            className="mt-4 flex items-center justify-between rounded-2xl border border-brand-cm-green/40 bg-gradient-to-r from-brand-cm-green/15 to-brand-cm-green/5 p-3 shadow-[0_8px_24px_-12px_rgba(6,193,103,0.45)] transition-all hover:scale-[1.01] dark:border-brand-cm-green/70 dark:bg-brand-cm-green dark:from-brand-cm-green dark:to-brand-cm-green dark:shadow-[0_8px_24px_-12px_rgba(6,193,103,0.6)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cm-green/20 dark:bg-white/20">
                <Crown className="h-5 w-5 text-brand-cm-green dark:text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground/80 dark:text-white">
                  Mboa {loyalty?.currentTier ?? "Pistache"}
                </p>
                <p className="font-bold text-foreground dark:text-white">
                  {(loyalty?.points ?? 0).toLocaleString("fr-FR")}{" "}
                  <span className="text-xs font-normal text-foreground/70 dark:text-white/85">points</span>
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-brand-cm-green dark:text-white" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-5 pb-28 space-y-6">
        {/* Mes adresses (preview inline) */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-white">
              Mes adresses
            </h2>
            <Link to="/adresses" className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-primary">
              Gérer <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {addresses.length === 0 ? (
            <Link
              to="/adresses"
              className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-4 transition active:bg-surface/80"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">Ajouter une adresse</span>
                <span className="block text-[12px] text-muted-foreground">Pour des livraisons rapides au Cameroun</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ) : (
            <ul className="space-y-2">
              {addresses.slice(0, 3).map((a) => (
                <li key={a.id}>
                  <Link
                    to="/adresses"
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 transition active:bg-surface/90"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{a.label}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">
                        {[a.neighborhood, a.city].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

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
            <Row to="/superadmin" icon={ShieldCheck} label="Espace Super Admin" />
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
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-cm-green/50 bg-brand-cm-green/10 px-4 py-3.5 text-sm font-semibold text-brand-cm-green transition hover:bg-brand-cm-green hover:text-brand-cm-green-fg active:scale-[0.99] dark:border-brand-cm-green/70 dark:bg-brand-cm-green/20 dark:text-white"
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
