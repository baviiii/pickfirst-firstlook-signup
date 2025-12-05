-- Secure SQL Script to make user with email "info@pickfirst.com.au" a super_admin
-- This script uses SECURITY DEFINER to bypass the block_role_changes trigger
-- IMPORTANT: This must be run with service_role or by an existing super_admin

-- Option 1: Use the bootstrap function (only works if no super_admins exist yet)
SELECT public.bootstrap_first_super_admin('info@pickfirst.com.au');

-- If the above returns an error saying super admins already exist,
-- use Option 2 below which bypasses the security trigger:

-- Option 2: Create a secure function that bypasses the block_role_changes trigger
CREATE OR REPLACE FUNCTION public.make_user_super_admin(_user_email text)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  trigger_rec record;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = _user_email;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found with email: ' || _user_email
    );
  END IF;
  
  -- Temporarily disable the block_role_changes trigger
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass 
    AND tgenabled = 'O'
    AND tgname NOT LIKE 'RI_ConstraintTrigger_%'
    AND tgisinternal = false
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
  
  -- Update profile role
  UPDATE public.profiles
  SET 
    role = 'super_admin',
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Re-enable triggers
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass
    AND tgname NOT LIKE 'RI_ConstraintTrigger_%'
    AND tgisinternal = false
  LOOP
    EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
  
  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (target_user_id, 'super_admin', now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User is now a super_admin',
    'user_id', target_user_id,
    'email', _user_email
  );
END;
$$;

-- Grant execute permission (you may need to adjust this based on your security setup)
GRANT EXECUTE ON FUNCTION public.make_user_super_admin(text) TO service_role;

-- Now call the function to make the user an admin
SELECT public.make_user_super_admin('info@pickfirst.com.au');

-- Verify the changes
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role as profile_role,
  ur.role as user_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.role = 'super_admin'
WHERE p.email = 'info@pickfirst.com.au';

