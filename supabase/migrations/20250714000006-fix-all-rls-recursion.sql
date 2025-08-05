-- Fix RLS recursion issues for all tables
-- This migration ensures clean, non-recursive policies for all tables

-- Fix profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agents can update any profile" ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Fix property_listings table
ALTER TABLE public.property_listings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own listings" ON public.property_listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.property_listings;
DROP POLICY IF EXISTS "Users can insert their own listings" ON public.property_listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.property_listings;
DROP POLICY IF EXISTS "Agents can view all listings" ON public.property_listings;
DROP POLICY IF EXISTS "Agents can update all listings" ON public.property_listings;
DROP POLICY IF EXISTS "Super admin can view all listings" ON public.property_listings;
DROP POLICY IF EXISTS "Super admin can update all listings" ON public.property_listings;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own listings" ON public.property_listings
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Users can update their own listings" ON public.property_listings
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Users can insert their own listings" ON public.property_listings
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can delete their own listings" ON public.property_listings
  FOR DELETE USING (auth.uid() = agent_id);

-- Fix clients table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own clients" ON public.clients
      FOR SELECT USING (auth.uid() = agent_id);

    CREATE POLICY "Users can update their own clients" ON public.clients
      FOR UPDATE USING (auth.uid() = agent_id);

    CREATE POLICY "Users can insert their own clients" ON public.clients
      FOR INSERT WITH CHECK (auth.uid() = agent_id);

    CREATE POLICY "Users can delete their own clients" ON public.clients
      FOR DELETE USING (auth.uid() = agent_id);
  END IF;
END $$;

-- Fix audit_logs table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view their own logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Users can insert their own logs" ON public.audit_logs;
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own logs" ON public.audit_logs
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own logs" ON public.audit_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$; 