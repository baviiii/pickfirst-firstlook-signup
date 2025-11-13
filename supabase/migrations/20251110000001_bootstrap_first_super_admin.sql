-- Bootstrap function to create the first super_admin
-- This function bypasses RLS and can only be used when no super_admins exist
-- After creating the first super_admin, use SecurityService.updateUserRole() for future admins

CREATE OR REPLACE FUNCTION public.bootstrap_first_super_admin(_user_email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
  existing_super_admin_count integer;
  trigger_rec record;
BEGIN
  -- Check if any super_admins already exist
  SELECT COUNT(*) INTO existing_super_admin_count
  FROM public.user_roles
  WHERE role = 'super_admin';
  
  IF existing_super_admin_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Super admins already exist. Use SecurityService.updateUserRole() instead.'
    );
  END IF;
  
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
  
  -- Temporarily disable user-defined triggers on profiles table
  -- Skip system triggers (RI_ConstraintTrigger_*) which we can't disable
  -- This bypasses any block_role_changes trigger that prevents role updates
  FOR trigger_rec IN 
    SELECT tgname FROM pg_trigger 
    WHERE tgrelid = 'public.profiles'::regclass 
    AND tgenabled = 'O'
    AND tgname NOT LIKE 'RI_ConstraintTrigger_%'  -- Skip foreign key triggers
    AND tgisinternal = false  -- Skip internal system triggers
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', trigger_rec.tgname);
  END LOOP;
  
  -- Update profile role (bypasses triggers because they're disabled)
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
  
  -- Insert into user_roles (bypasses RLS because function is SECURITY DEFINER)
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (target_user_id, 'super_admin', now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'First super_admin created successfully',
    'user_id', target_user_id,
    'email', _user_email
  );
END;
$$;

COMMENT ON FUNCTION public.bootstrap_first_super_admin IS 'One-time bootstrap function to create the first super_admin. Only works when no super_admins exist. After this, use SecurityService.updateUserRole() for future admins.';

-- Grant execute to authenticated users (they can call it, but it will only work if no super_admins exist)
GRANT EXECUTE ON FUNCTION public.bootstrap_first_super_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_super_admin(text) TO service_role;

