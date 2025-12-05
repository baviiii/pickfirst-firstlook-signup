-- Allow users to view their own emails from email_queue
-- This is needed so users can see their property alert emails

CREATE POLICY "Users can view their own emails" 
  ON public.email_queue
  FOR SELECT
  TO authenticated
  USING (
    -- Users can view emails sent to their own email address (case-insensitive)
    EXISTS (
      SELECT 1 
      FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND lower(profiles.email) = lower(email_queue.email)
    )
  );

COMMENT ON POLICY "Users can view their own emails" ON public.email_queue IS 
  'Allows authenticated users to view emails sent to their own email address from email_queue';

