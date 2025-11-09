-- Update helper so when an invited client completes signup, link their appointments
CREATE OR REPLACE FUNCTION public.link_client_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_id_from_metadata UUID;
BEGIN
  client_id_from_metadata := (NEW.raw_user_meta_data->>'client_id')::UUID;

  IF client_id_from_metadata IS NOT NULL THEN
    UPDATE public.clients
    SET
      user_id = NEW.id,
      email = NEW.email,
      invite_accepted_at = NOW(),
      updated_at = NOW()
    WHERE id = client_id_from_metadata
      AND user_id IS NULL;

    -- Backfill any appointments created before signup
    UPDATE public.appointments
    SET client_id = NEW.id,
        updated_at = NOW()
    WHERE client_id IS NULL
      AND lower(client_email) = lower(NEW.email);
  END IF;

  RETURN NEW;
END;
$$;
