import { useState } from "react";
import { ArrowRight } from "lucide-react";
import step1 from "@/assets/onboarding/step-1.jpg";
import step2 from "@/assets/onboarding/step-2.jpg";
import step3 from "@/assets/onboarding/step-3.jpg";

type Slide = {
  image: string;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    image: step1,
    title: "Découvre les saveurs du Cameroun",
    body: "Ndolé, poulet DG, jollof… Tes plats favoris à portée de main, livrés à Douala.",
  },
  {
    image: step2,
    title: "Commande en 2 clics",
    body: "Choisis ton restaurant, valide ton panier et paie facilement avec MTN ou Orange Money.",
  },
  {
    image: step3,
    title: "Suis ton livreur en direct",
    body: "Reçois ta commande chaude, à temps. Tu sais à chaque instant où en est ton livreur.",
  },
];

export function OnboardingCarousel({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const isLast = idx === SLIDES.length - 1;
  const slide = SLIDES[idx];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white">
      <div className="flex justify-end p-4">
        <button
          type="button"
          onClick={onDone}
          className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167]"
        >
          Passer
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]">
          <img
            src={slide.image}
            alt=""
            width={1024}
            height={1024}
            className="aspect-square w-full object-cover"
          />
        </div>

        <h2 className="mt-8 max-w-md text-center text-2xl font-extrabold tracking-tight text-black">
          {slide.title}
        </h2>
        <p className="mt-3 max-w-sm text-center text-sm leading-relaxed text-neutral-600">
          {slide.body}
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 px-6 pb-10 pt-6">
        <div className="flex gap-2" role="tablist" aria-label="Étapes de présentation">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Aller à l'étape ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === idx ? "w-8 bg-[#06C167]" : "w-2 bg-neutral-300"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167] focus-visible:ring-offset-2`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => (isLast ? onDone() : setIdx((v) => v + 1))}
          className="inline-flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#06C167] text-base font-extrabold uppercase tracking-wide text-white shadow-[0_10px_24px_-8px_rgba(6,193,103,0.55)] transition hover:bg-[#05a857] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C167] focus-visible:ring-offset-2"
        >
          {isLast ? "Commencer" : "Suivant"}
          <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
