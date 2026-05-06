import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  prompt: z.string().max(500).optional().default(""),
  mood: z.string().max(40).optional().default("tired"),
  budget: z.number().int().min(500).max(20000).default(3500),
  city: z.string().max(40).optional().default("Douala"),
  weather: z.string().max(80).optional().default("Pluie fine, 26°C"),
  timeLabel: z.string().max(40).optional().default("soir"),
});

export type Suggestion = {
  name: string;
  resto: string;
  price: number;
  rating: number;
  eta: string;
  why: string;
  tags: string[];
};

export const recommendDishes = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const system = `Tu es Mboa AI, le moteur de recommandation contextuel de MboaEats, une app de livraison de repas au Cameroun (Douala, Yaoundé, Bafoussam).
Tu connais la cuisine camerounaise: Ndolé, Poulet DG, Eru, Poisson braisé, Suya, Koki, Achu, Mbongo Tchobi, Sanga, Bobolo, Plantain, Beignets-haricots, Soya...
Tu réponds avec des plats RÉELS et populaires localement. Prix en FCFA réalistes (1500-7000 F).
Tu adaptes selon: l'heure, la météo, l'humeur, le budget. Ton chaleureux, court, "chocobi" (pidgin léger autorisé).
Réponds UNIQUEMENT via l'outil suggest_dishes avec 4 suggestions personnalisées.`;

    const userMsg = `Contexte:
- Ville: ${data.city}
- Météo: ${data.weather}
- Moment: ${data.timeLabel}
- Humeur: ${data.mood}
- Budget max: ${data.budget} FCFA
- Demande du client: "${data.prompt || "(libre)"}"

Suggère 4 plats parfaits. Chaque "why" en 1 phrase, mentionne explicitement un facteur (météo/humeur/budget/heure).`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_dishes",
            description: "Renvoie 4 suggestions de plats personnalisées",
            parameters: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      resto: { type: "string" },
                      price: { type: "number" },
                      rating: { type: "number" },
                      eta: { type: "string" },
                      why: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                    },
                    required: ["name", "resto", "price", "rating", "eta", "why", "tags"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_dishes" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Mboa AI est très demandé, réessaie dans un instant.");
      if (res.status === 402) throw new Error("Crédits Lovable AI épuisés.");
      throw new Error(`AI gateway error ${res.status}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { suggestions: [] };
    return { suggestions: args.suggestions as Suggestion[] };
  });
