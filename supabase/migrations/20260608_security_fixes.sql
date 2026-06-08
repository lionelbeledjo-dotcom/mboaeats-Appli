-- ============================================================
-- CORRECTIF SÉCURITÉ MBOAEATS — Juin 2025
-- Résout les problèmes détectés par l'audit Lovable Security
-- ============================================================

-- ====== CRITIQUE 1 : Restreindre les abonnements Realtime ======
-- Par défaut Supabase permet à tout utilisateur authentifié de s'abonner
-- à n'importe quel canal. On restreint via les policies RLS sur les tables.
-- Les tables sensibles doivent avoir des policies SELECT strictes.

-- S'assurer que RLS est activé sur toutes les tables sensibles
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS disputes ENABLE ROW LEVEL SECURITY;

-- ====== CRITIQUE 2 : Vue avec SECURITY DEFINER ======
-- Les vues SECURITY DEFINER contournent RLS. On les passe en SECURITY INVOKER.
DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT viewname FROM pg_views
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v.viewname);
  END LOOP;
END $$;

-- ====== AVERTISSEMENT : Payments avec user_id NULL ======
-- Empêcher les paiements sans user_id d'être créés (sauf par service_role)
ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
-- Si la colonne ne peut pas être NOT NULL (paiements existants), on ajoute une policy :
-- DROP POLICY IF EXISTS "payments_own" ON payments;
-- CREATE POLICY "payments_own" ON payments FOR ALL USING (user_id = auth.uid());

-- ====== AVERTISSEMENT : Restaurants inactifs exposés ======
-- Supprimer la politique SELECT publique qui expose les restaurants inactifs
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'restaurants' AND cmd = 'SELECT'
  LOOP
    -- On supprime toutes les policies SELECT pour les recréer proprement
    EXECUTE format('DROP POLICY IF EXISTS %I ON restaurants', pol.policyname);
  END LOOP;
END $$;

-- Recréer une seule policy SELECT : seuls les restaurants actifs sont publics
CREATE POLICY "restaurants_public_active" ON restaurants
  FOR SELECT USING (is_active = true AND status = 'approved');

-- Les propriétaires voient aussi leurs propres restaurants (même inactifs)
CREATE POLICY "restaurants_owner_all" ON restaurants
  FOR SELECT USING (owner_id = auth.uid());

-- Policy pour INSERT/UPDATE/DELETE par le propriétaire
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'restaurants_owner_write' AND tablename = 'restaurants') THEN
    EXECUTE 'CREATE POLICY "restaurants_owner_write" ON restaurants FOR ALL USING (owner_id = auth.uid())';
  END IF;
END $$;

-- ====== AVERTISSEMENT : otp_codes et auth_codes sans policy ======
ALTER TABLE IF EXISTS otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auth_codes ENABLE ROW LEVEL SECURITY;

-- Personne ne doit lire ces tables directement (accès uniquement via server functions)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'otp_codes' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "otp_deny_all" ON otp_codes';
    EXECUTE 'CREATE POLICY "otp_deny_all" ON otp_codes FOR ALL USING (false)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auth_codes' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "auth_codes_deny_all" ON auth_codes';
    EXECUTE 'CREATE POLICY "auth_codes_deny_all" ON auth_codes FOR ALL USING (false)';
  END IF;
END $$;

-- ====== AVERTISSEMENT : phone_users sans RLS ======
ALTER TABLE IF EXISTS phone_users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phone_users' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "phone_users_own" ON phone_users';
    EXECUTE 'CREATE POLICY "phone_users_own" ON phone_users FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;

-- ====== AVERTISSEMENT : Fonctions SECURITY DEFINER exécutables par public ======
-- Révoquer l'exécution publique des fonctions SECURITY DEFINER
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM public',
      fn.proname, fn.args
    );
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
      fn.proname, fn.args
    );
    -- Garder l'accès pour authenticated si nécessaire
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
      fn.proname, fn.args
    );
  END LOOP;
END $$;

-- ====== AVERTISSEMENT : Extension en public ======
-- Note: Déplacer les extensions hors du schéma public nécessite un accès
-- superuser Supabase. On peut créer un schéma dédié si besoin futur.
-- Pour l'instant, c'est un avertissement mineur non bloquant.
