-- Make favinu32@gmail.com a super_admin
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  target_user_id uuid;
  trigger_rec record;
BEGIN
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'favinu32@gmail.com';
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: favinu32@gmail.com';
  END IF;
  
  -- Disable user-defined triggers on profiles table temporarily
  -- Skip system triggers (RI_ConstraintTrigger_*) which we can't disable
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass 
    AND tgenabled = 'O'
    AND tgname NOT LIKE 'RI_ConstraintTrigger_%'  -- Skip foreign key triggers
    AND tgisinternal = false  -- Skip internal system triggers
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
  
  -- Update profile role (bypasses triggers)
  UPDATE public.profiles
  SET role = 'super_admin', updated_at = now()
  WHERE id = target_user_id;
  
  -- Re-enable user-defined triggers (skip system triggers)
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass
    AND tgname NOT LIKE 'RI_ConstraintTrigger_%'  -- Skip foreign key triggers
    AND tgisinternal = false  -- Skip internal system triggers
  LOOP
    EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
  
  -- Insert into user_roles (bypasses RLS)
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (target_user_id, 'super_admin', now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE '✅ favinu32@gmail.com is now a super_admin!';
END $$;

