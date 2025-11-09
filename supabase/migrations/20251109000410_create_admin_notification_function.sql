BEGIN;

CREATE OR REPLACE FUNCTION public.get_admin_notification_emails()
RETURNS TABLE(email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE role IN ('super_admin', 'admin')
    AND email IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_notification_emails() TO authenticated;

COMMIT;

