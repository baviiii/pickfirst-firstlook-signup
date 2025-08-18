-- This migration fixes the root cause of the client creation RLS error.
-- It updates the RLS policy on the 'profiles' table to allow agents to see the 'role' of other users,
-- which is necessary for the client creation logic to verify that a user is a 'buyer'.

-- Drop the existing SELECT policy if it exists, to avoid conflicts.
DROP POLICY IF EXISTS "Agents can view their own profile and buyer profiles" ON public.profiles;

-- Create a new, more permissive SELECT policy.
CREATE POLICY "Agents can view their own profile and buyer profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Rule 1: A user can always see their own profile.
  auth.uid() = id OR
  -- Rule 2: An agent can see the profiles of any user who is a 'buyer'.
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent' AND
    role = 'buyer'
  )
);
