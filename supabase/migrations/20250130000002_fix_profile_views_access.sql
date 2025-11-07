-- Fix profile views to ensure proper access for messaging
-- This ensures buyers can view agent profiles and agents can view buyer profiles
-- Views with security_barrier still respect RLS, so we need to ensure they work properly

-- Create helper function to get agent profile (bypasses RLS for view)
CREATE OR REPLACE FUNCTION public.get_agent_public_profile(agent_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  bio text,
  company text,
  avatar_url text,
  location text,
  website text,
  created_at timestamptz
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.bio,
    p.company,
    p.avatar_url,
    p.location,
    p.website,
    p.created_at
  FROM profiles p
  WHERE p.id = agent_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id 
      AND ur.role = 'agent'::app_role
    );
END;
$$;

-- Create helper function to get buyer profile (bypasses RLS for view)
CREATE OR REPLACE FUNCTION public.get_buyer_public_profile(buyer_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  bio text,
  avatar_url text,
  location text,
  created_at timestamptz
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.bio,
    p.avatar_url,
    p.location,
    p.created_at
  FROM profiles p
  WHERE p.id = buyer_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.id 
      AND ur.role = 'buyer'::app_role
    );
END;
$$;

-- Ensure agent_public_profiles is accessible to all authenticated users (including buyers)
DROP VIEW IF EXISTS public.agent_public_profiles CASCADE;

CREATE VIEW public.agent_public_profiles 
WITH (security_barrier = true) AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.bio,
  p.company,
  p.avatar_url,
  p.location,
  p.website,
  p.created_at
FROM profiles p
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id 
  AND ur.role = 'agent'::app_role
);

-- Grant access to all authenticated users (buyers need to see agents in messages)
GRANT SELECT ON public.agent_public_profiles TO authenticated;
GRANT SELECT ON public.agent_public_profiles TO anon;

-- Ensure buyer_public_profiles is accessible to authenticated users (agents need to see buyers)
DROP VIEW IF EXISTS public.buyer_public_profiles CASCADE;

CREATE VIEW public.buyer_public_profiles 
WITH (security_barrier = true) AS
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.bio,
  p.avatar_url,
  p.location,
  p.created_at
FROM profiles p
WHERE EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = p.id 
  AND ur.role = 'buyer'::app_role
);

-- Grant access to authenticated users (agents need to see buyers in messages)
GRANT SELECT ON public.buyer_public_profiles TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.get_agent_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_buyer_public_profile(uuid) TO authenticated;

-- Add comments
COMMENT ON VIEW public.agent_public_profiles IS 'Public agent profiles accessible to all users for messaging';
COMMENT ON VIEW public.buyer_public_profiles IS 'Public buyer profiles accessible to agents for messaging';
COMMENT ON FUNCTION public.get_agent_public_profile(uuid) IS 'Helper function to get agent profile bypassing RLS';
COMMENT ON FUNCTION public.get_buyer_public_profile(uuid) IS 'Helper function to get buyer profile bypassing RLS';

