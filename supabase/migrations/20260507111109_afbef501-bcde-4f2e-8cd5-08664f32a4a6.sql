
-- Notifications table for in-app + realtime push
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.restaurants r WHERE r.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage notifications"
  ON public.notifications FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Auto-create order notifications via trigger
CREATE OR REPLACE FUNCTION public.tg_notify_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
  v_body text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := 'Commande reçue 🎉';
    v_body := 'Votre commande ' || NEW.reference || ' a été enregistrée.';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    CASE NEW.status::text
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

  INSERT INTO public.notifications (user_id, type, title, body, link, data)
  VALUES (NEW.user_id, 'order', v_title, v_body, '/suivi/' || NEW.id::text,
          jsonb_build_object('order_id', NEW.id, 'reference', NEW.reference, 'status', NEW.status));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_notify_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_order_status();

CREATE TRIGGER trg_orders_notify_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_order_status();
