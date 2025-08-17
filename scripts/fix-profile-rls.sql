-- Fix RLS policies to allow all users to edit their own profiles
-- Run this in the Supabase SQL editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create comprehensive policies that allow all users to manage their own profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile if needed
CREATE POLICY "Users can delete their own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Ensure the profiles table has proper columns for profile data
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update default role handling
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'buyer';

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';