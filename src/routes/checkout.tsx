import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { SmartImage } from "@/components/SmartImage";
import {
  ArrowLeft, Smartphone, CreditCard, Banknote, Check, Loader2, ShieldCheck,
  Lock, ChevronRight, Webhook, MapPin, Tag, Crown, AlertCircle, X, Plus, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { initiatePayment, verifyPayment, getActiveMboaPass, initiateCardPayment, pollPaymentStatus } from "@/server/payments.functions";
import { createOrder, markOrderPaid } from "@/server/marketplace.functions";
import { useCart, clearCart, addToCart, setQty as setCartQty, removeFromCart, setItemNote, type CartItem } from "@/hooks/use-cart";
import { QuantityStepper } from "@/components/QuantityStepper";
import { DeliveryDetails, type DeliveryDetailsState } from "@/components/checkout/DeliveryDetails";
import {
  DeliveryContactRows,
  validateDeliveryContact,
  type DeliveryContact,
  type DeliveryContactErrors,
} from "@/components/checkout/DeliveryContactRows";
import { WalletPayButton } from "@/components/checkout/WalletPayButton";
import { WalletProcessingOverlay } from "@/components/checkout/WalletProcessingOverlay";
import { setPendingPayment, updatePendingPayment, clearPendingPayment } from "@/lib/pending-payment";


export const Route = createFileRoute("/checkout")({
  component: CheckoutRoute,
  head: () => ({
    meta: [
      { title: "Paiement · MboaEats" },
      { name: "description", content: "Payez en MTN MoMo, Orange Money, carte bancaire ou cash à la livraison." },
    ],
  }),
});

class CheckoutErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Checkout] render error", error);
  }
  reset = () => this.setState({ hasError: false, error: null });
  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-[calc(100dvh-80px)] bg-background px-6 py-10">
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h1 className="text-lg font-bold">Une erreur est survenue lors du paiement</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Veuillez réessayer dans un instant. Si le panier semble vide, ajoutez à nouveau vos plats.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={this.reset}
                className="h-11 w-full rounded-xl bg-foreground text-background font-semibold active:scale-[0.98]"
              >
                Réessayer
              </button>
              <Link
                to="/panier"
                className="h-11 w-full inline-flex items-center justify-center rounded-xl border border-border font-semibold"
              >
                Retour au panier
              </Link>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

function CheckoutRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <main className="min-h-[calc(100dvh-80px)] bg-background" aria-busy="true" />;
  }
  return (
    <CheckoutErrorBoundary>
      <Checkout />
    </CheckoutErrorBoundary>
  );
}

type Method = "momo" | "orange" | "card" | "cash";
type Step = "choose" | "ussd" | "otp" | "card" | "success";

const UPSELL_ITEMS: { id: string; name: string; price: number; image: string; emoji: string }[] = [
  { id: "upsell__cocacola", name: "Coca-Cola 33cl", price: 700, emoji: "🥤", image: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80" },
  { id: "upsell__frites", name: "Frites maison", price: 1500, emoji: "🍟", image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80" },
  { id: "upsell__beignet", name: "Beignet sucré", price: 500, emoji: "🥯", image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80" },
  { id: "upsell__sauce", name: "Sauce piment maison", price: 300, emoji: "🌶️", image: "https://images.unsplash.com/photo-1599577180589-0a3a6c4f0c5b?w=400&q=80" },
];


const TAX_RATE = 0; // TVA incluse au Cameroun (prix TTC affichés)

function Checkout() {
  const navigate = useNavigate();
  const initiate = useServerFn(initiatePayment);
  const initiateCard = useServerFn(initiateCardPayment);
  const pollStatus = useServerFn(pollPaymentStatus);
  const verify = useServerFn(verifyPayment);
  const fetchPass = useServerFn(getActiveMboaPass);
  const createOrderFn = useServerFn(createOrder);
  const markPaidFn = useServerFn(markOrderPaid);

  const cartHook = useCart();
  const cartItems = Array.isArray(cartHook?.items) ? cartHook.items.filter(Boolean) : [];
  const subtotal = Number.isFinite(cartHook?.subtotal) ? cartHook.subtotal : 0;
  const cart = cartItems.map((i) => ({ name: i?.name ?? "Article", qty: i?.qty ?? 0, price: i?.price ?? 0 }));
  // Items provenant de la base (préfixés "db__") → vraie commande live
  const dbItems = cartItems.filter((i) => i?.id?.startsWith("db__"));
  const isLiveOrder = dbItems.length > 0;
  const liveRestoId = dbItems[0]?.restoId ?? null;
  const { data: passData } = useQuery({
    queryKey: ["mboa-pass"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { active: false };
      try {
        return await fetchPass({ data: { userId: user.id } });
      } catch {
        return { active: false };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const hasPass = !!passData?.active;
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const delivery = hasPass || subtotal === 0 ? 0 : 800;
  const taxes = Math.round((subtotal + delivery) * TAX_RATE);
  const total = Math.max(0, subtotal + delivery + taxes - (promo?.discount ?? 0));

  const [method, setMethod] = useState<Method>("momo");
  const [phone, setPhone] = useState("690 00 00 00");
  const [delivery_, setDelivery] = useState<DeliveryDetailsState>({
    address: { line: "", city: "Douala", neighborhood: "" },
    schedule: { type: "now" },
    instructions: "",
  });
  const [deliveryErr, setDeliveryErr] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [reference, setReference] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [seconds, setSeconds] = useState(20);
  const [liveOrderId, setLiveOrderId] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const [extrasSeen, setExtrasSeen] = useState(false);
  const [cardLink, setCardLink] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "pending" | "succeeded" | "failed">("idle");
  const [contactErrors, setContactErrors] = useState<DeliveryContactErrors>({});
  const [activeWallet, setActiveWallet] = useState<"apple" | "google" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Confirme automatiquement la commande quand le webhook signale un succès
  // pendant un paiement Apple Pay / Google Pay (sinon CardScreen s'en charge).
  useEffect(() => {
    if (!activeWallet) return;
    if (paymentStatus === "succeeded") {
      const t = setTimeout(() => { void confirm(); }, 700);
      return () => clearTimeout(t);
    }
  }, [activeWallet, paymentStatus]);

  // Contact de livraison (adresse / instructions / téléphone) — synchronisé avec delivery_
  const contact: DeliveryContact = {
    address: delivery_.address.line,
    instructions: delivery_.instructions,
    phone,
  };
  const setContact = (next: DeliveryContact) => {
    setDelivery({
      ...delivery_,
      address: { ...delivery_.address, line: next.address },
      instructions: next.instructions,
    });
    setPhone(next.phone);
    setContactErrors(validateDeliveryContact(next));
  };

  // Validation live : panier + contact (adresse, instructions, téléphone)
  const liveContactErrors = validateDeliveryContact(contact);
  const cartEmpty = cartItems.length === 0;
  const contactIncomplete = Object.keys(liveContactErrors).length > 0;
  const payDisabled = cartEmpty || contactIncomplete;
  const payDisabledReason = cartEmpty
    ? "Votre panier est vide. Ajoutez un plat pour continuer."
    : contactIncomplete
      ? (liveContactErrors.address ?? liveContactErrors.instructions ?? liveContactErrors.phone ?? "Complétez vos informations de livraison")
      : null;

  // (MboaPass détecté via useQuery ci-dessus avec cache 5 min)

  useEffect(() => {
    if (step !== "ussd" || !pending) return;
    if (seconds <= 0) { goToOtp(); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, pending, seconds]);

  // Realtime : suivi du statut paiement (mis à jour par le webhook Campay)
  useEffect(() => {
    if (!reference) return;
    const channel = supabase
      .channel(`pay-${reference}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `reference=eq.${reference}` },
        (payload) => {
          const s = (payload.new as { status?: string })?.status;
          if (s === "succeeded") setPaymentStatus("succeeded");
          else if (s === "failed") setPaymentStatus("failed");
          else if (s === "pending") setPaymentStatus("pending");
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [reference]);

  // Persiste le paiement en cours pour permettre une redirection automatique
  // vers /suivi/$orderId même si l'utilisateur quitte cette page.
  useEffect(() => {
    if (!reference) return;
    setPendingPayment({ reference, orderId: liveOrderId, total });
  }, [reference, total]);
  useEffect(() => {
    if (!reference || !liveOrderId) return;
    updatePendingPayment({ orderId: liveOrderId });
  }, [liveOrderId, reference]);
  useEffect(() => {
    if (paymentStatus === "succeeded" || paymentStatus === "failed") {
      // Le succès déclenche confirm() qui redirige ; on libère le watcher global.
      clearPendingPayment();
    }
  }, [paymentStatus]);

  const ensureLiveOrder = async (): Promise<string | null> => {
    if (!isLiveOrder || !liveRestoId) return null;
    if (liveOrderId) return liveOrderId;
    const addr = delivery_.address;
    const scheduled =
      delivery_.schedule.type === "scheduled" ? delivery_.schedule.when : null;
    const orderNotes = [
      delivery_.instructions && `Livreur: ${delivery_.instructions}`,
      scheduled && `Programmée: ${new Date(scheduled).toLocaleString("fr-FR")}`,
      ...dbItems
        .filter((i) => i.note)
        .map((i) => `${i.name}: ${i.note}`),
    ]
      .filter(Boolean)
      .join(" · ");
    const res = await createOrderFn({
      data: {
        restaurant_id: liveRestoId,
        items: dbItems.map((i) => ({
          dish_id: i.dishId,
          name: i.name,
          qty: i.qty,
          unit_price: i.price,
        })),
        delivery_address: {
          line: addr.line,
          city: addr.city,
          neighborhood: addr.neighborhood ?? undefined,
          lat: addr.lat ?? null,
          lng: addr.lng ?? null,
        },
        promo_code: promo?.code,
        notes: orderNotes || addr.line,
      },
    });
    setLiveOrderId(res.order.id);
    return res.order.id;
  };

  const start = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const release = () => {
      submittingRef.current = false;
      setSubmitting(false);
    };
    setTopError(null);
    if (cartItems.length === 0) {
      setTopError("Votre panier est vide. Ajoutez un plat avant de passer au paiement.");
      release();
      return;
    }
    const errs = validateDeliveryContact(contact);
    setContactErrors(errs);
    if (Object.keys(errs).length > 0) {
      setDeliveryErr(errs.address ?? "Vérifiez vos informations de livraison");
      setTopError("Complétez l'adresse, les instructions et le téléphone avant de payer.");
      release();
      return;
    }
    setDeliveryErr(null);

    let activeOrderId: string | null = liveOrderId;
    try {
      activeOrderId = (await ensureLiveOrder()) ?? liveOrderId;
    } catch (e) {
      setTopError(e instanceof Error ? e.message : "Impossible de créer la commande");
      release();
      return;
    }

    if (method === "cash") { setStep("success"); release(); return; }
    if (method === "card") {
      setPending(true);
      setPaymentStatus("pending");
      try {
        const res = await initiateCard({
          data: {
            amount: total,
            purpose: "order",
            return_url: typeof window !== "undefined" ? window.location.href : "https://mboaeats.lovable.app/checkout",
            metadata: { delivery: delivery_, cart: cart.map((c) => c.name).filter(Boolean), order_id: activeOrderId },
          },
        });
        if (!res.ok || !res.link) throw new Error(res.error ?? "Échec d'initiation carte");
        setReference(res.reference);
        setCardLink(res.link);
        setStep("card");
        setPending(false);
        // Ouvre la page sécurisée Campay dans un nouvel onglet
        window.open(res.link, "_blank", "noopener,noreferrer");
      } catch (e) {
        setPending(false);
        setPaymentStatus("failed");
        setTopError(e instanceof Error ? e.message : "Erreur paiement carte");
        release();
      }
      return;
    }

    setPending(true);
    setPaymentStatus("pending");
    try {
      const cleanMsisdn = phone.replace(/\D/g, "");
      const res = await initiate({
        data: {
          provider: method,
          msisdn: `237${cleanMsisdn}`,
          amount: total,
          purpose: "order",
          metadata: { delivery: delivery_, cart: cart.map((c) => c.name).filter(Boolean), order_id: activeOrderId },
        },
      });
      if (!res.ok) throw new Error(res.error ?? "Échec d'initiation");
      setReference(res.reference);
      setStep("ussd");
      setSeconds(20);
    } catch (e) {
      setPending(false);
      setPaymentStatus("failed");
      setTopError(e instanceof Error ? e.message : "Erreur paiement");
      release();
    }
  };

  const goToOtp = () => {
    setPending(false);
    setStep("otp");
  };

  const submitOtp = async (code: string) => {
    if (!reference) throw new Error("Référence absente");
    const r = await verify({ data: { reference, otp: code } });
    if (!r.ok) throw new Error(r.error ?? "OTP invalide");
  };

  const confirm = async () => {
    setPending(false);
    setPaymentStatus(method === "cash" ? "idle" : "succeeded");
    setStep("success");
    try {
      const orderId = liveOrderId ?? (await ensureLiveOrder());
      if (orderId) {
        await markPaidFn({
          data: { order_id: orderId, payment_reference: reference ?? `MBE-${Date.now()}` },
        });
        clearCart();
        setTimeout(() => navigate({ to: "/suivi/$orderId", params: { orderId } }), 1500);
        return;
      }
    } catch {
      /* fallback */
    }
    setTimeout(() => navigate({ to: "/suivi" }), 1800);
  };

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ overflow: "visible" }}>
      <header
        className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/profil" className="inline-flex items-center gap-2 text-sm text-muted-foreground active:text-foreground hover:text-foreground rounded-lg px-2 py-1 -ml-2 active:bg-muted/60">
            <ArrowLeft className="h-4 w-4" /> Mon compte
          </Link>
          <span className="font-display font-bold">Paiement</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Sécurisé</span>
        </div>
      </header>

      <main
        className="relative z-10 mx-auto grid max-w-5xl gap-5 px-4 py-5 md:grid-cols-[1.4fr_1fr] md:gap-6 md:px-8 md:py-6"
        style={{ paddingBottom: "calc(120px + env(safe-area-inset-bottom))", overflow: "visible" }}
      >
        <section className="space-y-5">
          {topError && (
            <div
              role="alert"
              className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-4 text-sm text-destructive shadow-[0_8px_24px_-12px_rgba(239,68,68,0.45)] backdrop-blur-sm animate-fade-in"
            >
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-destructive to-destructive/40" />
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/15 ring-1 ring-destructive/30">
                <AlertCircle className="h-4 w-4 animate-scale-in" />
              </span>
              <div className="flex-1 pt-1 leading-snug">{topError}</div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setTopError(null)}
                className="rounded-full p-1 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {hasPass && (
            <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/15 via-gold/8 to-transparent p-3.5 text-sm shadow-[0_8px_24px_-14px_rgba(212,175,55,0.55)] animate-fade-in">
              <span aria-hidden className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gold/20 blur-2xl" />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 ring-1 ring-gold/40">
                <Crown className="h-4 w-4 text-gold" />
              </span>
              <span className="leading-snug">
                <strong className="text-gold">MboaPass actif</strong> — livraison offerte sur cette commande.
              </span>
              <Sparkles className="ml-auto h-4 w-4 text-gold/80 animate-pulse" />
            </div>
          )}
          {cartEmpty && step === "choose" && (
            <div
              role="status"
              className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-50 via-amber-100/60 to-amber-50 p-4 text-sm text-amber-900 shadow-[0_10px_28px_-16px_rgba(217,119,6,0.55)] animate-fade-in sm:flex-row sm:items-center sm:justify-between"
            >
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-500 to-amber-300" />
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/40">
                  <AlertCircle className="h-4 w-4 text-amber-700 animate-scale-in" />
                </span>
                <div className="leading-snug">
                  <p className="font-semibold">Panier vide</p>
                  <p className="text-amber-900/80">Ajoutez au moins un plat pour passer commande.</p>
                </div>
              </div>
              <Link
                to="/recherche"
                className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-900 px-4 text-xs font-semibold text-amber-50 shadow-sm transition-all hover:bg-amber-800 active:scale-[0.97]"
              >
                Découvrir des plats
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
          {step === "choose" && (
            <>
              <DeliveryContactRows value={contact} onChange={setContact} errors={contactErrors} />
              <DeliveryDetails value={delivery_} onChange={setDelivery} error={deliveryErr} />
              <DeliveryTypeSelector
                value={delivery_.schedule.type === "scheduled" ? "scheduled" : "standard"}
                onChange={(t) => {
                  if (t === "scheduled") {
                    const when = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                    setDelivery({ ...delivery_, schedule: { type: "scheduled", when } });
                  } else {
                    setDelivery({ ...delivery_, schedule: { type: "now" } });
                  }
                }}
              />
              <ChooseMethod
                method={method} setMethod={setMethod}
                phone={phone} setPhone={setPhone}
                disabled={payDisabled || submitting}
                submitting={submitting}
                disabledReason={payDisabledReason}
                onWalletPay={(w) => {
                  if (submittingRef.current) return;
                  if (payDisabled) {
                    setTopError(payDisabledReason);
                    setContactErrors(liveContactErrors);
                    return;
                  }
                  setActiveWallet(w);
                  setMethod("card");
                  setExtrasSeen(true);
                  start();
                }}
                onPay={() => {
                  if (submittingRef.current) return;
                  if (payDisabled) {
                    setTopError(payDisabledReason);
                    setContactErrors(liveContactErrors);
                    return;
                  }
                  if (!extrasSeen && cartItems.length > 0) setShowExtras(true);
                  else start();
                }} total={total}
              />
            </>
          )}
          {step === "ussd" && (
            <UssdScreen method={method} phone={phone} pending={pending} seconds={seconds} total={total} onConfirm={goToOtp} />
          )}
          {step === "otp" && (
            <OtpScreen method={method} phone={phone} total={total} onSubmit={submitOtp} onSuccess={confirm} onBack={() => setStep("ussd")} />
          )}
          {step === "card" && reference && (
            <CardScreen
              total={total}
              link={cardLink}
              reference={reference}
              poll={(ref) => pollStatus({ data: { reference: ref } })}
              onSuccess={confirm}
            />
          )}
          {step === "success" && <SuccessScreen method={method} total={total} />}
        </section>

        <Summary cartItems={cartItems} subtotal={subtotal} delivery={delivery} taxes={taxes} total={total} hasPass={hasPass} addressLine={delivery_.address.line} promo={promo} setPromo={setPromo} paymentStatus={paymentStatus} method={method} reference={reference} />
      </main>

      {activeWallet && (paymentStatus !== "idle" || pending) && step !== "success" && (
        <WalletProcessingOverlay
          wallet={activeWallet}
          status={paymentStatus === "idle" ? "pending" : paymentStatus}
          total={total}
          reference={reference}
          errorMessage={topError}
          onClose={() => {
            setActiveWallet(null);
            if (paymentStatus === "failed") {
              setPaymentStatus("idle");
              setStep("choose");
            }
          }}
          onRetry={() => {
            setPaymentStatus("idle");
            setTopError(null);
            start();
          }}
        />
      )}

      {showExtras && (
        <ExtrasModal
          onSkip={() => { setShowExtras(false); setExtrasSeen(true); start(); }}
          onClose={() => { setShowExtras(false); setExtrasSeen(true); }}
        />
      )}
    </div>
  );
}

function ChooseMethod({
  method, setMethod, phone, setPhone, onPay, onWalletPay, total, disabled = false, disabledReason = null, submitting = false,
}: {
  method: Method; setMethod: (m: Method) => void;
  phone: string; setPhone: (s: string) => void;
  onPay: () => void;
  onWalletPay?: (wallet: "apple" | "google") => void;
  total: number;
  disabled?: boolean; disabledReason?: string | null; submitting?: boolean;
}) {
  return (
    <>

      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <h2 className="font-display text-lg font-bold">Méthode de paiement</h2>

        <div className="mt-4">
          <WalletPayButton
            total={total}
            disabled={disabled}
            onPay={(w) => {
              if (onWalletPay) onWalletPay(w);
              else { setMethod("card"); onPay(); }
            }}
          />
        </div>

        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <PayOption id="momo" current={method} setCurrent={setMethod} title="MTN MoMo" subtitle="Confirmation auto via webhook" badge="Recommandé"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 font-display text-sm font-bold text-black">MTN</div>} />
          <PayOption id="orange" current={method} setCurrent={setMethod} title="Orange Money" subtitle="Paiement instantané"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 font-display text-xs font-bold text-white">Orange</div>} />
          <PayOption id="card" current={method} setCurrent={setMethod} title="Carte bancaire" subtitle="Visa, Mastercard"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary"><CreditCard className="h-5 w-5 text-primary-foreground" /></div>} />
          <PayOption id="cash" current={method} setCurrent={setMethod} title="Cash à la livraison" subtitle="Payez le livreur"
            icon={<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/20"><Banknote className="h-5 w-5 text-gold" /></div>} />
        </div>

        {(method === "momo" || method === "orange") && (
          <div className="mt-5 rounded-2xl border border-border bg-background/50 p-4 animate-fade-up">
            <label className="text-xs font-semibold text-muted-foreground">Numéro {method === "momo" ? "MTN MoMo" : "Orange Money"}</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background p-2">
              <span className="rounded-lg bg-surface px-3 py-2 text-sm font-bold">🇨🇲 +237</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="flex-1 bg-transparent px-2 py-2 text-base outline-none" />
            </div>
            <p className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-primary" /> Tu recevras une notification + un code OTP par SMS pour confirmer
            </p>
          </div>
        )}

        {method === "cash" && (
          <p className="mt-4 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-sm">
            <Banknote className="mr-1 inline h-4 w-4 text-gold" /> Préparez l'appoint si possible. Le livreur peut rendre la monnaie jusqu'à 5 000 FCFA.
          </p>
        )}
      </div>

      {disabled && disabledReason && (
        <div
          role="alert"
          className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-50 via-amber-100/50 to-amber-50 p-3.5 text-sm text-amber-900 shadow-[0_8px_22px_-14px_rgba(217,119,6,0.55)] animate-fade-in"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-500 to-amber-300" />
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/40">
            <AlertCircle className="h-3.5 w-3.5 text-amber-700 animate-scale-in" />
          </span>
          <span className="pt-0.5 leading-snug">{disabledReason}</span>
        </div>
      )}
      <button
        onClick={onPay}
        disabled={disabled || submitting}
        aria-disabled={disabled || submitting}
        title={disabled ? (disabledReason ?? "") : undefined}
        className="relative z-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-black py-5 text-[16px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(0,0,0,0.55)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:shadow-none disabled:active:scale-100"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? "Création de la commande..." : "Commander et payer"}
        {!submitting && <span className="text-white/80 font-bold">· {total.toLocaleString("fr-FR")} FCFA</span>}
      </button>
    </>
  );
}

function PayOption({ id, current, setCurrent, title, subtitle, icon, badge }: {
  id: Method; current: Method; setCurrent: (m: Method) => void; title: string; subtitle: string; icon: React.ReactNode; badge?: string;
}) {
  const active = current === id;
  return (
    <button
      onClick={() => setCurrent(id)}
      className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-background/40 hover:border-primary/40"
      }`}
    >
      {icon}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold">{title}</p>
          {badge && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{badge}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`}>
        {active && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
    </button>
  );
}

function UssdScreen({ method, phone, pending, seconds, total, onConfirm }: {
  method: Method; phone: string; pending: boolean; seconds: number; total: number; onConfirm: () => void;
}) {
  const code = method === "momo" ? "*126#" : "#150*1#";
  const brand = method === "momo" ? "MTN MoMo" : "Orange Money";
  return (
    <div className="rounded-3xl border border-primary/40 bg-surface/60 p-6 shadow-glow animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
          <Smartphone className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Confirme sur ton téléphone</h2>
          <p className="text-xs text-muted-foreground">{brand} · +237 {phone}</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background/50 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Compose ou attends la pop-up</p>
        <p className="mt-1 font-display text-3xl font-extrabold text-gradient-primary tracking-widest">{code}</p>
        <p className="mt-3 text-sm">Confirme le paiement de <span className="font-bold text-foreground">{total.toLocaleString("fr-FR")} FCFA</span> à <strong>MboaEats</strong>.</p>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-4">
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-sm font-semibold">En attente de la confirmation…</p>
              <p className="text-xs text-muted-foreground">Webhook auto · OTP dans {seconds}s</p>
            </div>
          </>
        ) : (
          <p className="text-sm">Le webhook a expiré.</p>
        )}
      </div>


      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Webhook className="h-3 w-3 text-primary" /> Confirmation via API native MTN/Orange · Aucune saisie de PIN sur MboaEats
      </div>

      <button onClick={onConfirm} className="mt-5 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20">
        Saisir le code OTP reçu par SMS
      </button>
    </div>
  );
}

type PollResult = { status: "succeeded" | "failed" | "pending" | "unknown" };

function CardScreen({ total, link, reference, poll, onSuccess }: {
  total: number; link: string | null; reference: string;
  poll: (ref: string) => Promise<PollResult>; onSuccess: () => void;
}) {
  const [status, setStatus] = useState<"pending" | "succeeded" | "failed">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "pending") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await poll(reference);
        if (cancelled) return;
        if (r.status === "succeeded") { setStatus("succeeded"); setTimeout(onSuccess, 800); return; }
        if (r.status === "failed") { setStatus("failed"); setError("Paiement refusé ou annulé."); return; }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de vérification");
      }
    };
    const id = setInterval(tick, 3000);
    tick();
    return () => { cancelled = true; clearInterval(id); };
  }, [status, reference, poll, onSuccess]);

  return (
    <div className="rounded-3xl border border-border bg-surface/60 p-6 animate-fade-up">
      <h2 className="font-display text-xl font-bold">Carte bancaire</h2>
      <p className="text-xs text-muted-foreground">Visa · Mastercard · 3D-Secure — via Campay</p>

      <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 via-background to-gold/20 p-5 shadow-card">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative flex justify-between">
          <CreditCard className="h-7 w-7 text-foreground" />
          <span className="font-display text-sm font-bold tracking-widest">VISA · MC</span>
        </div>
        <p className="relative mt-8 font-mono text-lg tracking-widest">Page sécurisée Campay</p>
        <div className="relative mt-3 text-xs text-muted-foreground">
          Montant : <strong>{total.toLocaleString("fr-FR")} FCFA</strong>
        </div>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        {status === "pending" && (
          <>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              En attente de la confirmation de ton paiement…
            </p>
            <p className="text-xs text-muted-foreground">
              Une nouvelle fenêtre s'est ouverte. Renseigne ta carte puis valide via 3D-Secure.
              Cette page se mettra à jour automatiquement.
            </p>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow"
              >
                <Lock className="h-4 w-4" /> Rouvrir la page de paiement
              </a>
            )}
          </>
        )}
        {status === "succeeded" && (
          <p className="flex items-center gap-2 text-emerald-500">
            <Check className="h-4 w-4" /> Paiement confirmé. Redirection…
          </p>
        )}
        {status === "failed" && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-destructive">
            <AlertCircle className="mr-1 inline h-4 w-4" /> {error ?? "Paiement refusé."}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">Référence : {reference}</p>
      </div>
    </div>
  );
}

function SuccessScreen({ method, total }: { method: Method; total: number }) {
  const label = method === "cash" ? "Commande confirmée" : "Paiement réussi";
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-emerald-500/40 bg-emerald-500/5 p-10 text-center animate-scale-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
        <Check className="h-8 w-8 text-primary-foreground" />
      </div>
      <h2 className="font-display text-2xl font-bold">{label} 🎉</h2>
      <p className="text-sm text-muted-foreground">
        {method === "cash"
          ? `Tu paieras ${total.toLocaleString("fr-FR")} FCFA au livreur à l'arrivée.`
          : `${total.toLocaleString("fr-FR")} FCFA débités · Reçu envoyé par SMS.`}
      </p>
      <Link to="/suivi" className="mt-3 rounded-2xl bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow">
        Suivre ma commande
      </Link>
    </div>
  );
}

function PaymentStatusBadge({ status, method }: { status: "idle" | "pending" | "succeeded" | "failed"; method: Method }) {
  if (status === "idle") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
        En attente de paiement
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Paiement en cours
      </span>
    );
  }
  if (status === "succeeded") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
        <Check className="h-3 w-3" /> {method === "cash" ? "Confirmée" : "Payée"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive">
      <AlertCircle className="h-3 w-3" /> Échec
    </span>
  );
}

function Summary({ cartItems = [], subtotal, delivery, taxes, total, hasPass, addressLine, promo, setPromo, paymentStatus, method, reference }: {
  cartItems: CartItem[]; subtotal: number; delivery: number; taxes?: number; total: number; hasPass: boolean; addressLine?: string;
  promo: { code: string; discount: number } | null;
  setPromo: (p: { code: string; discount: number } | null) => void;
  paymentStatus: "idle" | "pending" | "succeeded" | "failed";
  method: Method;
  reference: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const safeCartItems = Array.isArray(cartItems) ? cartItems.filter(Boolean) : [];
  const PROMOS: Record<string, number> = {
    MBOA10: Math.round(subtotal * 0.1),
    BIENVENUE: 1000,
    LIVRAISON: delivery,
  };

  const apply = () => {
    const k = code.trim().toUpperCase();
    if (!k) { setErr("Saisis un code"); return; }
    const discount = PROMOS[k];
    if (!discount) { setErr("Code promo invalide"); return; }
    setErr(null);
    setPromo({ code: k, discount });
    setCode("");
  };

  const handleRemove = (item: CartItem) => {
    const snapshot = { ...item };
    removeFromCart(item.id);
    toast("Article retiré", {
      description: item.name,
      action: { label: "Annuler", onClick: () => addToCart(snapshot) },
      duration: 5000,
    });
  };

  return (
    <aside className="rounded-3xl border border-border bg-card p-5 h-fit md:sticky md:top-20 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold">Ta commande</h3>
          <p className="text-xs text-muted-foreground">{safeCartItems.length} article{safeCartItems.length > 1 ? "s" : ""}</p>
        </div>
        <PaymentStatusBadge status={paymentStatus} method={method} />
      </div>
      {paymentStatus !== "idle" && reference && (
        <p className="mt-2 text-[11px] text-muted-foreground">Réf. paiement : <span className="font-mono">{reference}</span></p>
      )}
      <ul className="mt-4 space-y-3 text-sm">
        {safeCartItems.map((i) => (
          <li
            key={i.id}
            className="group relative flex items-center gap-3 rounded-2xl border border-border/60 bg-background p-2 pr-3 animate-fade-up"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
              {i.image ? (
                <SmartImage src={i.image} alt={i.name} ratio="1 / 1" width={56} height={56} wrapperClassName="!h-full" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl">🍽️</div>
              )}
              <button
                type="button"
                aria-label={`Retirer ${i.name}`}
                onClick={() => handleRemove(i)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-transform hover:scale-110 active:scale-95"
              >
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{i.name}</p>
              <p className="text-xs text-muted-foreground">{(i.qty * i.price).toLocaleString("fr-FR")} F</p>
              <div className="mt-1.5">
                <QuantityStepper
                  size="sm"
                  qty={i.qty}
                  onInc={() => setCartQty(i.id, i.qty + 1)}
                  onDec={() => setCartQty(i.id, i.qty - 1)}
                  ariaLabel={`Quantité ${i.name}`}
                />
              </div>
            </div>
          </li>
        ))}
        {safeCartItems.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Ton panier est vide. <Link to="/" className="font-semibold text-primary">Découvrir des restos</Link>
          </li>
        )}
      </ul>
      <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Sous-total</span><span>{subtotal.toLocaleString("fr-FR")} F</span></div>
        <div className="flex justify-between text-muted-foreground">
          <span>Livraison</span>
          {hasPass ? (
            <span className="font-bold text-gold">OFFERTE</span>
          ) : (
            <span>{delivery.toLocaleString("fr-FR")} F</span>
          )}
        </div>
        {promo && (
          <div className="-mx-2 flex items-center justify-between rounded-lg bg-[oklch(var(--promo)/0.1)] px-2 py-1.5 text-[oklch(var(--promo))]">
            <span className="flex items-center gap-1.5 font-semibold">
              <Check className="h-3.5 w-3.5" /> Promotion appliquée · {promo.code}
            </span>
            <span className="font-bold">−{promo.discount.toLocaleString("fr-FR")} F</span>
          </div>
        )}
        <div className="flex justify-between font-display text-xl font-extrabold"><span>Total</span><span className="text-gradient-gold">{total.toLocaleString("fr-FR")} F</span></div>
        {typeof taxes === "number" && taxes > 0 && (
          <div className="flex justify-between text-[11px] text-muted-foreground"><span>dont TVA incluse</span><span>{taxes.toLocaleString("fr-FR")} F</span></div>
        )}
      </div>
      {addressLine && (
        <p className="mt-3 rounded-xl border border-border bg-background/50 p-2 text-[11px] text-muted-foreground">
          📍 Livraison : <span className="text-foreground">{addressLine}</span>
        </p>
      )}
      {promo ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-[oklch(var(--promo)/0.4)] bg-[oklch(var(--promo)/0.08)] px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-[oklch(var(--promo))]"><Check className="h-3 w-3" /> {promo.code} appliqué</span>
          <button type="button" onClick={() => setPromo(null)} className="text-muted-foreground hover:text-foreground">Retirer</button>
        </div>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[oklch(var(--promo)/0.4)] bg-[oklch(var(--promo)/0.05)] py-2 text-xs font-semibold text-[oklch(var(--promo))] transition-colors hover:bg-[oklch(var(--promo)/0.1)]"
        >
          <Tag className="h-3 w-3" /> Ajouter un code promo
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              autoFocus
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
              placeholder="MBOA10"
              className="flex-1 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm uppercase tracking-wider outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={apply}
              className="rounded-xl bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground"
            >
              Appliquer
            </button>
          </div>
          {err && <p className="text-[11px] text-destructive">{err}</p>}
          <button type="button" onClick={() => { setOpen(false); setErr(null); setCode(""); }} className="text-[11px] text-muted-foreground hover:text-foreground">
            Annuler
          </button>
        </div>
      )}
    </aside>
  );
}

function OtpScreen({ method, phone, total, onSubmit, onSuccess, onBack }: {
  method: Method; phone: string; total: number;
  onSubmit: (code: string) => Promise<void>; onSuccess: () => void; onBack: () => void;
}) {
  const brand = method === "momo" ? "MTN MoMo" : "Orange Money";
  const accent = method === "momo" ? "from-yellow-400 to-amber-500" : "from-orange-500 to-rose-500";
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resend, setResend] = useState(30);

  useEffect(() => {
    if (resend <= 0) return;
    const t = setTimeout(() => setResend((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resend]);

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "").slice(-1);
    setError(null);
    setDigits((d) => {
      const next = [...d];
      next[i] = clean;
      return next;
    });
    if (clean) {
      const nextEl = document.getElementById(`otp-${i + 1}`) as HTMLInputElement | null;
      nextEl?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!txt) return;
    e.preventDefault();
    const arr = txt.split("");
    setDigits((d) => d.map((_, i) => arr[i] ?? ""));
  };

  const submit = async () => {
    const code = digits.join("");
    if (code.length < 6) { setError("Saisis les 6 chiffres reçus par SMS."); return; }
    setVerifying(true);
    setError(null);
    try {
      await onSubmit(code);
      onSuccess();
    } catch (e) {
      setVerifying(false);
      setError(e instanceof Error ? e.message : "Code OTP invalide.");
      setDigits(["", "", "", "", "", ""]);
      const first = document.getElementById("otp-0") as HTMLInputElement | null;
      first?.focus();
    }
  };

  return (
    <div className="rounded-3xl border border-primary/40 bg-surface/60 p-6 shadow-glow animate-fade-up">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} shadow-glow`}>
          <Smartphone className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold">Code OTP {brand}</h2>
          <p className="text-xs text-muted-foreground">SMS envoyé au +237 {phone}</p>
        </div>
      </div>

      <p className="mt-5 text-sm text-muted-foreground">
        Saisis le code à 6 chiffres reçu par SMS pour confirmer le paiement de
        <span className="ml-1 font-bold text-foreground">{total.toLocaleString("fr-FR")} FCFA</span>.
      </p>

      <div className="mt-5 flex justify-between gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) {
                const prev = document.getElementById(`otp-${i - 1}`) as HTMLInputElement | null;
                prev?.focus();
              }
            }}
            aria-label={`Chiffre ${i + 1}`}
            className="h-14 w-12 rounded-2xl border border-border bg-background text-center font-display text-2xl font-bold outline-none transition focus:border-primary focus:shadow-glow"
          />
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <button onClick={onBack} className="hover:text-foreground">← Modifier le numéro</button>
        {resend > 0 ? (
          <span>Renvoyer le code dans {resend}s</span>
        ) : (
          <button onClick={() => setResend(30)} className="font-semibold text-primary hover:underline">Renvoyer le SMS</button>
        )}
      </div>

      <button
        onClick={submit}
        disabled={verifying}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-4 font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-60"
      >
        {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {verifying ? "Vérification…" : "Confirmer le paiement"}
      </button>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3 text-primary" /> Code à usage unique · Expire après 5 minutes · Webhook officiel {brand}
      </div>
    </div>
  );
}

function ExtrasModal({ onSkip, onClose }: { onSkip: () => void; onClose: () => void }) {
  const cartHook2 = useCart();
  const cartItems = cartHook2?.items ?? [];
  const restoId = cartItems[0]?.restoId ?? "extras";

  const addExtra = (e: typeof UPSELL_ITEMS[number]) => {
    addToCart({
      id: e.id,
      dishId: e.id,
      restoId,
      name: e.name,
      price: e.price,
      qty: 1,
      image: e.image,
    });
    toast.success(`${e.name} ajouté`, { duration: 1500 });
  };

  const qtyOf = (id: string) => cartItems.find((i) => i.id === id)?.qty ?? 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suggestions complémentaires"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-background p-6 shadow-glow animate-fade-up sm:rounded-3xl"
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Avant de payer</span>
        </div>
        <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight">
          Ajouter une touche finale&nbsp;?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les clients ont aussi commandé ces petits plus.
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
          {UPSELL_ITEMS.map((e) => {
            const q = qtyOf(e.id);
            return (
              <li
                key={e.id}
                className="relative flex flex-col rounded-2xl border border-border bg-card p-3 shadow-card transition hover:border-primary/40"
              >
                <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-muted text-4xl">
                  <span aria-hidden>{e.emoji}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.price.toLocaleString("fr-FR")} F</p>
                <div className="mt-2 flex justify-end">
                  {q > 0 ? (
                    <QuantityStepper
                      size="sm"
                      qty={q}
                      onInc={() => setCartQty(e.id, q + 1)}
                      onDec={() => setCartQty(e.id, q - 1)}
                      ariaLabel={`Quantité ${e.name}`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => addExtra(e)}
                      aria-label={`Ajouter ${e.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-110 active:scale-95"
                    >
                      <Plus className="h-5 w-5" strokeWidth={2.8} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={onSkip}
          className="mt-6 w-full rounded-2xl bg-gradient-primary py-4 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.01]"
        >
          Continuer vers le paiement
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="mt-2 w-full rounded-xl py-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Non merci, je valide ma commande
        </button>
      </div>
    </div>
  );
}

function DeliveryTypeSelector({
  value,
  onChange,
}: {
  value: "priority" | "standard" | "scheduled";
  onChange: (t: "priority" | "standard" | "scheduled") => void;
}) {
  const options: {
    id: "priority" | "standard" | "scheduled";
    title: string;
    eta: string;
    sub?: string;
    extra?: string;
    icon?: string;
  }[] = [
    { id: "priority", title: "Priorité", eta: "20–25 min", sub: "Livré chez vous", extra: "+500 FCFA", icon: "⚡" },
    { id: "standard", title: "Standard", eta: "30–40 min" },
    { id: "scheduled", title: "Planifier", eta: "Au plus tôt" },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex flex-col items-start gap-1 rounded-2xl bg-white p-3 text-left transition-all ${
              active ? "border-2 border-black" : "border border-gray-200"
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-bold text-black">{o.title}</span>
              {o.icon && <span className="text-[14px]" aria-hidden>{o.icon}</span>}
            </div>
            <span className="text-[12px] text-gray-500">{o.eta}</span>
            {o.sub && <span className="text-[12px] font-medium text-emerald-600">{o.sub}</span>}
            {o.extra && <span className="text-[12px] text-gray-500">{o.extra}</span>}
          </button>
        );
      })}
    </div>
  );
}

