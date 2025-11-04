-- Fix: Update handle_new_user trigger to set role in profiles table
-- This ensures that when users sign up as agents, their profile.role is set correctly

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_role text := coalesce(nullif(new.raw_user_meta_data->>'user_type',''),'buyer');
  user_role app_role;
BEGIN
  -- Validate and normalize role
  IF meta_role NOT IN ('buyer','agent','super_admin') THEN 
    meta_role := 'buyer'; 
  END IF;
  user_role := meta_role::app_role;
  
  -- Insert profile WITH role field set correctly
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role,  -- ✅ NOW SETTING ROLE!
    subscription_tier, 
    subscription_status, 
    created_at, 
    updated_at
  )
  VALUES (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name',''), 
    meta_role,  -- ✅ SET ROLE FROM METADATA!
    'free', 
    'inactive', 
    now(), 
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role;  -- ✅ UPDATE ROLE IF PROFILE ALREADY EXISTS
  
  -- Insert into user_roles table (for role-based access control)
  INSERT INTO public.user_roles (user_id, role, created_at) 
  VALUES (new.id, user_role, now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Insert default preferences
  INSERT INTO public.user_preferences (user_id) 
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile with correct role from user_metadata.user_type on signup';
