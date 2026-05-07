
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  push_enabled boolean NOT NULL DEFAULT true,
  inapp_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own prefs" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own prefs" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own prefs" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage prefs" ON public.notification_preferences
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_notif_prefs_updated
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Update order status notification function to respect inapp_enabled
CREATE OR REPLACE FUNCTION public.tg_notify_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_title text;
  v_body text;
  v_owner uuid;
  v_resto_name text;
  v_client_inapp boolean;
  v_owner_inapp boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := 'Commande reçue 🎉';
    v_body := 'Votre commande ' || NEW.reference || ' a été enregistrée.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status::text
      WHEN 'paid' THEN v_title := 'Paiement confirmé 💳'; v_body := 'Votre paiement pour ' || NEW.reference || ' est validé.';
      WHEN 'accepted' THEN v_title := 'Commande acceptée ✅'; v_body := 'Le restaurant prépare votre commande.';
      WHEN 'preparing' THEN v_title := 'En préparation 🍳'; v_body := 'Votre repas est en cours de préparation.';
      WHEN 'ready' THEN v_title := 'Prête à être livrée 📦'; v_body := 'Un livreur va prendre en charge votre commande.';
      WHEN 'picked_up' THEN v_title := 'Livreur en route 🛵'; v_body := 'Votre commande a été récupérée.';
      WHEN 'delivering' THEN v_title := 'Bientôt chez vous 🚀'; v_body := 'Le livreur arrive.';
      WHEN 'delivered' THEN v_title := 'Livrée ! 🎊'; v_body := 'Bon appétit ! N''oubliez pas de noter le restaurant.';
      WHEN 'cancelled' THEN v_title := 'Commande annulée'; v_body := 'Votre commande a été annulée.';
      ELSE RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  SELECT COALESCE(inapp_enabled, true) INTO v_client_inapp FROM public.notification_preferences WHERE user_id = NEW.user_id;
  IF COALESCE(v_client_inapp, true) THEN
    INSERT INTO public.notifications (user_id, type, title, body, link, data)
    VALUES (NEW.user_id, 'order', v_title, v_body, '/suivi/' || NEW.id::text,
            jsonb_build_object('order_id', NEW.id, 'reference', NEW.reference, 'status', NEW.status));
  END IF;

  IF (TG_OP = 'INSERT') OR (NEW.status::text IN ('paid','cancelled','delivered')) THEN
    SELECT owner_id, name INTO v_owner, v_resto_name FROM public.restaurants WHERE id = NEW.restaurant_id;
    IF v_owner IS NOT NULL THEN
      SELECT COALESCE(inapp_enabled, true) INTO v_owner_inapp FROM public.notification_preferences WHERE user_id = v_owner;
      IF COALESCE(v_owner_inapp, true) THEN
        INSERT INTO public.notifications (user_id, type, title, body, link, data)
        VALUES (
          v_owner, 'order',
          CASE
            WHEN TG_OP = 'INSERT' THEN '🛎️ Nouvelle commande'
            WHEN NEW.status::text = 'paid' THEN '💰 Paiement reçu'
            WHEN NEW.status::text = 'cancelled' THEN '❌ Commande annulée'
            WHEN NEW.status::text = 'delivered' THEN '✅ Commande livrée'
            ELSE 'Mise à jour commande'
          END,
          'Commande ' || NEW.reference || ' — ' || COALESCE((NEW.total/1.0)::text, '0') || ' FCFA',
          '/restaurant',
          jsonb_build_object('order_id', NEW.id, 'reference', NEW.reference, 'status', NEW.status)
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tg_notify_payment_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_title text;
  v_body text;
  v_inapp boolean;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('succeeded','failed') THEN RETURN NEW; END IF;

  SELECT o.* INTO v_order
  FROM public.orders o
  JOIN public.order_events e ON e.order_id = o.id
  WHERE e.event_type = 'payment'
    AND (e.payload->>'reference') = NEW.reference
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_order.id IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(inapp_enabled, true) INTO v_inapp FROM public.notification_preferences WHERE user_id = v_order.user_id;
  IF NOT COALESCE(v_inapp, true) THEN RETURN NEW; END IF;

  IF NEW.status = 'succeeded' THEN
    v_title := '💳 Paiement réussi';
    v_body := 'Votre paiement de ' || NEW.amount_fcfa || ' FCFA pour ' || v_order.reference || ' est confirmé.';
  ELSE
    v_title := '⚠️ Paiement échoué';
    v_body := 'Le paiement pour ' || v_order.reference || ' n''a pas abouti. Réessayez ou changez de moyen.';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link, data)
  VALUES (v_order.user_id, 'payment', v_title, v_body, '/suivi/' || v_order.id::text,
          jsonb_build_object('order_id', v_order.id, 'payment_status', NEW.status, 'amount', NEW.amount_fcfa));

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.tg_notify_order_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_payment_status() FROM PUBLIC, anon, authenticated;
