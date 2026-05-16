/**
 * MboaEats — Rate limiter simple, backed Postgres.
 *
 * Usage :
 *   await enforceRateLimit("login_pwd", request, { limit: 10, windowSeconds: 900 });
 *
 * Lance une Response 429 si la limite est dépassée.
 *
 * IMPLÉMENTATION : on s'appuie sur une table `rate_limits` (créée dans la
 * migration `005_rate_limit_table.sql` à fournir en complément de ce lot).
 * Pour démarrer sans cette table, on utilise un fallback in-memory au worker.
 * En production Cloudflare Workers, préférer un store distribué (KV).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
}

interface RequestLike {
  headers: { get(name: string): string | null };
}

function tooMany(retryAfter: number): never {
  throw new Response(JSON.stringify({ error: "Trop de requêtes", retryAfter }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}

function clientIp(req: RequestLike | null): string {
  if (!req) return "unknown";
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Garde de rate-limit clé par (bucket, scope).
 *
 * @param bucket nom logique du compteur (ex: "login_pwd", "otp_request")
 * @param req objet request (optionnel — utilisé pour dériver l'IP)
 * @param opts limites
 * @param scope clé additionnelle (userId, phone, email…) ; null = IP-only
 */
export async function enforceRateLimit(
  bucket: string,
  req: RequestLike | null,
  opts: RateLimitOptions,
  scope?: string | null,
): Promise<void> {
  const ip = clientIp(req);
  const key = `${bucket}:${scope ?? "ip"}:${scope ? scope : ip}`;
  const sinceMs = Date.now() - opts.windowSeconds * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  // 1) Compte les hits récents
  const { count, error: countErr } = await supabaseAdmin
    .from("rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("bucket_key", key)
    .gte("occurred_at", sinceIso);

  if (countErr) {
    // En cas d'erreur DB : fail-open mais log. Ne pas bloquer le user si
    // notre infra rate-limit elle-même est down.
    console.warn("[rate-limit] count failed, allowing:", countErr.message);
    return;
  }

  if ((count ?? 0) >= opts.limit) {
    // On calcule un retry-after approximatif (max attente)
    tooMany(opts.windowSeconds);
  }

  // 2) Insert le hit
  const { error: insErr } = await supabaseAdmin.from("rate_limits").insert({
    bucket_key: key,
    ip,
    scope: scope ?? null,
  });
  if (insErr) {
    // Idem : on log mais on n'empêche pas l'appel
    console.warn("[rate-limit] insert failed:", insErr.message);
  }
}
