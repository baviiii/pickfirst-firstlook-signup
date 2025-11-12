BEGIN;

CREATE TABLE IF NOT EXISTS public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_queue_status_scheduled_idx ON public.email_queue (status, scheduled_for);
CREATE INDEX IF NOT EXISTS email_queue_created_idx ON public.email_queue (created_at);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Email queue insert"
  ON public.email_queue
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

CREATE POLICY "Email queue select service"
  ON public.email_queue
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Email queue update service"
  ON public.email_queue
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Email queue delete service"
  ON public.email_queue
  FOR DELETE
  TO service_role
  USING (true);

CREATE TRIGGER update_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

