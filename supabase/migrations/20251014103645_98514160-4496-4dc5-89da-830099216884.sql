-- Fix handle_new_user function to properly set free subscription tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta_role text := coalesce(nullif(new.raw_user_meta_data->>'user_type',''),'buyer');
BEGIN
  -- Ensure role is valid
  IF meta_role NOT IN ('buyer','agent','super_admin') THEN
    meta_role := 'buyer';
  END IF;

  -- Insert profile with FREE subscription tier by default
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    meta_role,
    'free',  -- Always start with free tier
    'inactive',  -- Inactive until they subscribe
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create default preferences for the new user
  INSERT INTO public.user_preferences (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;