import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Search, Zap, Sparkles, TrendingUp, ChevronRight } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { PromoBanner } from "@/components/home/PromoBanner";
import { CategoriesRow } from "@/components/home/CategoriesRow";
import { RestaurantListCard } from "@/components/home/RestaurantListCard";
import { SmartImage } from "@/components/SmartImage";
import { restaurants as realRestaurants, getRestaurant, type Restaurant } from "@/data/restaurants";
import { addToCart } from "@/hooks/use-cart";
import { etaMinAvg, isFastDelivery, isNew } from "@/lib/restaurant-meta";
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
      { name: "description", content: "Commandez les meilleurs plats du terroir camerounais, livrés rapidement à Douala et Yaoundé." },
    ],
  }),
  beforeLoad: async () => {
    // Garde côté client uniquement : on n'accède pas au storage en SSR.
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/connexion" });
    }
  },
  component: Index,
});

function minPriceOf(r: Restaurant) {
  return Math.min(...r.categories.flatMap((c) => c.dishes.map((d) => d.price)));
}

function firstDishOf(r: Restaurant) {
  const fd = r.categories[0]?.dishes[0];
  if (fd) return { id: fd.id, name: fd.name, price: fd.price, image: fd.image };
  return { id: "default", name: r.name, price: minPriceOf(r), image: r.cover };
}

function Index() {
  const [query, setQuery] = useState("");

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return realRestaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.tagline.toLowerCase().includes(q) ||
        r.categories.some((c) => c.dishes.some((d) => d.name.toLowerCase().includes(q))),
    );
  }, [query]);

  const popular = useMemo(
    () => [...realRestaurants].sort((a, b) => b.rating - a.rating).slice(0, 8),
    [],
  );
  const fast = useMemo(
    () => realRestaurants.filter(isFastDelivery).sort((a, b) => etaMinAvg(a.eta) - etaMinAvg(b.eta)).slice(0, 6),
    [],
  );
  const news = useMemo(() => realRestaurants.filter(isNew), []);

  const handleAdd = (r: Restaurant) => {
    const fd = firstDishOf(r);
    addToCart({
      id: `${r.id}__${fd.id}`,
      dishId: fd.id,
      restoId: r.id,
      name: fd.name,
      price: fd.price,
      qty: 1,
      image: fd.image,
    });
    toast.success(`Ajouté : ${fd.name}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F0E8", overflowAnchor: "none" }}>
      <AppTopBar />

      <div className="mx-auto w-full max-w-md overflow-hidden px-4 pb-28 pt-4">
        <h1
          className="text-[24px] font-bold leading-tight"
          style={{ color: "#06C167", fontFamily: "Inter, system-ui, sans-serif" }}
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
          <Link
            to="/recherche"
            className="text-[12px] font-semibold"
            style={{ color: "#06C167" }}
          >
            Filtres
          </Link>
        </label>

        {searchResults ? (
          <section className="mt-6 overflow-hidden">
            <h2 className="mb-3 text-[16px] font-semibold" style={{ color: "#1A1A1A" }}>
              {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""} pour « {query} »
            </h2>
            <div className="space-y-3 overflow-hidden">
              {searchResults.map((r) => (
                <RestaurantListCard
                  key={r.id}
                  restaurant={r}
                  minPrice={minPriceOf(r)}
                  onAdd={() => handleAdd(r)}
                  onPrefetch={() => prefetchRestaurantImages(r.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <>
            <PromoBanner />
            <CategoriesRow />

            {fast.length > 0 && (
              <Section
                icon={<Zap className="h-4 w-4" style={{ color: "#06C167" }} />}
                title="Livraison rapide < 30 min"
                href="/proximite"
              >
                <HorizontalRail restaurants={fast} />
              </Section>
            )}

            {news.length > 0 && (
              <Section
                icon={<Sparkles className="h-4 w-4" style={{ color: "#06C167" }} />}
                title="Nouveautés"
              >
                <div className="space-y-3">
                  {news.map((r) => (
                    <RestaurantListCard
                      key={r.id}
                      restaurant={r}
                      minPrice={minPriceOf(r)}
                      onAdd={() => handleAdd(r)}
                      onPrefetch={() => prefetchRestaurantImages(r.id)}
                    />
                  ))}
                </div>
              </Section>
            )}

            <Section
              icon={<TrendingUp className="h-4 w-4" style={{ color: "#06C167" }} />}
              title="Restaurants populaires"
              href="/populaire"
            >
              <div className="space-y-3">
                {popular.map((r) => (
                  <RestaurantListCard
                    key={r.id}
                    restaurant={r}
                    minPrice={minPriceOf(r)}
                    onAdd={() => handleAdd(r)}
                    onPrefetch={() => prefetchRestaurantImages(r.id)}
                  />
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h2
          className="flex items-center gap-2 text-[18px] font-semibold"
          style={{ color: "#1A1A1A", fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {icon}
          {title}
        </h2>
        {href && (
          <Link to={href} className="inline-flex items-center text-[12px] font-semibold" style={{ color: "#06C167" }}>
            Voir tout <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function HorizontalRail({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {restaurants.map((r) => (
        <Link
          key={r.id}
          to="/restaurants/$restoId"
          params={{ restoId: r.id }}
          preload="intent"
          className="block shrink-0 snap-start overflow-hidden rounded-2xl bg-white p-2 transition active:bg-white/90"
          style={{ width: 200, boxShadow: "0 2px 12px -8px rgba(0,0,0,0.08)" }}
        >
          <div
            className="relative w-full overflow-hidden rounded-xl bg-muted"
            style={{ height: 113, aspectRatio: "16 / 9" }}
          >
            <SmartImage
              src={r.cover}
              alt={r.name}
              ratio="16 / 9"
              width={200}
              height={113}
              wrapperClassName="!h-full !w-full"
            />
            <span
              className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase"
              style={{ backgroundColor: "#06C167", color: "#FFFFFF" }}
            >
              {etaMinAvg(r.eta)} min
            </span>
          </div>
          <p className="mt-2 truncate text-[13px] font-bold" style={{ color: "#1A1A1A" }}>
            {r.name}
          </p>
          <p className="truncate text-[11px]" style={{ color: "#6B6B6B" }}>
            ⭐ {r.rating} · {r.eta}
          </p>
        </Link>
      ))}
    </div>
  );
}
