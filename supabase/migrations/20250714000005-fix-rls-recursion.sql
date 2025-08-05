-- Fix RLS recursion issue for profiles table
-- This migration ensures clean, non-recursive policies

-- First, disable RLS temporarily to clean up
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agents can update any profile" ON public.profiles;

-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add a simple policy for super admins (if needed later)
-- This can be added back with proper role checking if needed
-- CREATE POLICY "Super admins can view all profiles" ON public.profiles
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles 
--       WHERE id = auth.uid() AND role = 'super_admin'
--     )
--   ); 