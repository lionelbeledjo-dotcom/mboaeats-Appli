import { Link } from "@tanstack/react-router";
import { CUISINE_KEYS, CUISINE_LABEL, CUISINE_ICON } from "@/lib/restaurant-meta";

export function CategoriesRow() {
  return (
    <section className="mt-5">
      <h2
        className="mb-3 text-[16px] font-semibold"
        style={{ color: "#1A1A1A", fontFamily: "Inter, system-ui, sans-serif" }}
      >
        Catégories
      </h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CUISINE_KEYS.map((k) => (
          <Link
            key={k}
            to="/categorie/$slug"
            params={{ slug: k }}
            className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-white px-3 py-3 transition active:scale-95"
            style={{ width: 76, border: "1px solid #E5E5E5" }}
          >
            <span className="text-2xl" aria-hidden>{CUISINE_ICON[k]}</span>
            <span className="text-[11px] font-semibold" style={{ color: "#1A1A1A" }}>
              {CUISINE_LABEL[k]}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
