-- 1) Étendre tg_notify_order_status pour notifier aussi le restaurateur
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

  -- Notification au client
  INSERT INTO public.notifications (user_id, type, title, body, link, data)
  VALUES (NEW.user_id, 'order', v_title, v_body, '/suivi/' || NEW.id::text,
          jsonb_build_object('order_id', NEW.id, 'reference', NEW.reference, 'status', NEW.status));

  -- Notification au restaurateur sur events utiles
  IF (TG_OP = 'INSERT') OR (NEW.status::text IN ('paid','cancelled','delivered')) THEN
    SELECT owner_id, name INTO v_owner, v_resto_name FROM public.restaurants WHERE id = NEW.restaurant_id;
    IF v_owner IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, data)
      VALUES (
        v_owner,
        'order',
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

  RETURN NEW;
END;
$function$;

-- Recréer les triggers (idempotent)
DROP TRIGGER IF EXISTS trg_orders_notify_insert ON public.orders;
DROP TRIGGER IF EXISTS trg_orders_notify_update ON public.orders;
CREATE TRIGGER trg_orders_notify_insert AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_order_status();
CREATE TRIGGER trg_orders_notify_update AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_order_status();

-- 2) Trigger paiement : notifier client + resto sur succès/échec
CREATE OR REPLACE FUNCTION public.tg_notify_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order RECORD;
  v_title text;
  v_body text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('succeeded','failed') THEN RETURN NEW; END IF;

  -- Trouver la commande liée via la référence stockée dans order_events
  SELECT o.* INTO v_order
  FROM public.orders o
  JOIN public.order_events e ON e.order_id = o.id
  WHERE e.event_type = 'payment'
    AND (e.payload->>'reference') = NEW.reference
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_order.id IS NULL THEN RETURN NEW; END IF;

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
$$;

DROP TRIGGER IF EXISTS trg_payments_notify ON public.payments;
CREATE TRIGGER trg_payments_notify AFTER UPDATE OF status ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_payment_status();