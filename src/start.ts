import { createStart, createMiddleware } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

/**
 * Pack Sécurité MVP — headers HTTP sécurisés sur toutes les réponses SSR.
 */
const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  try {
    const r: any = result as any;
    const headers: Headers | undefined = r?.response?.headers ?? r?.headers;
    if (headers && typeof headers.set === "function") {
      headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      headers.set("X-Frame-Options", "DENY");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
      // CSP volontairement permissive sur scripts/styles (Vite + Tailwind) ;
      // restreint frames, images, connexions externes.
      headers.set(
        "Content-Security-Policy",
        [
          "default-src 'self'",
          "img-src 'self' https://*.supabase.co https://images.unsplash.com data: blob:",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' data:",
          "connect-src 'self' https://*.supabase.co https://api.campay.net wss://*.supabase.co",
          "frame-ancestors 'none'",
        ].join("; "),
      );
    }
  } catch (e) {
    console.warn("[security-headers] failed to set headers", e);
  }
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
  functionMiddleware: [attachSupabaseAuth],
}));
