-- Fix super admin permissions for feature_configurations and ensure they can read all users
-- This migration ensures super admins have proper access

-- ==========================
-- FEATURE CONFIGURATIONS
-- ==========================

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins manage features" ON public.feature_configurations;
DROP POLICY IF EXISTS "Super admins can manage feature configurations" ON public.feature_configurations;

-- Create comprehensive policy for super admins to manage feature configurations
CREATE POLICY "Super admins manage features" ON public.feature_configurations 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ==========================
-- PROFILES - ENSURE SUPER ADMIN CAN READ ALL
-- ==========================

-- The existing policy should work, but let's ensure it's correct
-- Drop and recreate to be sure
DROP POLICY IF EXISTS "Super admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Super admins update all" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;

-- Create policies using has_role function (checks user_roles table)
CREATE POLICY "Super admins view all profiles" ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins update all profiles" ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins delete profiles" ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'));

-- ==========================
-- VERIFY SUPER ADMIN ROLE EXISTS
-- ==========================

-- Ensure all super_admin profiles have corresponding user_roles entry
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 'super_admin'::app_role, created_at 
FROM public.profiles 
WHERE role = 'super_admin'
ON CONFLICT (user_id, role) DO NOTHING;

COMMENT ON POLICY "Super admins manage features" ON public.feature_configurations IS 'Allows super admins to manage all feature gate configurations';
COMMENT ON POLICY "Super admins view all profiles" ON public.profiles IS 'Allows super admins to view all user profiles';
COMMENT ON POLICY "Super admins update all profiles" ON public.profiles IS 'Allows super admins to update any user profile';

