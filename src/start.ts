import { createStart } from "@tanstack/react-start";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { runAdminBootstrapRedirect } from "@/lib/admin-bootstrap-redirect";

// Bootstrap admin redirect — exécuté au tout premier import client du Start
// instance (avant le routeur, avant __root, avant tout composant).
if (typeof window !== "undefined") {
  console.log("[admin-bootstrap-redirect] [entry] start.ts loaded on client, href=", window.location.href);
  void runAdminBootstrapRedirect();
}

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
}));
