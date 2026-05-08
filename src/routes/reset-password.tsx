import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe · MboaEats" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ResetPassword,
});

const passwordSchema = z
  .string()
  .min(8, "Minimum 8 caractères")
  .regex(/[A-Z]/, "Doit contenir une majuscule")
  .regex(/[0-9]/, "Doit contenir un chiffre");

const emailSchema = z.string().trim().email("Email invalide");

function ResetPassword() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Detect recovery link (Supabase appends type=recovery in URL hash)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setMode("update");
    }
  }, []);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = emailSchema.safeParse(email);
    if (!r.success) return setErr(r.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(r.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSent(true);
    toast.success("Email envoyé", { description: "Vérifie ta boîte de réception." });
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const p = passwordSchema.safeParse(pwd);
    if (!p.success) return setErr(p.error.issues[0].message);
    if (pwd !== confirm) return setErr("Les mots de passe ne correspondent pas");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: p.data });
    setBusy(false);
    if (error) return setErr(error.message);
    toast.success("Mot de passe mis à jour");
    navigate({ to: "/profil" });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-8">
        <Link to="/connexion" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-black">
          <ArrowLeft className="h-4 w-4" /> Connexion
        </Link>

        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            {mode === "update" ? "Nouveau mot de passe" : "Mot de passe oublié"}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {mode === "update"
              ? "Choisis un nouveau mot de passe pour ton compte."
              : "Saisis ton email, on t'enverra un lien de réinitialisation."}
          </p>
        </div>

        {mode === "request" ? (
          sent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" /> Lien envoyé à {email}
              </p>
              <p className="mt-1 text-xs text-emerald-600">Clique sur le lien dans l'email pour définir un nouveau mot de passe.</p>
            </div>
          ) : (
            <form onSubmit={requestReset} className="space-y-3">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-black placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              {err && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{err}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-neutral-800 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Envoyer le lien
                {!busy && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
              </button>
            </form>
          )
        ) : (
          <form onSubmit={updatePassword} className="space-y-3">
            <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
              <Lock className="h-4 w-4 shrink-0 text-neutral-500" />
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
              />
              <button type="button" onClick={() => setShow((v) => !v)} className="text-neutral-500" aria-label="Afficher">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 focus-within:border-black focus-within:ring-2 focus-within:ring-black/10">
              <Lock className="h-4 w-4 shrink-0 text-neutral-500" />
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirmer le mot de passe"
                className="flex-1 bg-transparent text-sm text-black placeholder:text-neutral-400 focus:outline-none"
              />
            </label>
            {err && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span>{err}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Mettre à jour
              {!busy && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
