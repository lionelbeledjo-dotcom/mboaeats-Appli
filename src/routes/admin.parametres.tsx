import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Settings, Save, ShieldCheck, Loader2, Check, User, Lock, Bell, AlertTriangle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getPlatformSettings } from "@/server/admin-settings.functions";

export const Route = createFileRoute("/admin/parametres")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw redirect({ to: "/admin/login" });
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) throw redirect({ to: "/admin/login" });
    } catch (err) {
      throw err;
    }
  },
  head: () => ({
    meta: [
      { title: "Paramètres · Admin MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSettings,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <h2 className="font-display text-xl font-bold">Paramètres indisponibles</h2>
      <p className="text-sm text-muted-foreground">{error?.message ?? "Erreur inconnue."}</p>
      <button onClick={() => reset()} className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground">
        Réessayer
      </button>
    </div>
  ),
});

type TabId = "profil" | "password" | "notifications";

function AdminSettings() {
  const fetchAll = useServerFn(getPlatformSettings);
  const [tab, setTab] = useState<TabId>("profil");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!alive) return;
        setUser(data?.user ?? null);
        if (data?.user?.id) {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, phone, city, avatar_url")
            .eq("user_id", data.user.id)
            .maybeSingle();
          if (alive) setProfile(p ?? null);
        }
        // best-effort, ignore failures
        try { await fetchAll(); } catch {}
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "profil", label: "Profil", icon: User },
    { id: "password", label: "Mot de passe", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" /> Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">Gérez votre compte administrateur.</p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface/60 p-1.5">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow scale-[1.02]"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          {tab === "profil" && <ProfileTab user={user} profile={profile} onSaved={setProfile} />}
          {tab === "password" && <PasswordTab />}
          {tab === "notifications" && <NotificationsTab />}
        </>
      )}
    </div>
  );
}

function ProfileTab({ user, profile, onSaved }: { user: any; profile: any; onSaved: (p: any) => void }) {
  const [fullName, setFullName] = useState<string>(profile?.full_name ?? "");
  const [phone, setPhone] = useState<string>(profile?.phone ?? "");
  const [city, setCity] = useState<string>(profile?.city ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!user?.id) {
      toast.error("Session invalide");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, full_name: fullName || null, phone: phone || null, city: city || null }, { onConflict: "user_id" });
      if (error) throw error;
      onSaved({ ...(profile ?? {}), full_name: fullName, phone, city });
      toast.success("Profil mis à jour");
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border bg-surface/60 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold">Mon compte</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FieldRow label="Email">
          <input value={user?.email ?? ""} disabled className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground" />
        </FieldRow>
        <FieldRow label="ID utilisateur">
          <input value={user?.id ?? ""} disabled className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 font-mono text-xs text-muted-foreground" />
        </FieldRow>
        <FieldRow label="Nom complet">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ex : Jean Mboa" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </FieldRow>
        <FieldRow label="Téléphone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6 …" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </FieldRow>
        <FieldRow label="Ville">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Douala" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </FieldRow>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        Enregistrer
      </button>
    </section>
  );
}

function PasswordTab() {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (pwd.length < 8) { toast.error("Au moins 8 caractères"); return; }
    if (pwd !== pwd2) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Mot de passe mis à jour");
      setPwd(""); setPwd2("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally { setSaving(false); }
  };

  return (
    <section className="rounded-3xl border border-border bg-surface/60 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold">Changer le mot de passe</h2>
      </div>
      <FieldRow label="Nouveau mot de passe">
        <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
      </FieldRow>
      <FieldRow label="Confirmer">
        <input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
      </FieldRow>
      <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Mettre à jour
      </button>
    </section>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState(() => {
    if (typeof window === "undefined") return { newOrders: true, disputes: true, weekly: false };
    try { return JSON.parse(localStorage.getItem("admin.notif.prefs") ?? "") || { newOrders: true, disputes: true, weekly: false }; }
    catch { return { newOrders: true, disputes: true, weekly: false }; }
  });
  const toggle = (k: keyof typeof prefs) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    try { localStorage.setItem("admin.notif.prefs", JSON.stringify(next)); } catch {}
    toast.success("Préférences enregistrées");
  };
  const items: { key: keyof typeof prefs; label: string; desc: string }[] = [
    { key: "newOrders", label: "Nouvelles commandes", desc: "Recevoir une notification pour chaque commande créée." },
    { key: "disputes",  label: "Litiges ouverts",     desc: "Alerter dès qu'un litige est ouvert par un client." },
    { key: "weekly",    label: "Rapport hebdomadaire", desc: "Recevoir un récapitulatif chaque lundi matin." },
  ];
  return (
    <section className="rounded-3xl border border-border bg-surface/60 p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-bold">Notifications</h2>
      </div>
      {items.map((it) => (
        <label key={it.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-background/40 p-4 hover:bg-background/60">
          <div>
            <p className="font-semibold">{it.label}</p>
            <p className="text-xs text-muted-foreground">{it.desc}</p>
          </div>
          <input type="checkbox" checked={prefs[it.key]} onChange={() => toggle(it.key)} className="mt-1 h-5 w-5 accent-primary" />
        </label>
      ))}
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
