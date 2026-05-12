import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type Slide = {
  title: string;
  subtitle: string;
  cta: string;
  to: string;
  bg: string; // CSS background (gradient)
  emoji: string;
};

const SLIDES: Slide[] = [
  {
    title: "-20% sur ta 1ère commande",
    subtitle: "Code BIENVENUE20 — minimum 3 000 FCFA",
    cta: "J'en profite",
    to: "/recherche",
    bg: "linear-gradient(135deg, #06C167 0%, #048A47 100%)",
    emoji: "🎉",
  },
  {
    title: "Livraison gratuite dès 5 000 FCFA",
    subtitle: "Sur tout Douala et Yaoundé, aujourd'hui seulement",
    cta: "Découvrir",
    to: "/proximite",
    bg: "linear-gradient(135deg, #1A1A1A 0%, #3A3A3A 100%)",
    emoji: "🛵",
  },
  {
    title: "MboaPass Premium",
    subtitle: "Livraisons illimitées + accès VIP aux restos",
    cta: "S'abonner",
    to: "/mboapass",
    bg: "linear-gradient(135deg, #F4A623 0%, #D87C00 100%)",
    emoji: "👑",
  },
];

export function PromoBanner() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-4">
      <div
        className="relative h-32 w-full overflow-hidden rounded-2xl"
        style={{ boxShadow: "0 6px 20px -10px rgba(0,0,0,0.25)" }}
      >
        {SLIDES.map((s, idx) => (
          <Link
            key={s.title}
            to={s.to}
            aria-hidden={idx !== i}
            tabIndex={idx === i ? 0 : -1}
            className="absolute inset-0 flex items-center justify-between gap-3 px-5 transition-opacity duration-700"
            style={{
              background: s.bg,
              opacity: idx === i ? 1 : 0,
              pointerEvents: idx === i ? "auto" : "none",
            }}
          >
            <div className="flex-1 text-white">
              <p className="text-[16px] font-extrabold leading-tight">{s.title}</p>
              <p className="mt-1 text-[12px] opacity-90">{s.subtitle}</p>
              <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold backdrop-blur">
                {s.cta} →
              </span>
            </div>
            <div className="text-5xl drop-shadow-lg" aria-hidden>
              {s.emoji}
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: idx === i ? 18 : 6,
              backgroundColor: idx === i ? "#06C167" : "#D4D4D4",
            }}
          />
        ))}
      </div>
    </div>
  );
}
