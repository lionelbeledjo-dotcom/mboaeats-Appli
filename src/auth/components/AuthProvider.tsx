/**
 * MboaEats — AuthProvider racine.
 *
 * À monter UNE FOIS dans `__root.tsx`, à l'intérieur du QueryClientProvider.
 *
 *   <QueryClientProvider client={queryClient}>
 *     <AuthProvider>
 *       <App />
 *     </AuthProvider>
 *   </QueryClientProvider>
 *
 * Responsabilités :
 *   - Synchroniser les events Supabase Auth → React Query (useSyncSupabaseAuthEvents)
 *   - Initialiser le restaurant courant (useSyncCurrentRestaurant)
 *
 * Pas de Context dédié : tous les consumers utilisent `useSession()` qui
 * lit React Query. Pas besoin de provider explicite pour ça.
 */

import { type ReactNode } from "react";
import { useSyncSupabaseAuthEvents } from "@/auth/hooks/useSession";
import { useSyncCurrentRestaurant } from "@/auth/hooks/useCurrentRestaurant";

export function AuthProvider({ children }: { children: ReactNode }) {
  useSyncSupabaseAuthEvents();
  useSyncCurrentRestaurant();
  return <>{children}</>;
}
