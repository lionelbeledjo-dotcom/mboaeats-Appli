import { MapPin } from "lucide-react";
import { CameroonFlag } from "@/components/brand/CameroonFlag";
import { HamburgerMenu } from "@/components/HamburgerMenu";

type Props = { title?: string; showDelivery?: boolean };

const UBER_GREEN = "#06C167";
const UBER_GREEN_DARK = "#048A47";

/**
 * Topbar globale MboaEats — fond blanc, ombre légère, logo + drapeau, menu ☰.
 * Affiche également une barre "Livraison au Cameroun" en vert UberEats.
 */
export function AppTopBar({ title, showDelivery = true }: Props) {
  return (
    <div className="sticky top-0 z-30" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header
        className="flex items-center justify-between gap-3 bg-white px-4"
        style={{ height: 56, boxShadow: "0 2px 12px -8px rgba(0,0,0,0.10)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CameroonFlag size={24} />
          <span
            className="font-bold tracking-tight text-[18px] leading-none"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            <span style={{ color: "#1A1A1A" }}>Mboa</span>
            <span style={{ color: UBER_GREEN }}>Eats</span>
          </span>
          {title && (
            <span className="ml-2 truncate text-sm font-medium" style={{ color: "#6B6B6B" }}>
              · {title}
            </span>
          )}
        </div>
        <HamburgerMenu />
      </header>

      {showDelivery && (
        <div
          className="flex items-center justify-center gap-1.5 bg-white px-4 py-1.5"
          style={{ borderTop: `1px solid ${UBER_GREEN}` }}
          role="status"
          aria-label="Zone de livraison"
        >
          <MapPin className="h-3.5 w-3.5" style={{ color: UBER_GREEN }} strokeWidth={2.4} aria-hidden="true" />
          <span
            className="text-[12px] font-semibold tracking-wide"
            style={{ color: UBER_GREEN_DARK, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Livraison au Cameroun
          </span>
        </div>
      )}
    </div>
  );
}

export default AppTopBar;
