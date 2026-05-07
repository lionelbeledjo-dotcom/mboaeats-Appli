import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Search, MapPin, Star, Clock, Flame, Bell, ChevronRight, Plus, Users, ArrowRight,
} from "lucide-react";

import { restaurants as realRestaurants, getRestaurant } from "@/data/restaurants";
import MboaExpressAssistant from "@/components/MboaExpressAssistant";
import QuickLogin from "@/components/QuickLogin";

// Pre-cache decoded images so menu pages render instantly on hover/intent.
const imageCache = new Set<string>();
function prefetchRestaurantImages(restoId: string) {
  const r = getRestaurant(restoId);
  if (!r) return;
  const urls = [r.cover, ...r.categories.flatMap((c) => c.dishes.map((d) => d.image))];
  for (const url of urls) {
    if (imageCache.has(url)) continue;
    imageCache.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MboaEats — Vos plats camerounais livrés à Douala, Yaoundé & Bafoussam" },
      { name: "description", content: "Commandez Ndolé, Poulet DG, Soya et plus encore. Livraison rapide, paiement Mobile Money, mode Tablée pour partager entre amis." },
      { property: "og:title", content: "MboaEats — Le goût du Mboa, livré chez vous" },
      { property: "og:description", content: "Restaurants triés sur le volet à Douala, Yaoundé et Bafoussam. Paiement Mobile Money sécurisé." },
    ],
  }),
  component: Index,
});

const cities = ["Douala", "Yaoundé", "Bafoussam"];

const categories = [
  { slug: "ndole", label: "Ndolé", icon: "🥬" },
  { slug: "poulet-dg", label: "Poulet DG", icon: "🍗" },
  { slug: "poisson", label: "Poisson braisé", icon: "🐟" },
  { slug: "eru", label: "Eru", icon: "🍲" },
  { slug: "suya", label: "Suya", icon: "🍢" },
  { slug: "beignets", label: "Beignets", icon: "🥯" },
  { slug: "jus", label: "Jus naturels", icon: "🥤" },
];

const restaurants = realRestaurants.map((r) => {
  const minPrice = Math.min(
    ...r.categories.flatMap((c) => c.dishes.map((d) => d.price))
  );
  return {
    slug: r.id,
    name: r.name,
    tag: r.tagline.split("—")[0].trim(),
    rating: r.rating,
    eta: r.eta,
    price: `${minPrice.toLocaleString("fr-FR")} FCFA`,
    img: r.cover,
    badge: r.badge ?? r.neighborhood,
  };
});

function Index() {
  const [city, setCity] = useState("Douala");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header city={city} setCity={setCity} />
      <main className="mx-auto max-w-md px-4 pb-4">
        <SearchBar />
        <Categories />
        <TableeBanner />
        <Restaurants city={city} />
      </main>
      <MboaExpressAssistant />
    </div>
  );
}

function Header({ city, setCity }: { city: string; setCity: (c: string) => void }) {
  return (
    <header className="sticky top-0 z-40 glass border-b border-border/40">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Mboa<span className="text-gradient-primary">Eats</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary">
            <MapPin className="h-3.5 w-3.5" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-transparent outline-none"
              aria-label="Choisir une ville"
            >
              {cities.map((c) => <option key={c} className="bg-surface text-foreground">{c}</option>)}
            </select>
          </label>
          <Link to="/profil" aria-label="Notifications" className="relative rounded-full border border-border bg-surface/60 p-2">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-background" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchBar() {
  return (
    <div className="mt-4 flex items-center gap-2">
      <Link
        to="/recherche"
        className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-surface/80 px-4 py-3 shadow-card"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Plat, restaurant, quartier…</span>
      </Link>
      <Link
        to="/decouvrir"
        className="rounded-2xl border border-primary/40 bg-primary/10 px-3 py-3 text-xs font-bold uppercase text-primary"
      >
        Live
      </Link>
    </div>
  );
}

function Categories() {
  return (
    <section className="mt-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Catégories
        </h2>
        <Link to="/recherche" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          Tout voir <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/categorie/$slug"
            params={{ slug: c.slug }}
            preload="intent"
            className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-primary/50 active:scale-95 transition-transform"
          >
            <span className="text-base">{c.icon}</span>
            <span>{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TableeBanner() {
  return (
    <Link
      to="/tablee"
      className="mt-5 relative block overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10 p-4 shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold">Exclusivité</p>
          <p className="font-display font-bold leading-tight">Mode Tablée</p>
          <p className="text-xs text-muted-foreground">Commandez à plusieurs, payez chacun votre part.</p>
        </div>
        <ArrowRight className="h-4 w-4 text-primary" />
      </div>
    </Link>
  );
}

function Restaurants({ city }: { city: string }) {
  return (
    <section className="mt-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">À la une</p>
          <h2 className="mt-1 font-display text-xl font-bold">Restos ouverts à {city}</h2>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {restaurants.map((r, i) => (
          <Link
            key={r.name}
            to="/restaurants/$restoId"
            params={{ restoId: r.slug }}
            preload="intent"
            onMouseEnter={() => prefetchRestaurantImages(r.slug)}
            onTouchStart={() => prefetchRestaurantImages(r.slug)}
            className="group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-card active:scale-[0.99] transition-transform"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={r.img}
                alt={r.name}
                width={768}
                height={480}
                loading={i < 2 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
                {r.badge}
              </span>
              <span
                aria-hidden
                className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
              >
                <Plus className="h-4 w-4" />
              </span>
            </div>
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-base font-semibold">{r.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">{r.tag}</p>
                </div>
                <div className="flex items-center gap-1 rounded-md bg-gold/10 px-1.5 py-0.5 text-xs font-semibold text-gold">
                  <Star className="h-3 w-3 fill-current" />
                  {r.rating}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {r.eta}
                </span>
                <span className="font-semibold text-foreground">dès {r.price}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
