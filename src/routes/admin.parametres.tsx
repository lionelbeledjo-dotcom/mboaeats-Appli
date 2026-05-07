import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings, Save, Trash2, Plus, ShieldCheck, Loader2, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getPlatformSettings,
  upsertPlatformSetting,
  deletePlatformSetting,
} from "@/server/admin-settings.functions";

export const Route = createFileRoute("/admin/parametres")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/admin-login" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/admin-login" });
  },
  head: () => ({
    meta: [
      { title: "Paramètres · Admin MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminSettings,
});

type Setting = {
  key: string;
  value_int: number | null;
  value_text: string | null;
  description: string | null;
  updated_at?: string;
};

type Admin = {
  user_id: string;
  created_at: string;
  profile: { full_name: string | null; phone: string | null; city: string | null } | null;
};

function AdminSettings() {
  const fetchAll = useServerFn(getPlatformSettings);
  const upsert = useServerFn(upsertPlatformSetting);
  const remove = useServerFn(deletePlatformSetting);

  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; email: string | null } | null>(null);
  const [draft, setDraft] = useState({ key: "", value_int: "", value_text: "", description: "" });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const r = await fetchAll();
      setSettings(r.settings as Setting[]);
      setAdmins(r.admins as Admin[]);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    }
  };

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMe({ id: data.user.id, email: data.user.email ?? null });
    });
  }, []);

  const update = (key: string, patch: Partial<Setting>) => {
    setSettings((s) => s?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? s);
  };

  const save = async (row: Setting) => {
    setSavingKey(row.key);
    setError(null);
    try {
      await upsert({
        data: {
          key: row.key,
          value_int: row.value_int,
          value_text: row.value_text,
          description: row.description,
        },
      });
      setSavedKey(row.key);
      setTimeout(() => setSavedKey((k) => (k === row.key ? null : k)), 1500);
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setSavingKey(null);
    }
  };

  const del = async (key: string) => {
    if (!confirm(`Supprimer le paramètre "${key}" ?`)) return;
    try {
      await remove({ data: { key } });
      setSettings((s) => s?.filter((r) => r.key !== key) ?? s);
    } catch (e: any) {
      setError(e?.message || "Erreur");
    }
  };

  const add = async () => {
    if (!draft.key.trim()) return;
    setAdding(true);
    try {
      await upsert({
        data: {
          key: draft.key.trim(),
          value_int: draft.value_int ? Number(draft.value_int) : null,
          value_text: draft.value_text || null,
          description: draft.description || null,
        },
      });
      setDraft({ key: "", value_int: "", value_text: "", description: "" });
      await load();
    } catch (e: any) {
      setError(e?.message || "Erreur");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" /> Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">
          Configuration globale de la plateforme et accès administrateur.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className="rounded-3xl border border-border bg-surface/60 p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-bold">Mon compte admin</h2>
        </div>
        <div className="grid gap-3 text-sm">
          <div className="flex justify-between border-b border-border/50 pb-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{me?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">User ID</span>
            <span className="font-mono text-xs">{me?.id ?? "—"}</span>
          </div>
        </div>

        <h3 className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Administrateurs ({admins.length})
        </h3>
        <ul className="divide-y divide-border/50 rounded-2xl border border-border">
          {admins.map((a) => (
            <li key={a.user_id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{a.profile?.full_name ?? "Admin"}</p>
                <p className="text-xs text-muted-foreground">
                  {a.profile?.phone ?? a.user_id.slice(0, 8) + "…"}
                </p>
              </div>
              {a.user_id === me?.id && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  Vous
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-border bg-surface/60 p-6">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold">Paramètres plateforme</h2>
          <p className="text-xs text-muted-foreground">
            Frais, seuils et clés/valeurs utilisés par l'application en temps réel.
          </p>
        </div>

        {!settings ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {settings.map((row) => (
              <div
                key={row.key}
                className="grid gap-2 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_120px_1fr_auto]"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{row.key}</p>
                  <input
                    placeholder="Description"
                    value={row.description ?? ""}
                    onChange={(e) => update(row.key, { description: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Entier"
                  value={row.value_int ?? ""}
                  onChange={(e) =>
                    update(row.key, { value_int: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  placeholder="Texte"
                  value={row.value_text ?? ""}
                  onChange={(e) => update(row.key, { value_text: e.target.value || null })}
                  className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => save(row)}
                    disabled={savingKey === row.key}
                    className="flex items-center gap-1 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
                  >
                    {savingKey === row.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : savedKey === row.key ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => del(row.key)}
                    className="rounded-lg border border-destructive/40 p-2 text-destructive hover:bg-destructive/10"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-dashed border-border bg-background p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ajouter un paramètre
          </p>
          <div className="grid gap-2 md:grid-cols-[1fr_120px_1fr_auto]">
            <input
              placeholder="clé (ex: support_phone)"
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Entier"
              value={draft.value_int}
              onChange={(e) => setDraft({ ...draft, value_int: e.target.value })}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              placeholder="Texte"
              value={draft.value_text}
              onChange={(e) => setDraft({ ...draft, value_text: e.target.value })}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={add}
              disabled={adding || !draft.key.trim()}
              className="flex items-center gap-1 rounded-lg bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Ajouter
            </button>
          </div>
          <input
            placeholder="Description (optionnel)"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </section>
    </div>
  );
}
