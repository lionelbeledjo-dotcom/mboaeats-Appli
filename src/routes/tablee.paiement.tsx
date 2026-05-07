import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck, Loader2, Check, Smartphone, Lock, Tag } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  participant: z.string().optional(),
  item: z.string().optional(),
  amount: z.coerce.number().int().nonnegative().optional(),
  discount: z.coerce.number().int().nonnegative().optional(),
  promo: z.string().optional(),
  msisdn: z.string().optional(),
});

export const Route = createFileRoute("/tablee/paiement")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Validation paiement Tablée — MboaEats" },
      { name: "description", content: "Confirme ta part via le code OTP MTN MoMo." },
    ],
  }),
  component: TableePaiement,
});

function TableePaiement() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const participant = search.participant ?? "Sandra";
  const item = search.item ?? "Poulet DG";
  const amount = search.amount ?? 3500;
  const discount = search.discount ?? 0;
  const promo = search.promo;
  const msisdn = search.msisdn ?? "691 ** ** 42";
  const total = Math.max(0, amount - discount);

  const [step, setStep] = useState<"otp" | "loading" | "done">("otp");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [err, setErr] = useState<string | null>(null);
  const [resend, setResend] = useState(30);

  useEffect(() => {
    if (step !== "otp" || resend <= 0) return;
    const t = setTimeout(() => setResend((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resend, step]);

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, "").slice(-1);
    setErr(null);
    setDigits((d) => {
      const n = [...d];
      n[i] = c;
      return n;
    });
    if (c && i < 5) {
      const next = document.getElementById(`otp-${i + 1}`);
      next?.focus();
    }
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      document.getElementById(`otp-${i - 1}`)?.focus();
    }
  };

  const [receipt, setReceipt] = useState<{ ref: string; at: Date } | null>(null);

  const submit = () => {
    const code = digits.join("");
    if (code.length < 4) { setErr("Saisis le code reçu (4-6 chiffres)."); return; }
    setStep("loading");
    setTimeout(() => {
      const ref = "MBE-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      const at = new Date();
      setReceipt({ ref, at });
      setStep("done");
      try {
        sessionStorage.setItem(
          "tablee:lastPaid",
          JSON.stringify({ participant, amount: total, at: at.getTime(), ref, promo: promo ?? null, discount, msisdn }),
        );
      } catch {}
      setTimeout(() => navigate({ to: "/tablee" }), 4500);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/tablee" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Tablée
          </Link>
          <span className="font-display font-bold">Validation</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Sécurisé</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-3xl border border-border bg-surface/60 p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 font-display text-sm font-bold text-black">MTN</div>
            <div>
              <h1 className="font-display text-xl font-bold">Code OTP MTN MoMo</h1>
              <p className="text-xs text-muted-foreground">Envoyé au {msisdn}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Tu paies pour</p>
            <p className="mt-1 font-display text-lg font-bold">{participant} · {item}</p>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-muted-foreground"><span>Sous-total</span><span>{amount.toLocaleString("fr-FR")} F</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-primary">
                  <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> Promo {promo ?? ""}</span>
                  <span>−{discount.toLocaleString("fr-FR")} F</span>
                </div>
              )}
              <div className="flex justify-between font-display text-base font-bold"><span>Total</span><span>{total.toLocaleString("fr-FR")} F</span></div>
            </div>
          </div>

          {step === "otp" && (
            <>
              <div className="mt-6">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code à 6 chiffres</label>
                <div className="mt-3 grid grid-cols-6 gap-2">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => onKey(i, e)}
                      className="h-14 rounded-xl border border-border bg-background/50 text-center font-display text-2xl outline-none focus:border-primary"
                    />
                  ))}
                </div>
                {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {resend > 0 ? `Renvoyer le code dans ${resend}s` : (
                    <button onClick={() => setResend(30)} className="font-semibold text-primary hover:underline">Renvoyer le code</button>
                  )}
                </p>
              </div>

              <button
                onClick={submit}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01]"
              >
                <Smartphone className="h-4 w-4" /> Valider {total.toLocaleString("fr-FR")} F
              </button>

              <p className="mt-4 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" /> Démo : saisis n'importe quel code à 4-6 chiffres
              </p>
            </>
          )}

          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Confirmation auprès de MTN MoMo…</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Check className="h-8 w-8" />
              </div>
              <div>
                <p className="font-display text-xl font-bold">Paiement confirmé</p>
                <p className="text-xs text-muted-foreground">Reçu MTN MoMo</p>
              </div>

              <div className="w-full rounded-2xl border border-dashed border-border bg-background/60 p-4 text-left text-sm">
                <Row label="Référence" value={receipt?.ref ?? "—"} mono />
                <Row label="Participant" value={`${participant} · ${item}`} />
                <Row label="Numéro" value={msisdn} mono />
                <Row label="Date" value={receipt ? receipt.at.toLocaleString("fr-FR") : "—"} />
                <div className="my-3 border-t border-border" />
                <Row label="Sous-total" value={`${amount.toLocaleString("fr-FR")} F`} />
                {discount > 0 && (
                  <Row
                    label={`Promo ${promo ?? ""}`}
                    value={`−${discount.toLocaleString("fr-FR")} F`}
                    accent
                  />
                )}
                <div className="my-2 border-t border-border" />
                <div className="flex items-center justify-between font-display text-base font-bold">
                  <span>Total payé</span>
                  <span className="text-emerald-400">{total.toLocaleString("fr-FR")} F</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">Retour à la tablée dans quelques secondes…</p>
              <button
                onClick={() => navigate({ to: "/tablee" })}
                className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-elevated"
              >
                Retour maintenant
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${accent ? "text-primary" : "text-foreground"} text-sm`}>{value}</span>
    </div>
  );
}
