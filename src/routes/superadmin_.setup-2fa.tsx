import { createFileRoute, redirect, useNavigate, isRedirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crown, ShieldCheck, Loader2, Copy, Check, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  beginSetup2fa,
  confirmSetup2fa,
  get2faStatus,
} from "@/lib/superadmin-2fa.functions";

export const Route = createFileRoute("/superadmin_/setup-2fa")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw redirect({ to: "/superadmin/login" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/superadmin/login" });
    }
  },
  component: SetupPage,
  head: () => ({
    meta: [
      { title: "Configuration 2FA · Super Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function SetupPage() {
  const navigate = useNavigate();
  const begin = useServerFn(beginSetup2fa);
  const confirm = useServerFn(confirmSetup2fa);
  const status = useServerFn(get2faStatus);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await status();
        if (s.enabled) {
          navigate({ to: "/superadmin", replace: true });
          return;
        }
        const r = await begin();
        setData({ secret: r.secret, qrDataUrl: r.qrDataUrl });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setError(null);
    setSubmitting(true);
    try {
      const r = await confirm({ data: { secret: data.secret, code } });
      setBackupCodes(r.backupCodes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code invalide");
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadCodes = () => {
    if (!backupCodes) return;
    const blob = new Blob(
      [
        `MboaEats — Codes de secours SUPER_ADMIN\nGénérés le ${new Date().toLocaleString("fr-FR")}\n\n${backupCodes.join("\n")}\n\nConservez ces codes en lieu sûr. Chacun n'est utilisable qu'une seule fois.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mboaeats-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Crown className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">Sécuriser votre compte</h1>
            <p className="text-xs text-muted-foreground">Configuration de la double authentification (2FA)</p>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Génération du secret…</p>
          </div>
        )}

        {!loading && backupCodes && (
          <div className="rounded-3xl border border-primary/40 bg-card p-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold">2FA activée</h2>
            </div>
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Conservez ces <strong>codes de secours</strong> en lieu sûr. Ils permettent de récupérer l'accès si vous perdez votre téléphone. Chaque code n'est utilisable qu'une seule fois.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background p-4 font-mono text-sm">
              {backupCodes.map((c) => (
                <div key={c} className="rounded-md bg-muted/50 px-2 py-1.5 text-center tracking-wider">{c}</div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={downloadCodes} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-background text-sm font-semibold hover:bg-muted">
                <Download className="h-4 w-4" /> Télécharger
              </button>
              <button
                onClick={() => navigate({ to: "/superadmin", replace: true })}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {!loading && !backupCodes && data && (
          <form onSubmit={onSubmit} className="rounded-3xl border border-border bg-card p-6">
            <ol className="space-y-4 text-sm">
              <li>
                <p className="font-semibold">1. Installez une application d'authentification</p>
                <p className="mt-1 text-xs text-muted-foreground">Google Authenticator, Microsoft Authenticator, Authy, 1Password…</p>
              </li>
              <li>
                <p className="font-semibold">2. Scannez le QR code</p>
                <div className="mt-3 flex justify-center rounded-2xl border border-border bg-white p-4">
                  <img src={data.qrDataUrl} alt="QR Code 2FA" width={240} height={240} className="h-60 w-60" />
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Ou saisir manuellement la clé :</p>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                    <code className="flex-1 break-all font-mono text-xs">{data.secret}</code>
                    <button type="button" onClick={copySecret} className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted hover:bg-muted/70" aria-label="Copier">
                      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </li>
              <li>
                <p className="font-semibold">3. Entrez le code à 6 chiffres affiché</p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-primary"
                  required
                />
              </li>
            </ol>
            {error && <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Activer la 2FA
            </button>
          </form>
        )}

        {!loading && !data && error && (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">{error}</div>
        )}
      </div>
    </div>
  );
}
