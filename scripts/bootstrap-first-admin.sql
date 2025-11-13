-- ============================================================
-- BOOTSTRAP FIRST SUPER ADMIN - Run this in Supabase SQL Editor
-- ============================================================
-- 
-- This script creates the first super_admin user.
-- Replace 'your-email@example.com' with your actual email address.
--
-- After running this, you can use SecurityService.updateUserRole()
-- to create additional super_admins through the application.
--
-- ============================================================

-- Option 1: Use the bootstrap function (recommended)
-- Replace 'your-email@example.com' with your email
SELECT public.bootstrap_first_super_admin('your-email@example.com');

-- Option 2: Direct SQL (bypasses triggers) - USE THIS IF FUNCTION DOESN'T WORK
-- Replace 'your-email@example.com' with your email and run:

/*
DO $$
DECLARE
  target_user_id uuid;
  existing_super_admin_count integer;
  trigger_name text;
BEGIN
  -- Check if any super_admins already exist
  SELECT COUNT(*) INTO existing_super_admin_count
  FROM public.user_roles
  WHERE role = 'super_admin';
  
  IF existing_super_admin_count > 0 THEN
    RAISE EXCEPTION 'Super admins already exist. Use SecurityService.updateUserRole() instead.';
  END IF;
  
  -- Find user by email (REPLACE THIS EMAIL!)
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'your-email@example.com';  -- ⚠️ CHANGE THIS!
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with that email';
  END IF;
  
  -- Disable ALL triggers on profiles table temporarily
  -- This bypasses any block_role_changes trigger
  FOR trigger_name IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass 
    AND tgenabled = 'O'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', trigger_name);
  END LOOP;
  
  -- Update profile role (now bypasses triggers)
  UPDATE public.profiles
  SET role = 'super_admin', updated_at = now()
  WHERE id = target_user_id;
  
  -- Re-enable all triggers
  FOR trigger_name IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', trigger_name);
  END LOOP;
  
  -- Insert into user_roles (bypasses RLS because we're running as postgres)
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (target_user_id, 'super_admin', now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE '✅ First super_admin created successfully for user: %', target_user_id;
END $$;
*/

-- ============================================================
-- VERIFY IT WORKED
-- ============================================================
-- After running, verify with:
-- SELECT p.email, p.role, ur.role as user_role
-- FROM profiles p
-- LEFT JOIN user_roles ur ON p.id = ur.user_id
-- WHERE p.email = 'your-email@example.com';

