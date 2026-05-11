import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Search, Star, Clock, Plus } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { restaurants as realRestaurants, getRestaurant } from "@/data/restaurants";
import { addToCart } from "@/hooks/use-cart";
import { toast } from "sonner";

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
      { title: "MboaEats — Vos plats camerounais livrés à Douala" },
      { name: "description", content: "Commandez les meilleurs plats du terroir camerounais, livrés rapidement à Douala." },
    ],
  }),
  component: Index,
});

type Card = {
  slug: string;
  name: string;
  tag: string;
  rating: number;
  eta: string;
  img: string;
  price: number;
  firstDish: { id: string; name: string; price: number; image: string };
};

const cards: Card[] = realRestaurants.slice(0, 12).map((r) => {
  const firstDish = r.categories[0]?.dishes[0];
  const minPrice = Math.min(...r.categories.flatMap((c) => c.dishes.map((d) => d.price)));
  return {
    slug: r.id,
    name: r.name,
    tag: r.tagline.split("—")[0].trim(),
    rating: r.rating,
    eta: r.eta,
    img: r.cover,
    price: minPrice,
    firstDish: firstDish ? { id: firstDish.id, name: firstDish.name, price: firstDish.price, image: firstDish.image } : { id: "default", name: r.name, price: minPrice, image: r.cover },
  };
});

function Index() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.toLowerCase();
    return cards.filter((c) => c.name.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F0E8", overflowAnchor: "none" }}>
      <AppTopBar />

      <div className="mx-auto max-w-md px-4 pb-28 pt-4">
        <h1
          className="text-[24px] font-bold leading-tight"
          style={{ color: "#2D5A27", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          Bienvenue sur MboaEats
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: "#6B6B6B", fontWeight: 300 }}>
          Le meilleur du terroir camerounais, livré chez vous.
        </p>

        {/* Recherche */}
        <label
          className="mt-4 flex h-12 items-center gap-2 rounded-xl bg-white px-4"
          style={{ border: "1px solid #E5E5E5" }}
        >
          <Search className="h-5 w-5" style={{ color: "#6B6B6B" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un plat ou un restaurant"
            className="h-full flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#1A1A1A" }}
          />
        </label>

        {/* Section restaurants */}
        <h2
          className="mt-6 mb-3 text-[20px] font-semibold"
          style={{ color: "#1A1A1A", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          Restaurants populaires
        </h2>

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
              style={{ boxShadow: "0 2px 12px -8px rgba(0,0,0,0.08)" }}
            >
              <div className="flex gap-3">
                <img
                  src={r.img}
                  alt={r.name}
                  width={80}
                  height={80}
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-xl object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3
                    className="truncate text-[15px] font-bold"
                    style={{ color: "#1A1A1A", fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {r.name}
                  </h3>
                  <p className="mt-0.5 truncate text-[12px]" style={{ color: "#6B6B6B", fontWeight: 300 }}>
                    {r.tag}
                  </p>

                  <div className="mt-1 flex items-center gap-3 text-[13px]" style={{ color: "#6B6B6B" }}>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" style={{ color: "#F4A623" }} />
                      <span className="font-semibold" style={{ color: "#1A1A1A" }}>{r.rating}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {r.eta}
                    </span>
                  </div>

                  <div className="mt-auto flex items-end justify-between pt-2">
                    <div className="leading-tight">
                      <span className="text-[11px]" style={{ color: "#6B6B6B" }}>À partir de</span>
                      <div className="text-[16px] font-bold tabular-nums" style={{ color: "#1A1A1A" }}>
                        {r.price.toLocaleString("fr-FR")} FCFA
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToCart({
                          id: `${r.slug}__${r.firstDish.id}`,
                          dishId: r.firstDish.id,
                          restoId: r.slug,
                          name: r.firstDish.name,
                          price: r.firstDish.price,
                          qty: 1,
                          image: r.firstDish.image,
                        });
                        toast.success(`Ajouté : ${r.firstDish.name}`);
                      }}
                      aria-label={`Ajouter ${r.name} au panier`}
                      className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-bold text-white transition active:scale-95"
                      style={{ backgroundColor: "#2D5A27", minHeight: 36 }}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.6} />
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
