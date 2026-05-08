import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Star, Clock, Plus, MapPin, Bell } from "lucide-react";
import { HamburgerMenu } from "@/components/HamburgerMenu";

import { restaurants as realRestaurants, getRestaurant } from "@/data/restaurants";

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
      { title: "MboaEats — Vos plats camerounais livrés" },
      { name: "description", content: "Commandez vos plats préférés, livrés rapidement chez vous." },
    ],
  }),
  component: Index,
});

const filters = [
  { key: "nearby", label: "À proximité", icon: "📍" },
  { key: "popular", label: "Populaire", icon: "🔥" },
  { key: "cuisines", label: "Cuisines", icon: "🍽️" },
];

type Card = {
  slug: string;
  name: string;
  tag: string;
  rating: number;
  eta: string;
  img: string;
  badge: string;
  price: number;
  oldPrice: number;
  promo: number;
};

const cards: Card[] = realRestaurants.map((r, i) => {
  const minPrice = Math.min(...r.categories.flatMap((c) => c.dishes.map((d) => d.price)));
  const promo = [10, 15, 20, 25, 30][i % 5];
  const oldPrice = Math.round((minPrice / (1 - promo / 100)) / 100) * 100;
  return {
    slug: r.id,
    name: r.name,
    tag: r.tagline.split("—")[0].trim(),
    rating: r.rating,
    eta: r.eta,
    img: r.cover,
    badge: r.badge ?? r.neighborhood,
    price: minPrice,
    oldPrice,
    promo,
  };
});

function Index() {
  const [active, setActive] = useState("popular");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.toLowerCase();
    return cards.filter((c) => c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#D9E8D8" }}>
      <div className="mx-auto max-w-md px-4 pb-28 pt-[calc(env(safe-area-inset-top)+1rem)]">
        {/* Top bar */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <HamburgerMenu />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "#888888" }}>
              Livrer à
            </p>
            <button className="flex items-center gap-1 text-sm font-bold truncate" style={{ color: "#1A1A1A" }}>
              <MapPin className="h-4 w-4" style={{ color: "#00B14F" }} />
              Douala, CM
            </button>
          </div>
          <Link
            to="/profil"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <Bell className="h-5 w-5" style={{ color: "#1A1A1A" }} />
            <span
              className="absolute right-2 top-2 h-2 w-2 rounded-full"
              style={{ backgroundColor: "#FF4D4D" }}
            />
          </Link>
        </header>

        {/* Search */}
        <div
          className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3.5"
          style={{ boxShadow: "0 2px 12px -6px rgba(0,0,0,0.08)" }}
        >
          <Search className="h-5 w-5" style={{ color: "#888888" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Que voulez-vous manger ?"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#1A1A1A" }}
          />
        </div>

        {/* Filter tabs */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => {
            const isActive = f.key === active;
            return (
              <button
                key={f.key}
                onClick={() => setActive(f.key)}
                className="flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? "#00B14F" : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "#1A1A1A",
                  boxShadow: isActive ? "0 4px 14px -4px rgba(0,177,79,0.4)" : "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                  style={{ backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "#F4F4F4" }}
                >
                  {f.icon}
                </span>
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Section title */}
        <div className="mt-6 mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: "#1A1A1A" }}>
            Populaires près de chez vous
          </h2>
          <Link to="/decouvrir" className="text-xs font-semibold" style={{ color: "#00B14F" }}>
            Tout voir
          </Link>
        </div>

        {/* Restaurant cards */}
        <div className="space-y-3">
          {filtered.map((r) => (
            <Link
              key={r.slug}
              to="/restaurants/$restoId"
              params={{ restoId: r.slug }}
              preload="intent"
              onMouseEnter={() => prefetchRestaurantImages(r.slug)}
              onTouchStart={() => prefetchRestaurantImages(r.slug)}
              className="block rounded-2xl bg-white p-3 transition active:scale-[0.99]"
              style={{ boxShadow: "0 2px 12px -6px rgba(0,0,0,0.08)" }}
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
                  <img src={r.img} alt={r.name} className="h-full w-full object-cover" loading="lazy" />
                  <span
                    className="absolute left-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: "#FF4D4D" }}
                  >
                    {r.promo}% OFF
                  </span>
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate text-sm font-bold" style={{ color: "#1A1A1A" }}>
                    {r.name}
                  </h3>
                  <p className="mt-0.5 truncate text-xs" style={{ color: "#888888" }}>
                    {r.tag}
                  </p>

                  <div className="mt-1.5 flex items-center gap-3 text-xs" style={{ color: "#888888" }}>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" style={{ color: "#FFC107" }} />
                      <span className="font-semibold" style={{ color: "#1A1A1A" }}>
                        {r.rating}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {r.eta}
                    </span>
                  </div>

                  <div className="mt-auto flex items-end justify-between pt-2">
                    <div className="leading-tight">
                      <span className="text-[11px] line-through" style={{ color: "#AAAAAA" }}>
                        {r.oldPrice.toLocaleString("fr-FR")} F
                      </span>
                      <div className="text-sm font-bold" style={{ color: "#1A1A1A" }}>
                        {r.price.toLocaleString("fr-FR")} F
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
                      style={{ backgroundColor: "#00B14F" }}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
