import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, MapPin, Star, Clock, Flame, Users, Sparkles,
  Smartphone, ShieldCheck, Zap, ArrowRight, ChevronRight,
  Utensils, Bike, Crown, Plus, Brain,
} from "lucide-react";

import heroDish from "@/assets/hero-dish.jpg";
import dishPouletDg from "@/assets/dish-poulet-dg.jpg";
import dishEru from "@/assets/dish-eru.jpg";
import dishPoisson from "@/assets/dish-poisson.jpg";
import dishSuya from "@/assets/dish-suya.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

const cities = ["Douala", "Yaoundé", "Bafoussam"];

const categories = [
  { label: "Ndolé", icon: "🥬" },
  { label: "Poulet DG", icon: "🍗" },
  { label: "Eru", icon: "🍲" },
  { label: "Poisson", icon: "🐟" },
  { label: "Suya", icon: "🍢" },
  { label: "Beignets", icon: "🥯" },
  { label: "Jus naturels", icon: "🥤" },
];

const restaurants = [
  {
    name: "Chez Mama Biya",
    tag: "Cuisine traditionnelle",
    rating: 4.9,
    eta: "20-25 min",
    price: "2 500 FCFA",
    img: dishPouletDg,
    badge: "Top resto",
  },
  {
    name: "Saveurs du Mboa",
    tag: "Spécialités Eru & Fufu",
    rating: 4.8,
    eta: "25-30 min",
    price: "1 800 FCFA",
    img: dishEru,
    badge: "-15% ce soir",
  },
  {
    name: "Le Wouri Grill",
    tag: "Poisson braisé premium",
    rating: 4.9,
    eta: "30-35 min",
    price: "3 200 FCFA",
    img: dishPoisson,
    badge: "Nouveau",
  },
  {
    name: "Suya King",
    tag: "Brochettes & grillades",
    rating: 4.7,
    eta: "15-20 min",
    price: "1 500 FCFA",
    img: dishSuya,
    badge: "Express",
  },
];

function Index() {
  const [city, setCity] = useState("Douala");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header city={city} setCity={setCity} />
      <Hero />
      <Categories />
      <Restaurants />
      <ExclusiveFeatures />
      <FeatureTablee />
      <Loyalty />
      <DownloadCta />
      <Footer />
    </div>
  );
}

function Header({ city, setCity }: { city: string; setCity: (c: string) => void }) {
  return (
    <header className="sticky top-0 z-50 glass">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            Mboa<span className="text-gradient-primary">Eats</span>
          </span>
        </a>

        <div className="hidden items-center gap-1 rounded-full border border-border bg-surface/60 px-3 py-1.5 md:flex">
          <MapPin className="h-4 w-4 text-primary" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none"
            aria-label="Choisir une ville"
          >
            {cities.map((c) => <option key={c} className="bg-surface">{c}</option>)}
          </select>
        </div>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
          <a href="#restos" className="hover:text-foreground transition">Restaurants</a>
          <Link to="/tablee" className="hover:text-foreground transition">Tablée</Link>
          <Link to="/mboa-ai" className="hover:text-foreground transition">Mboa AI</Link>
          <Link to="/adresses" className="hover:text-foreground transition">Adresses</Link>
          <a href="#fidelite" className="hover:text-foreground transition">Fidélité</a>
        </nav>

        <button className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105">
          Connexion
        </button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero noise">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-2 md:items-center md:px-8 md:py-24">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Nouveau au Cameroun · Livraison en 25 min
          </div>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl lg:text-7xl">
            Le goût du{" "}
            <span className="text-gradient-primary">Mboa</span>,
            <br />
            livré chaud.
          </h1>

          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            Commandez vos plats favoris à Douala, Yaoundé ou Bafoussam.
            Paiement <span className="font-semibold text-foreground">MTN MoMo</span>,{" "}
            <span className="font-semibold text-foreground">Orange Money</span> ou cash.
            Suivi en temps réel. Et le mode <span className="text-gradient-gold font-semibold">Tablée</span> pour partager l'addition entre amis.
          </p>

          <form className="mt-8 flex w-full max-w-lg items-center gap-2 rounded-2xl border border-border bg-surface/80 p-2 shadow-card backdrop-blur">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Plat, restaurant, quartier…"
                className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Trouver
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <Stat icon={<Bike className="h-4 w-4 text-primary" />} value="25 min" label="Livraison moyenne" />
            <Stat icon={<Star className="h-4 w-4 text-gold" />} value="4.9/5" label="Note clients" />
            <Stat icon={<Utensils className="h-4 w-4 text-primary" />} value="200+" label="Restos partenaires" />
          </div>
        </div>

        <div className="relative animate-scale-in">
          <div className="absolute -inset-8 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[2.5rem] border border-border shadow-glow">
            <img
              src={heroDish}
              alt="Poisson braisé camerounais avec accompagnement, vue plongeante"
              width={1280}
              height={1280}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
          </div>

          {/* Floating cards */}
          <div className="glass animate-float absolute -left-2 top-10 hidden rounded-2xl p-3 shadow-card sm:flex sm:items-center sm:gap-3 md:-left-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-gold">
              <Crown className="h-5 w-5 text-gold-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mboa Gold</p>
              <p className="text-sm font-semibold">+250 points gagnés</p>
            </div>
          </div>

          <div className="glass animate-float absolute -right-2 bottom-10 hidden rounded-2xl p-3 shadow-card sm:flex sm:items-center sm:gap-3 md:-right-6" style={{ animationDelay: "1s" }}>
            <div className="relative flex h-10 w-10 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-pulse-ring" />
              <span className="relative flex h-3 w-3 rounded-full bg-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Livreur en route</p>
              <p className="text-sm font-semibold">Arrive dans 7 min</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-elevated">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{value}</p>
        <p className="text-xs">{label}</p>
      </div>
    </div>
  );
}

function Categories() {
  return (
    <section className="border-y border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Explorer par catégorie
          </h2>
          <a href="#restos" className="hidden items-center gap-1 text-sm text-primary hover:gap-2 transition-all md:inline-flex">
            Tout voir <ChevronRight className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((c) => (
            <button
              key={c.label}
              className="group flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium transition hover:border-primary/60 hover:bg-surface-elevated hover:-translate-y-0.5"
            >
              <span className="text-lg">{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Restaurants() {
  return (
    <section id="restos" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">À la une</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Restaurants ouverts maintenant</h2>
        </div>
        <a href="#" className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:inline-flex">
          Voir tous <ChevronRight className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {restaurants.map((r, i) => (
          <article
            key={r.name}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-glow animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={r.img}
                alt={r.name}
                width={768}
                height={576}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <span className="absolute left-3 top-3 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold backdrop-blur">
                {r.badge}
              </span>
              <button
                aria-label="Ajouter au panier"
                className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow opacity-0 transition-all group-hover:opacity-100 group-hover:translate-y-0 translate-y-2"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold">{r.name}</h3>
                  <p className="text-xs text-muted-foreground">{r.tag}</p>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-gold/10 px-1.5 py-0.5 text-xs font-semibold text-gold">
                  <Star className="h-3 w-3 fill-current" />
                  {r.rating}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {r.eta}
                </span>
                <span className="font-semibold text-foreground">dès {r.price}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExclusiveFeatures() {
  const features = [
    {
      to: "/tablee" as const,
      tag: "Innovation majeure",
      title: "Mode Tablée",
      desc: "Commande groupée par lien WhatsApp. Chacun choisit son plat, chacun paie sa part en Mobile Money.",
      icon: <Users className="h-6 w-6" />,
      gradient: "from-orange-500/20 to-pink-500/20",
    },
    {
      to: "/mboa-ai" as const,
      tag: "Beta · IA locale",
      title: "Mboa AI",
      desc: "Recommandations selon l'heure, la météo de ta ville, ton budget et ton humeur.",
      icon: <Brain className="h-6 w-6" />,
      gradient: "from-amber-400/20 to-orange-500/20",
    },
    {
      to: "/adresses" as const,
      tag: "Adapté au Cameroun",
      title: "Adresses flexibles",
      desc: "PIN sur carte + point de repère libre. \"Portail bleu derrière la pharmacie\", on connaît.",
      icon: <MapPin className="h-6 w-6" />,
      gradient: "from-fuchsia-500/20 to-purple-500/20",
    },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Le « plus » MboaEats</p>
        <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          Trois fonctionnalités <span className="text-gradient-gold">exclusives</span>
        </h2>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {features.map((f, i) => (
          <Link
            key={f.title}
            to={f.to}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${f.gradient} blur-2xl transition-opacity opacity-50 group-hover:opacity-100`} />
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
                {f.icon}
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-gold">{f.tag}</p>
              <h3 className="mt-1 font-display text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                Découvrir <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FeatureTablee() {
  return (
    <section id="tablee" className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-border bg-surface p-8 shadow-card md:p-14">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />

          <div className="relative grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Users className="h-3.5 w-3.5" />
                Exclusivité MboaEats
              </div>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl md:text-5xl">
                Le mode <span className="text-gradient-primary">Tablée</span>.<br />
                Commandez à plusieurs, payez chacun votre part.
              </h2>
              <p className="mt-4 max-w-lg text-muted-foreground">
                Créez une tablée, invitez vos amis par lien WhatsApp, chacun ajoute ses plats
                et paie sa part en MoMo. Fini les calculs au moment de l'addition.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  { icon: <Zap className="h-4 w-4" />, text: "Invitation par lien" },
                  { icon: <ShieldCheck className="h-4 w-4" />, text: "Paiement réparti auto" },
                  { icon: <Users className="h-4 w-4" />, text: "Jusqu'à 12 invités" },
                  { icon: <Smartphone className="h-4 w-4" />, text: "Notifications live" },
                ].map((f) => (
                  <div key={f.text} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                      {f.icon}
                    </div>
                    <span className="text-sm font-medium">{f.text}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/tablee"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105"
              >
                Ouvrir une tablée <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="relative">
              <div className="glass mx-auto max-w-sm rounded-3xl p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tablée chez Mama Biya</p>
                    <p className="font-semibold">Anniv' de Sandra · 5 invités</p>
                  </div>
                  <div className="rounded-full bg-gold/20 px-2.5 py-1 text-xs font-semibold text-gold">Live</div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { name: "Sandra", item: "Poulet DG", price: "3 500", color: "from-orange-500 to-pink-500" },
                    { name: "Eric", item: "Poisson braisé", price: "4 200", color: "from-amber-400 to-orange-500" },
                    { name: "Aïcha", item: "Ndolé + plantain", price: "2 800", color: "from-fuchsia-500 to-purple-500" },
                    { name: "Toi", item: "Suya x2", price: "3 000", color: "from-emerald-400 to-teal-500" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${p.color} text-xs font-bold text-white`}>
                        {p.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.item}</p>
                      </div>
                      <p className="text-sm font-semibold">{p.price} F</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-primary p-4 text-primary-foreground shadow-glow">
                  <div>
                    <p className="text-xs opacity-90">Ta part</p>
                    <p className="font-display text-xl font-bold">3 000 FCFA</p>
                  </div>
                  <button className="rounded-full bg-background/20 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-background/30">
                    Payer MoMo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Loyalty() {
  return (
    <section id="fidelite" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
      <div className="grid gap-10 md:grid-cols-3">
        <div className="md:col-span-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold">Mboa Gold</p>
          <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
            Plus tu commandes, plus on te <span className="text-gradient-gold">gâte</span>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Gagne des points à chaque commande, débloque des paliers, profite de
            livraisons gratuites et de plats offerts par tes restos préférés.
          </p>
        </div>

        <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
          {[
            { tier: "Bronze", points: "0 pts", perk: "5% sur 1ère cmd", icon: "🥉" },
            { tier: "Silver", points: "500 pts", perk: "Livraison offerte 2×/sem", icon: "🥈" },
            { tier: "Gold", points: "2 000 pts", perk: "Plat offert chaque mois", icon: "👑" },
          ].map((t, i) => (
            <div
              key={t.tier}
              className={`relative rounded-3xl border border-border p-6 shadow-card transition hover:-translate-y-1 ${
                i === 2 ? "bg-gradient-gold text-gold-foreground shadow-gold" : "bg-card"
              }`}
            >
              <div className="text-3xl">{t.icon}</div>
              <h3 className="mt-3 font-display text-xl font-bold">{t.tier}</h3>
              <p className={`text-sm ${i === 2 ? "text-gold-foreground/80" : "text-muted-foreground"}`}>{t.points}</p>
              <p className="mt-4 text-sm font-medium">{t.perk}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadCta() {
  return (
    <section id="app" className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-primary p-10 shadow-glow md:p-16">
        <div className="absolute inset-0 noise opacity-10" />
        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-primary-foreground sm:text-4xl md:text-5xl">
              Télécharge MboaEats.<br />
              Mange mieux. Plus vite.
            </h2>
            <p className="mt-4 max-w-md text-primary-foreground/90">
              Disponible sur App Store, Google Play et en web app installable.
              Optimisée pour les réseaux 3G/4G du Cameroun.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#" className="flex items-center gap-3 rounded-2xl bg-background px-5 py-3 text-foreground shadow-card transition-transform hover:scale-105">
                <Smartphone className="h-6 w-6" />
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Télécharger sur</p>
                  <p className="text-sm font-bold">App Store</p>
                </div>
              </a>
              <a href="#" className="flex items-center gap-3 rounded-2xl bg-background px-5 py-3 text-foreground shadow-card transition-transform hover:scale-105">
                <Smartphone className="h-6 w-6" />
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wider opacity-70">Disponible sur</p>
                  <p className="text-sm font-bold">Google Play</p>
                </div>
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-background/20 blur-2xl" />
              <div className="glass relative flex w-64 flex-col gap-3 rounded-[1.5rem] p-4">
                <div className="skeleton h-3 w-24 rounded-full" />
                <div className="skeleton h-32 w-full rounded-xl" />
                <div className="skeleton h-3 w-3/4 rounded-full" />
                <div className="skeleton h-3 w-1/2 rounded-full" />
                <div className="mt-2 flex items-center gap-2">
                  <div className="skeleton h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-2.5 w-full rounded-full" />
                    <div className="skeleton h-2.5 w-2/3 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4 md:px-8">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">MboaEats</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Le goût du Cameroun, livré chaud — partout, en moins de 30 min.
          </p>
        </div>
        {[
          { title: "Produit", links: ["Restaurants", "Tablée", "Mboa Gold", "Mboa AI"] },
          { title: "Entreprise", links: ["À propos", "Carrières", "Presse", "Partenaires"] },
          { title: "Aide", links: ["Centre d'aide", "Devenir livreur", "Devenir resto", "Contact"] },
        ].map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {col.links.map((l) => (
                <li key={l}><a href="#" className="hover:text-foreground transition">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground md:flex-row md:px-8">
          <p>© 2026 MboaEats Cameroun · Fait avec ❤️ à Douala</p>
          <p>MTN MoMo · Orange Money · Visa · Cash</p>
        </div>
      </div>
    </footer>
  );
}
