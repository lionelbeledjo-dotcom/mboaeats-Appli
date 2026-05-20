
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template text NOT NULL,
  related_id uuid,
  subject text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_email_log_dedup ON public.email_log(related_id, template);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON public.email_log(recipient);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON public.email_log(sent_at DESC);

-- Anti-doublon strict : 1 seul email par (template, related_id) quand related_id présent
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_log_template_related
  ON public.email_log(template, related_id)
  WHERE related_id IS NOT NULL;

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read email_log" ON public.email_log;
CREATE POLICY "admins read email_log"
  ON public.email_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
