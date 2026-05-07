import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth-middleware";

/**
 * Server-function middleware that enforces an authenticated user with the
 * `admin` role in `user_roles`. Chains on top of `requireSupabaseAuth`, so
 * the bearer token is validated first, then the role is checked against the
 * database with RLS as that user.
 *
 * Use on every server function that powers an /admin page so access control
 * cannot diverge between functions.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) {
      throw new Response(`Forbidden: ${error.message}`, { status: 403 });
    }
    if (!data) {
      throw new Response("Forbidden: admin role required", { status: 403 });
    }
    return next({ context: { isAdmin: true as const } });
  });
