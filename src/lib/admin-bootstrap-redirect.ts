import { supabase } from "@/integrations/supabase/client";

const CLIENT_HOSTS = new Set(["mboaeat.site", "www.mboaeat.site"]);
const ADMIN_TARGET = "https://admin.mboaeat.site/admin";
const ADMIN_ROLES = ["admin", "superadmin"];

type BootstrapRedirectResult = "done" | "redirecting";

let bootstrapRedirectPromise: Promise<BootstrapRedirectResult> | null = null;

function hasOAuthAccessTokenFragment() {
  return typeof window !== "undefined" && window.location.hash.includes("access_token=");
}

async function hydrateSessionFromOAuthFragment() {
  if (!hasOAuthAccessTokenFragment()) return;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  } else {
    await supabase.auth.getSession();
  }
}

export function runAdminBootstrapRedirect(): Promise<BootstrapRedirectResult> {
  if (bootstrapRedirectPromise) return bootstrapRedirectPromise;

  bootstrapRedirectPromise = (async () => {
    if (typeof window === "undefined") return "done";
    if (!CLIENT_HOSTS.has(window.location.hostname.toLowerCase())) return "done";

    try {
      await hydrateSessionFromOAuthFragment();

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return "done";

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ADMIN_ROLES)
        .limit(1);

      if (!roles?.length) return "done";

      window.location.replace(ADMIN_TARGET);
      return "redirecting";
    } catch (error) {
      console.warn("[admin-bootstrap-redirect] skipped", error);
      return "done";
    }
  })();

  return bootstrapRedirectPromise;
}
