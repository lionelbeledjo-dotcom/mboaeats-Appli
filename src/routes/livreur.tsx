import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bike, Navigation, Wallet, TrendingUp, Clock, MapPin,
  Check, X, Star, Coins, Power, Package, Loader2, ShoppingBag,
  Store, Send, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listAvailableMissions,
  listMyMissions,
  claimMission,
  updateMissionStatus,
  updateMyLocation,
  getMyEarnings,
  getMyDriverReviews,
  markArrivedAtRestaurant,
  requestPayout,
  getPayoutBalance,
} from "@/server/driver.functions";

export const Route = createFileRoute("/livreur")({
  component: LivreurGuarded,
  head: () => ({
    meta: [
      { title: "Espace Livreur · MboaEats" },
      { name: "description", content: "Gérez votre disponibilité, vos courses et vos gains en temps réel sur MboaEats." },
    ],
  }),
});

type Tab = "courses" | "navigation" | "portefeuille" | "evals";

type MissionRow = {
  id: string;
  reference: string;
  status: string;
  total: number;
  delivery_fee: number | null;
  eta_minutes: number | null;
  delivery_address: { line?: string; neighborhood?: string; city?: string; lat?: number | null; lng?: number | null } | null;
  created_at: string;
  ready_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
  restaurants?: { name: string; address: string | null; neighborhood: string | null; lat?: number | null; lng?: number | null } | null;
};

type Earnings = {
  earningsToday: number;
  earningsWeek: number;
  countToday: number;
  countWeek: number;
  week: { d: string; v: number }[];
};

type DriverReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reference: string;
  restaurant_name: string;
};

function Livreur() {
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [online, setOnline] = useState(false);
  const [tab, setTab] = useState<Tab>("courses");

  const [available, setAvailable] = useState<MissionRow[]>([]);
  const [mine, setMine] = useState<MissionRow[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [reviews, setReviews] = useState<{ list: DriverReview[]; avg: number | null; count: number }>({
    list: [], avg: null, count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [arrivedAt, setArrivedAt] = useState<Record<string, boolean>>({});
  const [incoming, setIncoming] = useState<MissionRow | null>(null);
  const seenAvailable = useRef<Set<string>>(new Set());

  const fetchAvailable = useServerFn(listAvailableMissions);
  const fetchMine = useServerFn(listMyMissions);
  const fetchEarnings = useServerFn(getMyEarnings);
  const fetchReviews = useServerFn(getMyDriverReviews);
  const sendLocation = useServerFn(updateMyLocation);
  const doClaim = useServerFn(claimMission);
  const doUpdate = useServerFn(updateMissionStatus);
  const doArrived = useServerFn(markArrivedAtRestaurant);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setAuthReady(true);
    });
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, m, e, r] = await Promise.all([
        fetchAvailable().catch(() => ({ missions: [] })),
        fetchMine().catch(() => ({ missions: [] })),
        fetchEarnings().catch(() => null),
        fetchReviews().catch(() => ({ reviews: [], avg: null, count: 0 })),
      ]);
      const newAvail = (a.missions ?? []) as MissionRow[];
      // Détecte une nouvelle mission entrante
      if (online) {
        const fresh = newAvail.find((mi) => !seenAvailable.current.has(mi.id));
        if (fresh) setIncoming(fresh);
      }
      newAvail.forEach((mi) => seenAvailable.current.add(mi.id));
      setAvailable(newAvail);
      setMine((m.missions ?? []) as MissionRow[]);
      if (e) setEarnings(e as Earnings);
      setReviews({ list: r.reviews ?? [], avg: r.avg ?? null, count: r.count ?? 0 });
    } finally {
      setLoading(false);
    }
  }, [fetchAvailable, fetchMine, fetchEarnings, fetchReviews, online]);

  // Restore arrived-at-restaurant per-mission flag
  useEffect(() => {
    try {
      const raw = localStorage.getItem("driver_arrived");
      if (raw) setArrivedAt(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("driver_arrived", JSON.stringify(arrivedAt)); } catch { /* noop */ }
  }, [arrivedAt]);

  useEffect(() => {
    if (signedIn) reload();
  }, [signedIn, reload]);

  // Realtime — toute mise à jour de commande ou nouvelle ready
  useEffect(() => {
    if (!signedIn) return;
    const ch = supabase
      .channel("driver-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [signedIn, reload]);

  // GPS toutes les 10s quand online
  const lastPos = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!signedIn || !online) return;
    let watchId: number | null = null;
    const push = async (pos: GeolocationPosition) => {
      lastPos.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      try {
        await sendLocation({
          data: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading ?? null,
            speed: pos.coords.speed ?? null,
            status: "available",
          },
        });
      } catch {
        /* silence */
      }
    };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(push, () => {
        // fallback Douala centre
        const fake = { coords: { latitude: 4.0511, longitude: 9.7679, heading: null, speed: null } } as unknown as GeolocationPosition;
        push(fake);
      }, { enableHighAccuracy: true });
      watchId = navigator.geolocation.watchPosition(push, () => {}, { enableHighAccuracy: true, maximumAge: 8000 });
    }
    const t = setInterval(() => {
      if (lastPos.current) {
        sendLocation({
          data: { lat: lastPos.current.lat, lng: lastPos.current.lng, status: "available" },
        }).catch(() => {});
      }
    }, 10_000);
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearInterval(t);
    };
  }, [online, signedIn, sendLocation]);

  // active mission = anything not finalised

  const currentMission = useMemo(
    () => mine.find((m) => !["delivered", "cancelled"].includes(m.status)) ?? null,
    [mine]
  );

  const handleClaim = async (id: string) => {
    try {
      await doClaim({ data: { order_id: id } });
      toast.success("Mission acceptée");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleStatus = async (id: string, status: "picked_up" | "delivering" | "delivered" | "cancelled") => {
    try {
      await doUpdate({ data: { order_id: id, status } });
      toast.success(
        status === "picked_up" ? "Commande récupérée" :
        status === "delivering" ? "En route" :
        status === "delivered" ? "Livrée 🎉" : "Annulée"
      );
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  const handleArrived = async (id: string) => {
    try {
      await doArrived({ data: { order_id: id } });
      setArrivedAt((s) => ({ ...s, [id]: true }));
      toast.success("Arrivée au restaurant signalée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

  // Toggle online — pousse le statut sur driver_locations
  const toggleOnline = async () => {
    const next = !online;
    setOnline(next);
    if (!next && lastPos.current) {
      try {
        await sendLocation({
          data: { lat: lastPos.current.lat, lng: lastPos.current.lng, status: "offline" },
        });
      } catch { /* noop */ }
    }
  };

  if (!authReady) return <Splash />;
  if (!signedIn) return <SignInGate />;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Header online={online} setOnline={toggleOnline} avgRating={reviews.avg} />
      <Stats online={online} earnings={earnings} />

      <nav className="sticky top-[64px] z-30 mx-auto flex max-w-5xl gap-2 px-4 py-3 md:px-8 overflow-x-auto">
        {(["courses", "navigation", "portefeuille", "evals"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 min-w-[110px] rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
              tab === t
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "border border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "courses" ? "Courses"
              : t === "navigation" ? "Navigation"
              : t === "portefeuille" ? "Portefeuille"
              : "Évaluations"}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl px-4 md:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : tab === "courses" ? (
          <Courses
            online={online}
            available={available}
            current={currentMission}
            mine={mine}
            onClaim={handleClaim}
            onStatus={handleStatus}
            onArrived={handleArrived}
            arrivedAt={arrivedAt}
          />
        ) : tab === "navigation" ? (
          <NavigationView
            mission={currentMission}
            onStatus={handleStatus}
            onArrived={handleArrived}
            arrived={!!(currentMission && arrivedAt[currentMission.id])}
          />
        ) : tab === "portefeuille" ? (
          <Portefeuille earnings={earnings} mine={mine} />
        ) : (
          <Evaluations reviews={reviews.list} avg={reviews.avg} count={reviews.count} />
        )}
      </main>

      {incoming && (
        <IncomingMissionAlert
          mission={incoming}
          onAccept={async () => {
            const id = incoming.id;
            setIncoming(null);
            await handleClaim(id);
          }}
          onDecline={() => setIncoming(null)}
        />
      )}
    </div>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}

function SignInGate() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <Bike className="h-10 w-10 text-primary" />
      <h1 className="font-display text-2xl font-bold">Espace Livreur</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Connectez-vous pour accéder à vos missions, votre GPS et vos gains en temps réel.
      </p>
      <Link
        to="/connexion"
        preload="intent"
        aria-label="Se connecter"
        className="inline-flex items-center gap-2 rounded-full bg-[#064E3B] px-6 py-3 text-base font-bold text-white border-2 border-white/95 shadow-[0_8px_24px_-8px_rgba(6,193,103,0.55)] transition-all duration-150 hover:border-[#D4AF37] active:scale-95 min-h-11 min-w-[44px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Bike className="h-5 w-5" strokeWidth={2.5} />
        Se connecter
      </Link>
    </div>
  );
}

function Header({
  online, setOnline, avgRating,
}: { online: boolean; setOnline: () => void; avgRating: number | null }) {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary">
            <Bike className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground leading-none">Livreur</p>
            <p className="text-xs flex items-center gap-1">
              <Star className="h-3 w-3 text-gold" /> {avgRating != null ? avgRating.toFixed(2) : "—"}
            </p>
          </div>
        </div>
        <button
          onClick={setOnline}
          aria-pressed={online}
          className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            online
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-glow"
              : "bg-surface text-muted-foreground border border-border"
          }`}
        >
          <span className={`relative flex h-2.5 w-2.5`}>
            {online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-muted-foreground"}`} />
          </span>
          {online ? "EN LIGNE" : "HORS LIGNE"}
        </button>
      </div>
    </header>
  );
}

function Stats({ online, earnings }: { online: boolean; earnings: Earnings | null }) {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-4 md:px-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-surface via-background to-surface p-5 shadow-card">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Gains du jour</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-gradient-primary">
              {(earnings?.earningsToday ?? 0).toLocaleString("fr-FR")}
              <span className="text-base font-semibold text-muted-foreground"> FCFA</span>
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${online ? "bg-emerald-500/15 text-emerald-400" : "bg-surface text-muted-foreground"}`}>
            {online ? "Disponible" : "En pause"}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Mini icon={<Package className="h-4 w-4 text-primary" />} value={String(earnings?.countToday ?? 0)} label="Courses" />
          <Mini icon={<Clock className="h-4 w-4 text-primary" />} value={`${earnings?.countWeek ?? 0}`} label="Sem." />
          <Mini icon={<Coins className="h-4 w-4 text-gold" />} value={(earnings?.earningsWeek ?? 0).toLocaleString("fr-FR")} label="FCFA 7j" />
        </div>
      </div>
    </section>
  );
}

function Mini({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/40 p-3">
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-surface">{icon}</div>
      <p className="mt-1 font-display font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function fmtAddr(a: MissionRow["delivery_address"]) {
  if (!a) return "—";
  return [a.line, a.neighborhood, a.city].filter(Boolean).join(" · ");
}

function Courses({
  online, available, current, mine, onClaim, onStatus, onArrived, arrivedAt,
}: {
  online: boolean;
  available: MissionRow[];
  current: MissionRow | null;
  mine: MissionRow[];
  onClaim: (id: string) => void;
  onStatus: (id: string, s: "picked_up" | "delivering" | "delivered" | "cancelled") => void;
  onArrived: (id: string) => void;
  arrivedAt: Record<string, boolean>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDeliveries = mine.filter(
    (m) => m.status === "delivered" && m.delivered_at && new Date(m.delivered_at) >= today,
  );
  const todayEarnings = todayDeliveries.reduce((s, m) => s + (m.delivery_fee ?? 0), 0);
  const history = mine.filter((m) => m.status === "delivered").slice(0, 8);

  return (
    <div className="space-y-4 py-4">
      {!online && !current && <EmptyOffline />}

      {current && (
        <ActiveCourse
          mission={current}
          onStatus={onStatus}
          onArrived={onArrived}
          arrived={!!arrivedAt[current.id]}
        />
      )}

      {online && !current && (
        <>
          <h2 className="font-display text-lg font-bold">Missions disponibles</h2>
          {available.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
              Aucune mission ouverte pour le moment. On vous notifie dès qu'une commande est prête.
            </div>
          ) : (
            <div className="space-y-3">
              {available.map((m) => (
                <MissionCard key={m.id} m={m} onClaim={onClaim} />
              ))}
            </div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="mt-6 font-display text-lg font-bold">Historique récent</h2>
          <div className="mt-3 space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface/40 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{r.restaurants?.name ?? "Restaurant"}</p>
                    <p className="text-xs text-muted-foreground">#{r.reference}</p>
                  </div>
                </div>
                <p className="text-sm font-bold">{(r.delivery_fee ?? 0).toLocaleString("fr-FR")} FCFA</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MissionCard({ m, onClaim }: { m: MissionRow; onClaim: (id: string) => void }) {
  return (
    <div className="animate-fade-up rounded-3xl border border-primary/40 bg-surface/60 p-5 shadow-glow">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">
          Nouvelle course
        </span>
        <span className="text-xs text-muted-foreground">#{m.reference}</span>
      </div>
      <h3 className="mt-3 font-display text-xl font-bold">{m.restaurants?.name ?? "Restaurant"}</h3>
      <div className="mt-4 space-y-3 text-sm">
        <Row icon="🍽️" label="Récupérer" value={[m.restaurants?.address, m.restaurants?.neighborhood].filter(Boolean).join(" · ") || "—"} />
        <Row icon="📍" label="Livrer à" value={fmtAddr(m.delivery_address)} />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-background/40 p-3">
        <div className="text-xs text-muted-foreground">
          <p>Statut: {m.status} · ETA {m.eta_minutes ?? "—"} min</p>
        </div>
        <p className="font-display text-2xl font-bold text-gradient-gold">
          {(m.delivery_fee ?? 0).toLocaleString("fr-FR")}
          <span className="text-xs font-semibold text-muted-foreground"> FCFA</span>
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold hover:bg-surface">
          <X className="h-4 w-4" /> Passer
        </button>
        <button
          onClick={() => onClaim(m.id)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
        >
          <Check className="h-4 w-4" /> Accepter
        </button>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function EmptyOffline() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
      <Power className="h-10 w-10 text-muted-foreground" />
      <h3 className="font-display text-xl font-bold">Vous êtes hors ligne</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Activez "En ligne" en haut à droite pour partager votre position GPS et recevoir les missions de votre zone.
      </p>
    </div>
  );
}

function ActiveCourse({
  mission, onStatus,
}: {
  mission: MissionRow;
  onStatus: (id: string, s: "picked_up" | "delivering" | "delivered" | "cancelled") => void;
}) {
  const next = nextStatus(mission.status);
  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          Course en cours
        </span>
        <span className="text-xs text-muted-foreground">#{mission.reference}</span>
      </div>
      <h3 className="mt-2 font-display text-xl font-bold">{mission.restaurants?.name ?? "Restaurant"}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{fmtAddr(mission.delivery_address)}</p>
      <p className="mt-1 text-xs text-muted-foreground">Étape : {labelStatus(mission.status)}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => onStatus(mission.id, "cancelled")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold"
        >
          <X className="h-4 w-4" /> Annuler
        </button>
        {next && (
          <button
            onClick={() => onStatus(mission.id, next.value)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
          >
            <Check className="h-4 w-4" /> {next.label}
          </button>
        )}
      </div>

      {mission.status === "delivering" && (
        <button
          onClick={() => onStatus(mission.id, "delivered")}
          className="mt-3 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
        >
          Marquer livré · +{(mission.delivery_fee ?? 0).toLocaleString("fr-FR")} FCFA
        </button>
      )}
    </div>
  );
}

function nextStatus(s: string): { value: "picked_up" | "delivering" | "delivered"; label: string } | null {
  if (["accepted", "preparing", "ready"].includes(s)) return { value: "picked_up", label: "Récupéré" };
  if (s === "picked_up") return { value: "delivering", label: "En route" };
  if (s === "delivering") return { value: "delivered", label: "Livré" };
  return null;
}
function labelStatus(s: string) {
  return ({
    accepted: "Acceptée par le resto",
    preparing: "En préparation",
    ready: "Prête à récupérer",
    picked_up: "Récupérée",
    delivering: "En route vers le client",
  } as Record<string, string>)[s] ?? s;
}

function NavigationView({
  mission, onStatus,
}: {
  mission: MissionRow | null;
  onStatus: (id: string, s: "picked_up" | "delivering" | "delivered" | "cancelled") => void;
}) {
  if (!mission) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-surface/30 px-6 py-16 text-center text-sm text-muted-foreground">
        Aucune course active. Acceptez une mission pour activer la navigation.
      </div>
    );
  }
  return (
    <div className="space-y-4 py-4">
      <div className="relative overflow-hidden rounded-3xl border border-border shadow-card aspect-[4/3]">
        <MapboxMock />
        <div className="absolute left-4 right-4 top-4 rounded-2xl glass p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Destination</p>
          <p className="font-display text-lg font-bold">{fmtAddr(mission.delivery_address)}</p>
          <p className="text-xs text-muted-foreground">Étape : {labelStatus(mission.status)}</p>
        </div>

        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface/90 p-3 backdrop-blur">
          <NavStat label="ETA" value={`${mission.eta_minutes ?? "—"} min`} />
          <NavStat label="Gain" value={`${(mission.delivery_fee ?? 0).toLocaleString("fr-FR")}`} />
          <NavStat label="Statut" value={mission.status} tone="emerald" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onStatus(mission.id, "delivering")}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/60 py-3 text-sm font-semibold"
        >
          <MapPin className="h-4 w-4 text-primary" /> En route
        </button>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fmtAddr(mission.delivery_address))}`}
          target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
        >
          <Navigation className="h-4 w-4" /> Ouvrir GPS
        </a>
      </div>
    </div>
  );
}

function NavStat({ label, value, tone }: { label: string; value: string; tone?: "emerald" }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${tone === "emerald" ? "text-emerald-400" : ""}`}>{value}</p>
    </div>
  );
}

function MapboxMock() {
  return (
    <svg viewBox="0 0 400 300" className="h-full w-full bg-[#0e1428]">
      <defs>
        <pattern id="g" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="hsl(var(--border))" strokeOpacity="0.3" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="400" height="300" fill="url(#g)" />
      <path d="M0 220 L 400 180" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth="18" strokeLinecap="round" />
      <path d="M120 0 L 180 300" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth="14" strokeLinecap="round" />
      <path d="M60 250 Q 140 220 170 180 T 320 80" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" fill="none" />
      <g transform="translate(140, 215)">
        <circle r="22" fill="hsl(var(--primary) / 0.3)">
          <animate attributeName="r" values="18;28;18" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle r="13" fill="hsl(var(--primary))" stroke="white" strokeWidth="2" />
        <text textAnchor="middle" dy="5" fontSize="13">🛵</text>
      </g>
    </svg>
  );
}

function Portefeuille({ earnings, mine }: { earnings: Earnings | null; mine: MissionRow[] }) {
  const week = earnings?.week ?? [];
  const max = Math.max(1, ...week.map((d) => d.v));
  const balance = earnings?.earningsWeek ?? 0;
  const recent = mine.filter((m) => m.status === "delivered").slice(0, 6);

  return (
    <div className="space-y-5 py-4">
      <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-surface via-background to-surface p-6 shadow-card">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Gains 7 jours</p>
          <p className="mt-2 font-display text-5xl font-extrabold text-gradient-gold">
            {balance.toLocaleString("fr-FR")}
            <span className="text-base font-semibold text-muted-foreground"> FCFA</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow">
              <Wallet className="h-4 w-4" /> Retirer MTN MoMo
            </button>
            <button className="flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3 text-sm font-bold text-gold hover:bg-gold/20">
              Orange Money
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Cette semaine</p>
            <p className="mt-1 font-display text-2xl font-bold">{balance.toLocaleString("fr-FR")} FCFA</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> {earnings?.countWeek ?? 0} courses
          </span>
        </div>

        <div className="mt-5 flex h-40 items-end gap-2">
          {week.map((d, i) => {
            const h = (d.v / max) * 100;
            const isToday = i === week.length - 1;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-lg ${isToday ? "bg-gradient-to-t from-primary to-gold shadow-glow" : "bg-primary/30"}`}
                    style={{ height: `${h}%` }}
                  />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.d}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Dernières courses</h3>
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface/40">
          {recent.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Pas encore de courses livrées.</p>
          )}
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.restaurants?.name ?? "Course"}</p>
                  <p className="text-xs text-muted-foreground">#{r.reference}</p>
                </div>
              </div>
              <p className="text-sm font-bold">+{(r.delivery_fee ?? 0).toLocaleString("fr-FR")} FCFA</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { RoleGuard } from "@/components/RoleGuard";
function LivreurGuarded() {
  return (
    <RoleGuard
      role="livreur"
      title="Espace livreur"
      description="Cet espace est réservé aux livreurs partenaires MboaEats."
      ctaTo="/devenir-livreur"
      ctaLabel="Devenir livreur"
    >
      <Livreur />
    </RoleGuard>
  );
}
