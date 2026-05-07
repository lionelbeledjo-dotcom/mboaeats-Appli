import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const HOST = "https://mboaeat.site";

const STATIC_PATHS = [
  "", "decouvrir", "recherche", "tablee", "mboapass", "fidelite",
  "parrainage", "mboa-ai", "devenir-livreur", "devenir-resto",
  "aide", "contact", "confidentialite",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data: restos } = await supabaseAdmin
          .from("restaurants")
          .select("slug, updated_at")
          .eq("is_active", true)
          .limit(500);

        const urls: string[] = [];
        for (const p of STATIC_PATHS) {
          urls.push(`<url><loc>${HOST}/${p}</loc><changefreq>weekly</changefreq></url>`);
        }
        for (const r of restos ?? []) {
          urls.push(
            `<url><loc>${HOST}/r/${r.slug}</loc><lastmod>${new Date(r.updated_at).toISOString()}</lastmod></url>`,
          );
        }
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
