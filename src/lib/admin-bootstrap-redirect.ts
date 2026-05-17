import { supabase } from "@/integrations/supabase/client";

const CLIENT_HOSTS = new Set(["mboaeat.site", "www.mboaeat.site"]);
const ADMIN_TARGET = "https://admin.mboaeat.site/admin";
const ADMIN_ROLES = ["admin", "superadmin"] as const;
const LOG = "[admin-bootstrap-redirect]";

type BootstrapRedirectResult = "done" | "redirecting";

let bootstrapRedirectPromise: Promise<BootstrapRedirectResult> | null = null;
let bootstrapRedirectResult: BootstrapRedirectResult | "pending" = "pending";

function neverRenderDuringRedirect(): Promise<never> {
  return new Promise(() => undefined);
}

function hasOAuthAccessTokenFragment() {
  return typeof window !== "undefined" && window.location.hash.includes("access_token=");
}

async function hydrateSessionFromOAuthFragment() {
  const hasFragment = hasOAuthAccessTokenFragment();
  console.log(`${LOG} [step] hydrateSessionFromOAuthFragment — hasFragment=`, hasFragment, "hash=", typeof window !== "undefined" ? window.location.hash : "(no window)");
  if (!hasFragment) return;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  console.log(`${LOG} [step] fragment parsed — accessToken=`, accessToken ? `present(len=${accessToken.length})` : "MISSING", "refreshToken=", refreshToken ? "present" : "MISSING");

  if (accessToken && refreshToken) {
    console.log(`${LOG} [step] calling supabase.auth.setSession(...)`);
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    console.log(`${LOG} [step] setSession result — userId=`, data?.session?.user?.id ?? "(no user)", "error=", error?.message ?? null);
  } else {
    console.log(`${LOG} [step] missing refresh_token, falling back to supabase.auth.getSession()`);
    const { data, error } = await supabase.auth.getSession();
    console.log(`${LOG} [step] fallback getSession — userId=`, data?.session?.user?.id ?? "(no user)", "error=", error?.message ?? null);
  }
}

export function runAdminBootstrapRedirect(): Promise<BootstrapRedirectResult> {
  if (bootstrapRedirectPromise) {
    console.log(`${LOG} [skip] already running — returning cached promise`);
    return bootstrapRedirectPromise;
  }

  bootstrapRedirectPromise = (async () => {
    console.log(`${LOG} ===== START =====`);

    if (typeof window === "undefined") {
      console.log(`${LOG} [exit] no window (SSR)`);
      return "done";
    }

    const hostname = window.location.hostname.toLowerCase();
    const matchesClientHost = CLIENT_HOSTS.has(hostname);
    console.log(`${LOG} [check] hostname=`, hostname, "isClientHost=", matchesClientHost, "(allowed:", Array.from(CLIENT_HOSTS), ")");

    if (!matchesClientHost) {
      console.log(`${LOG} [exit] not a client host — nothing to do`);
      return "done";
    }

    try {
      await hydrateSessionFromOAuthFragment();

      console.log(`${LOG} [step] reading current session via supabase.auth.getSession()`);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      const userEmail = sessionData.session?.user?.email;
      console.log(`${LOG} [check] session hydrated? userId=`, userId ?? "(none)", "email=", userEmail ?? "(none)", "error=", sessionError?.message ?? null);

      if (!userId) {
        console.log(`${LOG} [exit] no session userId — cannot check roles, no redirect`);
        return "done";
      }

      console.log(`${LOG} [step] querying user_roles for userId=`, userId, "roles in", ADMIN_ROLES);
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ADMIN_ROLES)
        .limit(1);
      console.log(`${LOG} [result] user_roles query —`, "rows=", roles, "error=", rolesError?.message ?? null);

      if (!roles?.length) {
        console.log(`${LOG} [exit] no admin/superadmin role for this user — NO REDIRECT`);
        return "done";
      }

      console.log(`${LOG} [DECISION] admin role detected — role=`, roles[0]?.role, "REDIRECTING to", ADMIN_TARGET);
      window.location.replace(ADMIN_TARGET);
      return "redirecting";
    } catch (error) {
      console.warn(`${LOG} [catch] skipped due to error`, error);
      return "done";
    }
  })().then((result) => {
    bootstrapRedirectResult = result;
    console.log(`${LOG} ===== END ===== result=`, result);
    return result;
  });

  return bootstrapRedirectPromise;
}

export async function waitForAdminBootstrapRedirect(): Promise<void> {
  const result = await runAdminBootstrapRedirect();
  if (result === "redirecting") await neverRenderDuringRedirect();
}

export function getAdminBootstrapRedirectResult() {
  return bootstrapRedirectResult;
}
