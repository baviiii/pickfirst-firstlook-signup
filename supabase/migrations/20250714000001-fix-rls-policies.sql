-- Fix infinite recursion in RLS policies

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;

-- Ensure the basic policies are in place (these should already exist from the original migration)
-- Users can view their own profile
CREATE POLICY IF NOT EXISTS "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY IF NOT EXISTS "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY IF NOT EXISTS "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Note: Super admin policies removed to prevent recursion
-- We can add them back later with a different approach if needed 