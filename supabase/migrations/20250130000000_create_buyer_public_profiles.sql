-- Create buyer_public_profiles view for messaging and profile viewing
-- This allows agents to view buyer profiles when they're in conversations

-- Drop and recreate the view with contact fields
DROP VIEW IF EXISTS public.buyer_public_profiles;

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

-- Grant access to authenticated users (agents need to see buyers they're messaging)
GRANT SELECT ON public.buyer_public_profiles TO authenticated;

-- Note: We don't grant to anon since buyers should only be visible to authenticated agents
-- in the context of conversations

COMMENT ON VIEW public.buyer_public_profiles IS 'Public buyer profiles for agents to view when in conversations';

