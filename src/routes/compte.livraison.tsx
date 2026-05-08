import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Bike, ChefHat, PackageCheck, Phone, MessageCircle, Navigation } from "lucide-react";

export const Route = createFileRoute("/compte/livraison")({
  component: LivraisonPage,
  head: () => ({
    meta: [
      { title: "Suivi de livraison · MboaEats" },
      { name: "description", content: "Suivi en temps réel de votre commande MboaEats." },
    ],
  }),
});

const STEPS = [
  { key: "prep", label: "Préparation", icon: ChefHat },
  { key: "route", label: "En route", icon: Bike },
  { key: "delivered", label: "Livré", icon: PackageCheck },
] as const;

function LivraisonPage() {
  // Étape simulée : "En route" (index 1)
  const currentStep = 1;
  const driver = {
    name: "Yannick Mbarga",
    phone: "+237 6 99 12 34 56",
    plate: "LT-237-DA",
    eta: "8 min",
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/aide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <span className="font-display font-bold">Suivi livraison</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-8">
        {/* Carte simulée */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface/60 shadow-card">
          <div
            className="relative h-64 w-full md:h-80"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, oklch(0.35 0.05 250 / 0.6) 0, transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.4 0.06 200 / 0.5) 0, transparent 45%), repeating-linear-gradient(0deg, transparent 0, transparent 24px, oklch(1 0 0 / 0.04) 24px, oklch(1 0 0 / 0.04) 25px), repeating-linear-gradient(90deg, transparent 0, transparent 24px, oklch(1 0 0 / 0.04) 24px, oklch(1 0 0 / 0.04) 25px)",
              backgroundColor: "oklch(0.18 0.02 240)",
            }}
          >
            {/* Itinéraire simulé */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 320" preserveAspectRatio="none">
              <path
                d="M 60 260 Q 150 220 200 180 T 340 70"
                fill="none"
                stroke="oklch(0.78 0.18 60)"
                strokeWidth="3"
                strokeDasharray="6 6"
                strokeLinecap="round"
              />
            </svg>

            {/* Restaurant (départ) */}
            <div className="absolute left-[12%] top-[78%] -translate-y-1/2 -translate-x-1/2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-500/20">
                <ChefHat className="h-4 w-4" />
              </div>
            </div>

            {/* Livreur (en cours) */}
            <div className="absolute left-[50%] top-[55%] -translate-y-1/2 -translate-x-1/2 animate-pulse">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow ring-4 ring-primary/30">
                <Bike className="h-5 w-5" />
              </div>
            </div>

            {/* Destination */}
            <div className="absolute left-[85%] top-[20%] -translate-y-1/2 -translate-x-1/2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-lg ring-4 ring-gold/20">
                <MapPin className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border p-4">
            <div>
              <p className="text-xs text-muted-foreground">Arrivée estimée</p>
              <p className="font-display text-2xl font-extrabold text-gradient-primary">{driver.eta}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Navigation className="h-3.5 w-3.5 text-primary" /> Bonapriso → Akwa, Douala
            </div>
          </div>
        </section>

        {/* Progression */}
        <section className="rounded-3xl border border-border bg-surface/60 p-5">
          <h2 className="font-display text-lg font-bold">Progression</h2>
          <div className="relative mt-5">
            <div className="absolute left-5 right-5 top-5 h-1 rounded-full bg-border" />
            <div
              className="absolute left-5 top-5 h-1 rounded-full bg-gradient-primary transition-all"
              style={{ width: `calc(${(currentStep / (STEPS.length - 1)) * 100}% - ${(currentStep / (STEPS.length - 1)) * 40}px)` }}
            />
            <div className="relative flex items-start justify-between">
              {STEPS.map((s, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex flex-1 flex-col items-center text-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        done
                          ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                          : "border-border bg-background text-muted-foreground"
                      } ${active ? "animate-pulse" : ""}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Livreur */}
        <section className="rounded-3xl border border-border bg-surface/60 p-5">
          <h2 className="font-display text-lg font-bold">Votre livreur</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-gold-foreground font-display text-xl font-bold">
              {driver.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
            <div className="flex-1">
              <p className="font-semibold">{driver.name}</p>
              <p className="text-xs text-muted-foreground">Moto · {driver.plate}</p>
            </div>
            <a
              href={`tel:${driver.phone.replace(/\s/g, "")}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
              aria-label="Appeler le livreur"
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/${driver.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white"
              aria-label="WhatsApp livreur"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
