import { MapPin, ChefHat, Navigation } from "lucide-react";

type LatLng = { lat: number; lng: number } | null | undefined;

export function DeliveryMap({
  restaurant,
  destination,
  dark = false,
}: {
  restaurant?: LatLng;
  destination?: LatLng;
  dark?: boolean;
}) {
  // Lightweight static map placeholder. Real tile map can be wired later.
  return (
    <div
      className="relative h-full w-full"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 30%, oklch(0.35 0.05 250 / 0.6) 0, transparent 40%), radial-gradient(circle at 80% 70%, oklch(0.4 0.06 200 / 0.5) 0, transparent 45%), repeating-linear-gradient(0deg, transparent 0, transparent 24px, oklch(1 0 0 / 0.04) 24px, oklch(1 0 0 / 0.04) 25px), repeating-linear-gradient(90deg, transparent 0, transparent 24px, oklch(1 0 0 / 0.04) 24px, oklch(1 0 0 / 0.04) 25px)",
        backgroundColor: dark ? "oklch(0.18 0.02 240)" : "oklch(0.95 0.01 240)",
      }}
      aria-label="Carte de livraison"
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 320" preserveAspectRatio="none">
        <path
          d="M 60 240 Q 180 200 220 160 T 340 80"
          fill="none"
          stroke="oklch(0.78 0.18 60)"
          strokeWidth="3"
          strokeDasharray="6 6"
          strokeLinecap="round"
        />
      </svg>

      {restaurant && (
        <div className="absolute left-[15%] top-[75%] -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-emerald-500/20">
            <ChefHat className="h-4 w-4" />
          </div>
        </div>
      )}

      {destination && (
        <div className="absolute left-[85%] top-[25%] -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-gold-foreground shadow-lg ring-4 ring-gold/20">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
      )}

      {!restaurant && !destination && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Navigation className="mr-2 h-4 w-4" />
          <span className="text-sm">Position indisponible</span>
        </div>
      )}
    </div>
  );
}

export default DeliveryMap;
