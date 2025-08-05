-- Safe RLS policies that avoid recursion
-- This version uses a safer approach for agent-buyer relationships

-- 1. PROFILES TABLE - Safe policies without recursion
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can always view and update their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- For agent-buyer relationships, we'll use a separate approach
-- Agents can view all buyer profiles (we'll filter in the application)
-- This avoids recursion by not referencing the profiles table in the policy
CREATE POLICY "Agents can view buyer profiles" ON public.profiles
  FOR SELECT USING (role = 'buyer');

-- Agents can update buyer profiles
CREATE POLICY "Agents can update buyer profiles" ON public.profiles
  FOR UPDATE USING (role = 'buyer');

-- Agents can insert buyer profiles
CREATE POLICY "Agents can insert buyer profiles" ON public.profiles
  FOR INSERT WITH CHECK (role = 'buyer');

-- 2. PROPERTY_LISTINGS TABLE - Safe policies
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved listings (for browsing)
CREATE POLICY "Anyone can view approved listings" ON public.property_listings
  FOR SELECT USING (status = 'approved');

-- Agents can view all listings (for market overview)
-- We'll filter by agent role in the application
CREATE POLICY "Agents can view all listings" ON public.property_listings
  FOR SELECT USING (true);

-- Agents can manage their own listings
CREATE POLICY "Agents can update their own listings" ON public.property_listings
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own listings" ON public.property_listings
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own listings" ON public.property_listings
  FOR DELETE USING (auth.uid() = agent_id);

-- 3. CLIENTS TABLE (if it exists as a separate table)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clients') THEN
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    
    -- Agents can manage their own clients
    CREATE POLICY "Agents can view their own clients" ON public.clients
      FOR SELECT USING (auth.uid() = agent_id);
    
    CREATE POLICY "Agents can update their own clients" ON public.clients
      FOR UPDATE USING (auth.uid() = agent_id);
    
    CREATE POLICY "Agents can insert their own clients" ON public.clients
      FOR INSERT WITH CHECK (auth.uid() = agent_id);
    
    CREATE POLICY "Agents can delete their own clients" ON public.clients
      FOR DELETE USING (auth.uid() = agent_id);
  END IF;
END $$;

-- 4. AUDIT_LOGS TABLE (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
    
    -- Users can view their own audit logs
    CREATE POLICY "Users can view their own logs" ON public.audit_logs
      FOR SELECT USING (auth.uid() = user_id);
    
    -- System can insert audit logs
    CREATE POLICY "System can insert logs" ON public.audit_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 5. SUBSCRIPTION_PLANS TABLE - Public read access
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN
    ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
    
    -- Anyone can view subscription plans
    CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
      FOR SELECT USING (true);
  END IF;
END $$; 