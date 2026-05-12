import { Link } from "@tanstack/react-router";
import { Star, Clock, Plus, Bike } from "lucide-react";
import type { Restaurant } from "@/data/restaurants";
import {
  badgeMeta,
  catalogBadge,
  deliveryFee,
  distanceKm,
  hasPromo,
  promoLabel,
} from "@/lib/restaurant-meta";

type Props = {
  restaurant: Restaurant;
  minPrice: number;
  onAdd?: () => void;
  onPrefetch?: () => void;
};

export function RestaurantListCard({ restaurant: r, minPrice, onAdd, onPrefetch }: Props) {
  const badge = badgeMeta(catalogBadge(r));
  const fee = deliveryFee(r);
  const dist = distanceKm(r);
  const promo = hasPromo(r) ? promoLabel(r) : null;

  return (
    <Link
      to="/restaurants/$restoId"
      params={{ restoId: r.id }}
      preload="intent"
      onMouseEnter={onPrefetch}
      onTouchStart={onPrefetch}
      className="block rounded-2xl bg-white p-3 transition active:scale-[0.99]"
      style={{ boxShadow: "0 2px 12px -8px rgba(0,0,0,0.08)" }}
    >
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0">
          <img
            src={r.cover}
            alt={r.name}
            width={80}
            height={80}
            loading="lazy"
            className="h-20 w-20 rounded-xl object-cover"
          />
          {badge && (
            <span
              className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide"
              style={{ backgroundColor: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2">
            <h3
              className="min-w-0 flex-1 truncate text-[15px] font-bold"
              style={{ color: "#1A1A1A", fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {r.name}
            </h3>
            {promo && (
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: "#FFEBEE", color: "#D32F2F" }}
              >
                {promo}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[12px]" style={{ color: "#6B6B6B", fontWeight: 300 }}>
            {r.tagline.split("—")[0].trim()}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]" style={{ color: "#6B6B6B" }}>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current" style={{ color: "#F4A623" }} />
              <span className="font-semibold" style={{ color: "#1A1A1A" }}>{r.rating}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {r.eta}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bike className="h-3.5 w-3.5" /> {fee.toLocaleString("fr-FR")} FCFA
            </span>
            <span>· {dist} km</span>
          </div>

          <div className="mt-auto flex items-end justify-between pt-2">
            <div className="leading-tight">
              <span className="text-[11px]" style={{ color: "#6B6B6B" }}>À partir de</span>
              <div className="text-[15px] font-bold tabular-nums" style={{ color: "#1A1A1A" }}>
                {minPrice.toLocaleString("fr-FR")} FCFA
              </div>
            </div>
            {onAdd && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAdd();
                }}
                aria-label={`Ajouter ${r.name} au panier`}
                className="inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-[13px] font-bold text-white transition active:scale-95"
                style={{ backgroundColor: "#06C167", minHeight: 36 }}
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
                Ajouter
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
