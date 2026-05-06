import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, Phone, MessageCircle, MapPin, Check, Clock, Flame, ArrowLeft, Star } from "lucide-react";

export const Route = createFileRoute("/suivi")({
  component: Suivi,
  head: () => ({
    meta: [
      { title: "Suivi en temps réel · MboaEats" },
      { name: "description", content: "Suivez votre livreur en temps réel sur la carte avec MboaEats." },
    ],
  }),
});

const steps = [
  { label: "Commande reçue", time: "18:42" },
  { label: "En préparation", time: "18:45" },
  { label: "Livreur en route", time: "18:58" },
  { label: "Livré", time: "" },
];

function Suivi() {
  const [progress, setProgress] = useState(0.62);
  const [active, setActive] = useState(2);
  const eta = Math.max(1, Math.round(18 * (1 - progress)));

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        const n = Math.min(1, p + 0.012);
        if (n > 0.95) setActive(3);
        return n;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
          <span className="font-display font-bold">Suivi <span className="text-gradient-primary">live</span></span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 md:grid-cols-[1.2fr_1fr] md:px-8">
        {/* Map */}
        <section className="relative overflow-hidden rounded-3xl border border-border shadow-card aspect-[4/3] md:aspect-auto md:min-h-[480px]">
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full bg-surface">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0V32" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="route" x1="0" x2="1">
                <stop offset="0" stopColor="hsl(var(--primary))" />
                <stop offset="1" stopColor="hsl(var(--gold))" />
              </linearGradient>
            </defs>
            <rect width="400" height="400" fill="url(#grid)" />
            {/* Roads */}
            <path d="M20 320 Q 120 280 200 220 T 360 80" fill="none" stroke="hsl(var(--muted-foreground))" strokeOpacity="0.25" strokeWidth="14" strokeLinecap="round" />
            <path d="M20 320 Q 120 280 200 220 T 360 80" fill="none" stroke="url(#route)" strokeWidth="4" strokeDasharray="700" strokeDashoffset={700 * (1 - progress)} strokeLinecap="round" />
            {/* Restaurant */}
            <g transform="translate(20,320)">
              <circle r="14" fill="hsl(var(--surface))" stroke="hsl(var(--primary))" strokeWidth="2" />
              <text textAnchor="middle" dy="5" fontSize="14">🍽️</text>
            </g>
            {/* Home */}
            <g transform="translate(360,80)">
              <circle r="14" fill="hsl(var(--surface))" stroke="hsl(var(--gold))" strokeWidth="2" />
              <text textAnchor="middle" dy="5" fontSize="14">🏠</text>
            </g>
            {/* Driver */}
            <DriverMarker progress={progress} />
          </svg>

          <div className="absolute left-4 top-4 rounded-2xl glass px-4 py-2">
            <p className="text-xs text-muted-foreground">Arrivée estimée</p>
            <p className="font-display text-xl font-bold text-gradient-primary">{eta} min</p>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 p-3 shadow-card backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary">
                <Bike className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Junior · Livreur</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3 text-gold" /> 4.9 · Moto bleue</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background hover:bg-surface">
                <Phone className="h-4 w-4" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary">
                <MessageCircle className="h-4 w-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="rounded-3xl border border-border bg-surface/60 p-5 shadow-card">
          <h2 className="font-display text-lg font-bold">Votre commande</h2>
          <p className="text-sm text-muted-foreground">#MBE-2841 · Chez Mama Biya</p>

          <ul className="mt-6 space-y-4">
            {steps.map((s, i) => {
              const done = i <= active;
              const current = i === active;
              return (
                <li key={s.label} className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border ${done ? "bg-gradient-primary border-transparent shadow-glow" : "border-border bg-background"}`}>
                    {done ? <Check className="h-4 w-4 text-primary-foreground" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${current ? "text-gradient-primary" : ""}`}>{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.time || "À venir"}</p>
                  </div>
                  {current && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">En cours</span>}
                </li>
              );
            })}
          </ul>

          <div className="mt-6 rounded-2xl border border-border bg-background/50 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Akwa, Douala</p>
            <p className="mt-1 text-xs text-muted-foreground">Portail bleu derrière la pharmacie Bonanjo</p>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-gold/10 border border-gold/30 p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold">+150 Mboa Points à la livraison</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function DriverMarker({ progress }: { progress: number }) {
  // approximate point along the curve
  const t = progress;
  // Bezier-ish interp for the path
  const x = 20 + (360 - 20) * t;
  const y = 320 - (320 - 80) * Math.pow(t, 1.2);
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r="22" fill="hsl(var(--primary) / 0.25)">
        <animate attributeName="r" values="18;28;18" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle r="14" fill="hsl(var(--primary))" stroke="white" strokeWidth="2" />
      <text textAnchor="middle" dy="5" fontSize="14">🛵</text>
    </g>
  );
}
