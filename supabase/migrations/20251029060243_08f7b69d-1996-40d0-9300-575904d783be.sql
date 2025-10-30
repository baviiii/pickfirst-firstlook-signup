-- Fix agent_public_profiles to include contact info and make it publicly accessible

-- Drop and recreate the view with contact fields (agents need email/phone public)
DROP VIEW IF EXISTS public.agent_public_profiles;

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

-- Grant public access to agent profiles (this is safe - only shows agent-specific fields)
GRANT SELECT ON public.agent_public_profiles TO anon;
GRANT SELECT ON public.agent_public_profiles TO authenticated;