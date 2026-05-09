import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { restaurants } from "@/data/restaurants";

export const Route = createFileRoute("/cuisines")({
  component: CuisinesPage,
  staleTime: Infinity,
  head: () => ({
    meta: [
      { title: "Cuisines — MboaEats" },
      { name: "description", content: "Découvrez toutes les cuisines disponibles : Ndolé, Eru, Poulet DG, Poisson braisé, Suya…" },
    ],
  }),
});

const CUISINES = [
  { slug: "ndole", label: "Ndolé", icon: "🥬", description: "L'emblème national" },
  { slug: "poulet-dg", label: "Poulet DG", icon: "🍗", description: "Plantain & légumes" },
  { slug: "poisson", label: "Poisson braisé", icon: "🐟", description: "Bar, capitaine, maquereau" },
  { slug: "suya", label: "Suya / Soya", icon: "🍢", description: "Brochettes au yaji" },
  { slug: "eru", label: "Eru", icon: "🍲", description: "Sud-Ouest tradition" },
  { slug: "beignets", label: "Beignets & Accras", icon: "🥯", description: "Macabo, crevettes" },
  { slug: "jus", label: "Jus naturels", icon: "🥤", description: "Bissap, gingembre" },
];

function CuisinesPage() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  // Compte de plats par cuisine pour afficher l'abondance
  const counts: Record<string, number> = {};
  for (const c of CUISINES) counts[c.slug] = 0;
  for (const r of restaurants) {
    for (const cat of r.categories) {
      for (const d of cat.dishes) {
        const hay = `${d.name} ${d.description}`.toLowerCase();
        for (const c of CUISINES) {
          const keywords =
            c.slug === "ndole" ? ["ndole", "ndolé"]
            : c.slug === "poulet-dg" ? ["poulet"]
            : c.slug === "poisson" ? ["poisson", "bar", "capitaine", "maquereau", "tilapia"]
            : c.slug === "suya" ? ["suya", "soya", "brochette"]
            : c.slug === "eru" ? ["eru"]
            : c.slug === "beignets" ? ["beignet", "accras", "macabo"]
            : ["jus", "bissap", "tamarin", "corossol", "gingembre"];
          if (keywords.some((k) => hay.includes(k))) counts[c.slug] += 1;
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <button
            onClick={handleBack}
            aria-label="Retour"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/60 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-2xl">🍽️</span>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold leading-tight truncate">Cuisines</h1>
              <p className="text-[11px] text-muted-foreground">Explorez par spécialité</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-12 pt-4 grid grid-cols-2 gap-3">
        {CUISINES.map((c) => (
          <Link
            key={c.slug}
            to="/categorie/$slug"
            params={{ slug: c.slug }}
            preload="intent"
            className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 active:scale-[0.99] transition-transform shadow-card"
          >
            <span className="text-3xl" aria-hidden="true">{c.icon}</span>
            <h2 className="mt-2 font-display text-sm font-bold leading-tight truncate">{c.label}</h2>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{c.description}</p>
            <span className="mt-1 text-[10px] font-semibold text-brand-cm-green">
              {counts[c.slug]} plat{counts[c.slug] > 1 ? "s" : ""}
            </span>
          </Link>
        ))}
      </main>
    </div>
  );
}
