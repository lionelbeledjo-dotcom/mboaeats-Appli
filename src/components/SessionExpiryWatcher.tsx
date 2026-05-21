/**
 * MboaEats — SessionExpiryWatcher
 *
 * Pack Sécurité MVP : surveille l'expiration du JWT Supabase.
 *  - Activité < 5 min → refresh auto silencieux 5 min avant expiry.
 *  - Inactif → laisse expirer puis affiche une modal "session expirée".
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ACTIVITY_WINDOW_MS = 5 * 60 * 1000;
const REFRESH_BEFORE_MS = 5 * 60 * 1000;

async function resolveLoginRoute(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "/connexion";
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const list = (roles ?? []).map((r: any) => r.role);
    if (list.includes("restaurateur")) return "/restaurant/connexion";
    if (list.includes("livreur")) return "/livreur/connexion";
    if (list.includes("superadmin")) return "/superadmin/login";
    if (list.includes("admin")) return "/admin/login";
  } catch {}
  return "/connexion";
}

export function SessionExpiryWatcher() {
  const [expired, setExpired] = useState(false);
  const [loginRoute, setLoginRoute] = useState("/connexion");
  const lastActivityRef = useRef(Date.now());
  const navigate = useNavigate();
  const location = useLocation();

  // Track activity
  useEffect(() => {
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    const evts = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => evts.forEach((e) => window.removeEventListener(e, onActivity));
  }, []);

  // Poll session every minute
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) return;
        const expiresAtMs = (session.expires_at ?? 0) * 1000;
        const msToExpiry = expiresAtMs - Date.now();
        const isActive = Date.now() - lastActivityRef.current < ACTIVITY_WINDOW_MS;

        if (msToExpiry <= 0) {
          // Expired
          if (!cancelled) {
            setLoginRoute(await resolveLoginRoute());
            await supabase.auth.signOut().catch(() => {});
            setExpired(true);
          }
          return;
        }
        if (msToExpiry <= REFRESH_BEFORE_MS && isActive) {
          await supabase.auth.refreshSession().catch(() => {});
        }
      } catch (e) {
        console.warn("[session-watcher] tick failed", e);
      }
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  if (!expired) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl">⏰</div>
        <h2 className="mt-4 text-lg font-semibold">Votre session a expiré</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pour votre sécurité, reconnectez-vous pour continuer.
        </p>
        <button
          onClick={() => {
            const redirect = encodeURIComponent(location.pathname + location.searchStr);
            navigate({ to: loginRoute, search: { redirect } as any });
            setExpired(false);
          }}
          className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Se reconnecter
        </button>
      </div>
    </div>
  );
}
