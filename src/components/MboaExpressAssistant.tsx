import { useEffect, useMemo, useRef, useState } from "react";
import { Bike, Send, X, Sparkles, Loader2, Mail } from "lucide-react";
import { recommendDishes, type Suggestion } from "@/server/mboa-ai.functions";
import { useSessionUser } from "@/hooks/useSessionUser";

type Msg = {
  role: "assistant" | "user";
  text?: string;
  suggestions?: Suggestion[];
};

function deriveFirstName(user: { mode?: string; identifier?: string } | null): string {
  if (!user?.identifier) return "ami";
  const id = user.identifier;
  if (user.mode === "email" && id.includes("@")) {
    const local = id.split("@")[0].replace(/[._-]+/g, " ").trim();
    const first = local.split(" ")[0];
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  return "ami";
}

function getTastes(): string[] {
  try {
    const raw = localStorage.getItem("mboa_tastes");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function pushTaste(t: string) {
  try {
    const arr = getTastes();
    if (!arr.includes(t)) arr.unshift(t);
    localStorage.setItem("mboa_tastes", JSON.stringify(arr.slice(0, 8)));
  } catch {}
}

export default function MboaExpressAssistant() {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useSessionUser();
  const firstName = useMemo(() => deriveFirstName(user), [user]);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: `Salut ${firstName} ! Je suis Mboa Express. Ravi de te revoir ! 🇨🇲\n\nDis-moi ce que tu as envie de manger aujourd'hui, je te trouve le meilleur plat de Douala ou Yaoundé en un clin d'œil.`,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    pushTaste(q);
    setLoading(true);
    try {
      const tastes = getTastes();
      const enriched = tastes.length
        ? `${q}\n\n(Goûts récents du client: ${tastes.join(", ")} — propose si pertinent)`
        : q;
      const res = await recommendDishes({
        data: { prompt: enriched, mood: "envie", budget: 4500, city: "Douala", timeLabel: "maintenant", weather: "agréable" },
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Voici mes meilleures pioches pour toi 👇", suggestions: res.suggestions },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Aïe, petit souci côté IA. Tu peux écrire au support : lionelbrown2728@yahoo.fr`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          aria-label="Ouvrir Mboa Express"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 group"
        >
          <span className={`absolute inset-0 rounded-full ${pulse ? "animate-ping" : ""} bg-primary/40`} />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow ring-2 ring-primary/40 transition-transform group-active:scale-95">
            <Bike className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-black shadow">
              <Sparkles className="h-3 w-3" />
            </span>
          </span>
        </button>
      )}

      {/* Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-3xl border border-border bg-card shadow-2xl animate-scale-in"
            style={{ animation: "scale-in 0.25s ease-out" }}
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                <Bike className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold">Mboa Express</p>
                <p className="text-[11px] text-muted-foreground">Ton livreur IA · en ligne</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-muted/60" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="max-h-[55vh] overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-gradient-primary text-primary-foreground"
                        : "bg-surface border border-border/60"
                    }`}
                  >
                    {m.text}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {m.suggestions.map((s, k) => (
                          <div key={k} className="rounded-xl border border-border/60 bg-background p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold">{s.name}</p>
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                                {s.price.toLocaleString("fr-FR")} F
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.resto} · ⭐ {s.rating} · {s.eta}</p>
                            <p className="mt-1 text-[12px]">{s.why}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-border/60 bg-surface px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-muted-foreground">Mboa Express cherche…</span>
                  </div>
                </div>
              )}
            </div>

            {/* quick chips */}
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {["Poisson braisé", "Ndolé", "Poulet DG", "Petit budget"].map((c) => (
                <button
                  key={c}
                  onClick={() => ask(c)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:border-primary"
                >
                  {c}
                </button>
              ))}
            </div>

            {/* input */}
            <form
              onSubmit={(e) => { e.preventDefault(); ask(); }}
              className="flex items-center gap-2 border-t border-border/60 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Dis-moi ton envie…"
                className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            <a
              href="mailto:lionelbrown2728@yahoo.fr"
              className="flex items-center justify-center gap-1.5 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground hover:text-primary"
            >
              <Mail className="h-3 w-3" /> Un souci ? Contacter le support
            </a>
          </div>
        </div>
      )}
    </>
  );
}
