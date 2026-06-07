import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Mail, Smartphone, ArrowLeft, Loader2, Check, Contrast } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const Route = createFileRoute("/preferences")({
  head: () => ({
    meta: [
      { title: "Préférences de notifications — MboaEats" },
      { name: "description", content: "Activez ou désactivez les notifications push, in-app et email." },
    ],
  }),
  component: PreferencesPage,
});

type Prefs = { push_enabled: boolean; inapp_enabled: boolean; email_enabled: boolean };

function PreferencesPage() {
  const navigate = useNavigate();
  const { highContrast, toggleHighContrast } = useTheme();
  const { permission: pushPerm, subscribed, requestPermission } = usePushNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>({ push_enabled: true, inapp_enabled: true, email_enabled: true });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) { navigate({ to: "/connexion" }); return; }
      setUserId(u.id);
      const { data: row } = await supabase
        .from("notification_preferences")
        .select("push_enabled,inapp_enabled,email_enabled")
        .eq("user_id", u.id)
        .maybeSingle();
      if (row) setPrefs(row as Prefs);
      setLoading(false);
    })();
  }, [navigate]);

  const toggle = (k: keyof Prefs) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  };

  const askPush = async () => {
    const granted = await requestPermission();
    if (granted) setPrefs((s) => ({ ...s, push_enabled: true }));
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/profil" className="p-2 -ml-2 rounded-lg hover:bg-muted"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-bold text-lg">Préférences de notifications</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Choisissez comment vous voulez être informé des commandes, paiements et offres. Vos préférences s'appliquent à votre compte (client ou restaurateur).
        </p>

        <PrefRow
          icon={<Bell className="w-5 h-5" />}
          title="Notifications dans l'app"
          desc="Cloche en haut à droite, badge et alertes en temps réel."
          enabled={prefs.inapp_enabled}
          onToggle={() => toggle("inapp_enabled")}
        />

        <PrefRow
          icon={<Smartphone className="w-5 h-5" />}
          title="Notifications push"
          desc={pushPerm === "granted"
            ? "Reçues même quand l'app est fermée."
            : "Autorisez les notifications dans votre navigateur pour les activer."}
          enabled={prefs.push_enabled && pushPerm === "granted"}
          onToggle={() => {
            if (pushPerm !== "granted") { askPush(); return; }
            toggle("push_enabled");
          }}
          extra={pushPerm !== "granted" ? (
            <button onClick={askPush} className="text-xs font-semibold text-primary mt-2">
              Autoriser les notifications
            </button>
          ) : null}
        />

        <PrefRow
          icon={<Mail className="w-5 h-5" />}
          title="Emails"
          desc="Confirmations de commande, paiements et reçus par email."
          enabled={prefs.email_enabled}
          onToggle={() => toggle("email_enabled")}
        />

        <div className="pt-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-white/70 mb-2 px-1">
            Affichage
          </h2>
          <PrefRow
            icon={<Contrast className="w-5 h-5" />}
            title="Contraste renforcé"
            desc="Optimise la lisibilité du texte sur les fonds colorés (recommandé en mode sombre ou en plein soleil)."
            enabled={highContrast}
            onToggle={toggleHighContrast}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saved ? "Enregistré" : "Enregistrer"}
        </button>
      </main>
    </div>
  );
}

function PrefRow({
  icon, title, desc, enabled, onToggle, extra,
}: {
  icon: React.ReactNode; title: string; desc: string; enabled: boolean;
  onToggle: () => void; extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-muted grid place-items-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
        {extra}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}
