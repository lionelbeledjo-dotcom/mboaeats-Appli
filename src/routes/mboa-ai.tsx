import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sparkles, ArrowLeft, Send, CloudRain, Wind, Wallet,
  Zap, Coffee, Heart, Dumbbell, Brain, Smile, Star, Clock, Flame, Loader2,
} from "lucide-react";

import dishPouletDg from "@/assets/dish-poulet-dg.jpg";
import dishEru from "@/assets/dish-eru.jpg";
import dishPoisson from "@/assets/dish-poisson.jpg";
import dishSuya from "@/assets/dish-suya.jpg";
import { recommendDishes, type Suggestion } from "@/server/mboa-ai.functions";

const fallbackImgs = [dishPouletDg, dishPoisson, dishEru, dishSuya];

export const Route = createFileRoute("/mboa-ai")({
  head: () => ({
    meta: [
      { title: "Mboa AI — Recommandations intelligentes" },
      { name: "description", content: "Recommandations de plats selon l'heure, la météo, votre budget et votre humeur." },
    ],
  }),
  component: MboaAIPage,
});

const moods = [
  { id: "tired", label: "Fatigué", icon: <Coffee className="h-4 w-4" /> },
  { id: "sporty", label: "Sportif", icon: <Dumbbell className="h-4 w-4" /> },
  { id: "happy", label: "Festif", icon: <Smile className="h-4 w-4" /> },
  { id: "focus", label: "Au boulot", icon: <Brain className="h-4 w-4" /> },
  { id: "comfort", label: "Réconfort", icon: <Heart className="h-4 w-4" /> },
  { id: "fast", label: "Rapide", icon: <Zap className="h-4 w-4" /> },
];

const baseSuggestions = [
  {
    name: "Poulet DG complet",
    resto: "Chez Mama Biya",
    price: 3500,
    rating: 4.9,
    eta: "20 min",
    img: dishPouletDg,
    why: "Plat copieux pour recharger les batteries après ta journée.",
    tags: ["Réconfort", "Pluie"],
  },
  {
    name: "Poisson braisé léger",
    resto: "Le Wouri Grill",
    price: 4200,
    rating: 4.9,
    eta: "30 min",
    img: dishPoisson,
    why: "Riche en protéines, faible en féculents — parfait sportif.",
    tags: ["Sportif", "Healthy"],
  },
  {
    name: "Eru + water fufu",
    resto: "Saveurs du Mboa",
    price: 1800,
    rating: 4.8,
    eta: "25 min",
    img: dishEru,
    why: "Tradition Sud-Ouest, idéal sous la pluie de Douala.",
    tags: ["Tradition", "Budget"],
  },
  {
    name: "Suya express x2",
    resto: "Suya King",
    price: 1500,
    rating: 4.7,
    eta: "15 min",
    img: dishSuya,
    why: "Léger, rapide, parfait pour grignoter sans culpabiliser.",
    tags: ["Rapide", "Festif"],
  },
];

function MboaAIPage() {
  const [mood, setMood] = useState("tired");
  const [budget, setBudget] = useState(3500);
  const [prompt, setPrompt] = useState("");
  const [aiResults, setAiResults] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hour = new Date().getHours();
  const timeLabel = hour < 11 ? "matin" : hour < 15 ? "midi" : hour < 19 ? "après-midi" : "soir";

  const askAI = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recommendDishes({
        data: { prompt, mood, budget, city: "Douala", weather: "Pluie fine, 26°C", timeLabel },
      });
      setAiResults(res.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur Mboa AI");
    } finally {
      setLoading(false);
    }
  };

  const list = aiResults
    ? aiResults.map((s, i) => ({ ...s, img: fallbackImgs[i % fallbackImgs.length] }))
    : baseSuggestions;
  const filtered = list.filter((s) => s.price <= budget);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-gold" /> Mboa AI
          </div>
          <span className="text-xs text-muted-foreground">Beta</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
          <Sparkles className="h-3.5 w-3.5" /> Recommandations intelligentes
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
          On dirait bien que tu mérites <span className="text-gradient-primary">un bon plat</span>.
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Mboa AI lit l'heure, la météo de ta ville, ton budget et ton humeur pour te suggérer
          les meilleurs plats du moment.
        </p>

        {/* Context strip */}
        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          <ContextChip icon={<Clock className="h-4 w-4" />} label="Maintenant" value={`Bon ${timeLabel} weh`} />
          <ContextChip icon={<CloudRain className="h-4 w-4" />} label="Douala" value="26°C · Pluie fine" />
          <ContextChip icon={<Wind className="h-4 w-4" />} label="Trafic" value="Fluide" />
          <ContextChip icon={<Wallet className="h-4 w-4" />} label="Ton budget" value={`≤ ${budget.toLocaleString("fr-FR")} F`} accent />
        </section>

        {/* Prompt + sliders */}
        <section className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm font-semibold">Dis à Mboa AI ce que tu veux</p>
            <div className="mt-3 flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                placeholder="Ex : un plat épicé pas trop cher, je suis crevé après le boulot…"
                className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                onClick={askAI}
                disabled={loading}
                aria-label="Demander à Mboa AI"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-105 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

            <p className="mt-5 text-sm font-semibold">Comment tu te sens ?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {moods.map((m) => {
                const active = mood === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                        : "border-border bg-surface hover:bg-surface-elevated"
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm font-semibold">Budget max</p>
            <p className="mt-1 font-display text-3xl font-bold text-gradient-primary">
              {budget.toLocaleString("fr-FR")} <span className="text-base text-muted-foreground">FCFA</span>
            </p>
            <input
              type="range"
              min={1000}
              max={10000}
              step={500}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-4 w-full accent-[oklch(0.66_0.22_36)]"
              aria-label="Budget"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>1 000 F</span>
              <span>10 000 F</span>
            </div>

            <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-3">
              <p className="text-xs font-semibold text-gold">Astuce Mboa</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Avec la pluie + ton humeur "Fatigué", on te suggère du <span className="text-foreground">Poulet DG chaud</span> 🔥
              </p>
            </div>
          </div>
        </section>

        {/* Recommendations */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                {aiResults ? "Généré par Mboa AI" : "Pour toi maintenant"}
              </p>
              <h2 className="mt-1 font-display text-2xl font-bold">{filtered.length} suggestions personnalisées</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {filtered.map((s, i) => (
              <article
                key={s.name}
                className="group flex gap-4 rounded-3xl border border-border bg-card p-3 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-glow animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl">
                  <img src={s.img} alt={s.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold leading-tight">{s.name}</h3>
                      <p className="text-xs text-muted-foreground">{s.resto}</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-md bg-gold/10 px-1.5 py-0.5 text-xs font-semibold text-gold">
                      <Star className="h-3 w-3 fill-current" /> {s.rating}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground italic">"{s.why}"</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span key={t} className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground"><Clock className="inline h-3 w-3" /> {s.eta}</p>
                      <p className="font-display text-lg font-bold">{s.price.toLocaleString("fr-FR")} F</p>
                    </div>
                    <button className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-105">
                      <Flame className="h-3.5 w-3.5" /> Commander
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-6 rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Aucun plat sous {budget.toLocaleString("fr-FR")} F. Augmente un peu ton budget 👇
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ContextChip({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3 ${accent ? "border-gold/40 bg-gold/5" : "border-border bg-card"}`}>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ? "bg-gradient-gold text-gold-foreground" : "bg-surface-elevated text-primary"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
