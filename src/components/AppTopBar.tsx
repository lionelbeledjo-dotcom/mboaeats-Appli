import { CameroonFlag } from "@/components/brand/CameroonFlag";
import { HamburgerMenu } from "@/components/HamburgerMenu";

type Props = { title?: string };

/**
 * Topbar globale MboaEats — fond blanc, ombre légère, logo + drapeau, menu ☰.
 */
export function AppTopBar({ title }: Props) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-white px-4"
      style={{
        height: 56,
        boxShadow: "0 2px 12px -8px rgba(0,0,0,0.10)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <CameroonFlag size={24} />
        <span
          className="font-bold tracking-tight text-[18px] leading-none"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          <span style={{ color: "#2D5A27" }}>Mboa</span>
          <span style={{ color: "#4A7C3F" }}>Eats</span>
        </span>
        {title && (
          <span className="ml-2 truncate text-sm font-medium" style={{ color: "#6B6B6B" }}>
            · {title}
          </span>
        )}
      </div>
      <HamburgerMenu />
    </header>
  );
}

export default AppTopBar;
