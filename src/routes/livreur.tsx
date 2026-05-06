import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Bike, Navigation, Wallet, TrendingUp, Clock, MapPin,
  Phone, Check, X, Star, Flame, Coins, ChevronRight, Power, Package,
} from "lucide-react";

export const Route = createFileRoute("/livreur")({
  component: Livreur,
  head: () => ({
    meta: [
      { title: "Espace Livreur · MboaEats Premium" },
      { name: "description", content: "Gérez votre disponibilité, vos courses et vos gains en temps réel sur MboaEats." },
    ],
  }),
});

type Tab = "courses" | "navigation" | "portefeuille";

function Livreur() {
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState<Tab>("courses");
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => p + 1), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <Header online={online} setOnline={setOnline} />
      <Stats online={online} />

      <nav className="sticky top-[64px] z-30 mx-auto flex max-w-5xl gap-2 px-4 py-3 md:px-8">
        {(["courses", "navigation", "portefeuille"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
              tab === t
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "border border-border bg-surface/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "courses" ? "Courses" : t === "navigation" ? "Navigation" : "Portefeuille"}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-5xl px-4 md:px-8">
        {tab === "courses" && <Courses online={online} pulse={pulse} />}
        {tab === "navigation" && <NavigationView />}
        {tab === "portefeuille" && <Portefeuille />}
      </main>
    </div>
  );
}

function Header({ online, setOnline }: { online: boolean; setOnline: (v: boolean) => void }) {
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
            <p className="text-xs text-muted-foreground leading-none">Junior · Moto bleue</p>
            <p className="text-xs flex items-center gap-1"><Star className="h-3 w-3 text-gold" /> 4.92 · Douala</p>
          </div>
        </div>
        <button
          onClick={() => setOnline(!online)}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
            online
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
              : "bg-surface text-muted-foreground border border-border"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
          {online ? "En ligne" : "Hors ligne"}
        </button>
      </div>
    </header>
  );
}

function Stats({ online }: { online: boolean }) {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-4 md:px-8">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-surface via-background to-surface p-5 shadow-card">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Gains du jour</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-gradient-primary">
              12 750 <span className="text-base font-semibold text-muted-foreground">FCFA</span>
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${online ? "bg-emerald-500/15 text-emerald-400" : "bg-surface text-muted-foreground"}`}>
            {online ? "Disponible" : "En pause"}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Mini icon={<Package className="h-4 w-4 text-primary" />} value="9" label="Courses" />
          <Mini icon={<Clock className="h-4 w-4 text-primary" />} value="5h12" label="En ligne" />
          <Mini icon={<Coins className="h-4 w-4 text-gold" />} value="2 100" label="Pourboires" />
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

const incoming = {
  resto: "Chez Mama Biya",
  pickup: "Akwa, rue Joffre",
  drop: "Bonanjo · Portail bleu derrière la pharmacie",
  payout: 1850,
  distance: "3.4 km",
  eta: "12 min",
};

function Courses({ online, pulse }: { online: boolean; pulse: number }) {
  const [accepted, setAccepted] = useState(false);
  return (
    <div className="space-y-4 py-4">
      {!online ? (
        <EmptyOffline />
      ) : !accepted ? (
        <div key={pulse} className="animate-fade-up rounded-3xl border border-primary/40 bg-surface/60 p-5 shadow-glow">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary uppercase tracking-wider">
              Nouvelle course
            </span>
            <span className="text-xs text-muted-foreground">expire dans 18s</span>
          </div>
          <h3 className="mt-3 font-display text-xl font-bold">{incoming.resto}</h3>

          <div className="mt-4 space-y-3 text-sm">
            <Row icon="🍽️" label="Récupérer" value={incoming.pickup} />
            <Row icon="📍" label="Livrer à" value={incoming.drop} />
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-background/40 p-3">
            <div className="text-xs text-muted-foreground">
              <p>{incoming.distance} · {incoming.eta}</p>
            </div>
            <p className="font-display text-2xl font-bold text-gradient-gold">
              {incoming.payout.toLocaleString("fr-FR")} <span className="text-xs font-semibold text-muted-foreground">FCFA</span>
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold hover:bg-surface">
              <X className="h-4 w-4" /> Refuser
            </button>
            <button
              onClick={() => setAccepted(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              <Check className="h-4 w-4" /> Accepter
            </button>
          </div>
        </div>
      ) : (
        <ActiveCourse onDone={() => setAccepted(false)} />
      )}

      <div>
        <h2 className="mt-6 font-display text-lg font-bold">Historique du jour</h2>
        <div className="mt-3 space-y-2">
          {[
            { id: "MBE-2840", resto: "Saveurs du Mboa", amount: 1450, tip: 200, time: "13:42" },
            { id: "MBE-2839", resto: "Le Wouri Grill", amount: 2300, tip: 500, time: "12:18" },
            { id: "MBE-2838", resto: "Suya King", amount: 1100, tip: 0, time: "11:05" },
          ].map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.resto}</p>
                  <p className="text-xs text-muted-foreground">#{r.id} · {r.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{r.amount.toLocaleString("fr-FR")} FCFA</p>
                {r.tip > 0 && <p className="text-xs text-gold">+{r.tip} pourboire</p>}
              </div>
            </div>
          ))}
        </div>
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
        Activez "En ligne" en haut à droite pour recevoir de nouvelles courses dans votre zone.
      </p>
    </div>
  );
}

function ActiveCourse({ onDone }: { onDone: () => void }) {
  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          Course en cours
        </span>
        <span className="text-xs text-muted-foreground">#MBE-2841</span>
      </div>
      <h3 className="mt-2 font-display text-xl font-bold">{incoming.resto}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{incoming.drop}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-3 text-sm font-semibold">
          <Phone className="h-4 w-4" /> Client
        </button>
        <button className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground">
          <Navigation className="h-4 w-4" /> Naviguer
        </button>
      </div>

      <button
        onClick={onDone}
        className="mt-3 w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/10 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
      >
        Marquer comme livré · +1 850 FCFA
      </button>
    </div>
  );
}

function NavigationView() {
  return (
    <div className="space-y-4 py-4">
      <div className="relative overflow-hidden rounded-3xl border border-border shadow-card aspect-[4/3]">
        <MapboxMock />
        <div className="absolute left-4 right-4 top-4 rounded-2xl glass p-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Prochaine étape</p>
          <p className="font-display text-lg font-bold">Tournez à droite sur Bd. de la Liberté</p>
          <p className="text-xs text-muted-foreground">Dans 280 m</p>
        </div>

        <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface/90 p-3 backdrop-blur">
          <NavStat label="ETA" value="12 min" />
          <NavStat label="Distance" value="3.4 km" />
          <NavStat label="Trafic" value="Fluide" tone="emerald" />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface/60 p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Note du client</p>
        <p className="mt-1 text-sm font-medium">"Maison à côté de l'école St-Michel, klaxonner devant le portail bleu, le chien est gentil."</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface/60 py-3 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" /> Recentrer
        </button>
        <button className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow">
          <Navigation className="h-4 w-4" /> Itinéraire alternatif
        </button>
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
      {/* Roads */}
      <path d="M0 220 L 400 180" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth="18" strokeLinecap="round" />
      <path d="M120 0 L 180 300" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth="14" strokeLinecap="round" />
      <path d="M40 60 Q 200 80 380 40" stroke="hsl(var(--muted-foreground) / 0.2)" strokeWidth="10" strokeLinecap="round" />
      {/* Route */}
      <path
        d="M60 250 Q 140 220 170 180 T 320 80"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Driver */}
      <g transform="translate(140, 215)">
        <circle r="22" fill="hsl(var(--primary) / 0.3)">
          <animate attributeName="r" values="18;28;18" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle r="13" fill="hsl(var(--primary))" stroke="white" strokeWidth="2" />
        <text textAnchor="middle" dy="5" fontSize="13">🛵</text>
      </g>
      {/* Destination */}
      <g transform="translate(320, 80)">
        <path d="M0,-18 L6,-4 L20,-2 L9,7 L13,21 L0,13 L-13,21 L-9,7 L-20,-2 L-6,-4 Z" fill="hsl(var(--gold))" />
      </g>
    </svg>
  );
}

function Portefeuille() {
  const balance = 47200;
  const week = useMemo(() => [
    { d: "Lun", v: 8200 }, { d: "Mar", v: 11400 }, { d: "Mer", v: 7600 },
    { d: "Jeu", v: 13800 }, { d: "Ven", v: 15200 }, { d: "Sam", v: 18900 }, { d: "Dim", v: 12750 },
  ], []);
  const max = Math.max(...week.map((d) => d.v));

  return (
    <div className="space-y-5 py-4">
      <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-surface via-background to-surface p-6 shadow-card">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Solde disponible</p>
          <p className="mt-2 font-display text-5xl font-extrabold text-gradient-gold">
            {balance.toLocaleString("fr-FR")} <span className="text-base font-semibold text-muted-foreground">FCFA</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]">
              <Wallet className="h-4 w-4" /> Retirer MTN MoMo
            </button>
            <button className="flex items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3 text-sm font-bold text-gold hover:bg-gold/20">
              Orange Money
            </button>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-3xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Cette semaine</p>
            <p className="mt-1 font-display text-2xl font-bold">87 850 FCFA</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-bold text-emerald-400">
            <TrendingUp className="h-3 w-3" /> +18%
          </span>
        </div>

        <div className="mt-5 flex h-40 items-end gap-2">
          {week.map((d, i) => {
            const h = (d.v / max) * 100;
            const isToday = i === week.length - 1;
            return (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-1.5">
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

      {/* Tips & breakdown */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-gold" />
            <p className="text-sm font-semibold">Pourboires (7j)</p>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-gradient-gold">9 350 FCFA</p>
          <p className="text-xs text-muted-foreground">Reçu de 14 clients · 100% à vous</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface/60 p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Bonus pluie</p>
          </div>
          <p className="mt-2 font-display text-2xl font-bold">+2 400 FCFA</p>
          <p className="text-xs text-muted-foreground">Actif jusqu'à 21h00 ce soir</p>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="font-display text-lg font-bold">Dernières transactions</h3>
        <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-surface/40">
          {[
            { label: "Course MBE-2840", amount: 1650, type: "in", time: "13:42" },
            { label: "Pourboire client", amount: 200, type: "tip", time: "13:42" },
            { label: "Retrait MTN MoMo", amount: -10000, type: "out", time: "Hier 19:00" },
            { label: "Course MBE-2839", amount: 2800, type: "in", time: "Hier 18:20" },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  t.type === "out" ? "bg-red-500/10 text-red-400" :
                  t.type === "tip" ? "bg-gold/10 text-gold" : "bg-primary/10 text-primary"
                }`}>
                  {t.type === "out" ? <Wallet className="h-4 w-4" /> : t.type === "tip" ? <Coins className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.time}</p>
                </div>
              </div>
              <p className={`text-sm font-bold ${t.amount < 0 ? "text-red-400" : ""}`}>
                {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("fr-FR")} FCFA
              </p>
            </div>
          ))}
        </div>
        <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border border-border bg-surface/40 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Voir tout l'historique <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
