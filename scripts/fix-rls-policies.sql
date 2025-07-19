-- Fix RLS policies that are causing infinite recursion
-- Run this in the Supabase SQL editor

-- 1. Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;

-- 2. Ensure basic policies are in place
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create the basic policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Update any existing users with 'broker' role to 'agent'
UPDATE public.profiles 
SET role = 'agent' 
WHERE role = 'broker';

-- 4. Ensure role constraint is correct
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('buyer', 'agent', 'super_admin'));

-- 5. Update default role to buyer
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'buyer';

-- 6. Update the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'agent' THEN 'agent'
      WHEN NEW.raw_user_meta_data->>'user_type' = 'super_admin' THEN 'super_admin'
      ELSE 'buyer'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Check current users and their roles
SELECT id, email, full_name, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC; 