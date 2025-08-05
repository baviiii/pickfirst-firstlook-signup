-- Final RLS policies for PickFirst platform
-- This handles the proper relationships between agents, buyers (clients), and property listings

-- 1. PROFILES TABLE - Handle both user profiles and clients
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can always view and update their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Agents can view profiles of buyers (clients) they've added
-- This allows agents to see buyer profiles they've created
CREATE POLICY "Agents can view buyer profiles" ON public.profiles
  FOR SELECT USING (
    role = 'buyer' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

-- Agents can update buyer profiles (clients) they've added
CREATE POLICY "Agents can update buyer profiles" ON public.profiles
  FOR UPDATE USING (
    role = 'buyer' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

-- Agents can insert buyer profiles (when adding new clients)
CREATE POLICY "Agents can insert buyer profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    role = 'buyer' AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

-- 2. PROPERTY_LISTINGS TABLE - Agent and buyer access
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved listings (for browsing)
CREATE POLICY "Anyone can view approved listings" ON public.property_listings
  FOR SELECT USING (status = 'approved');

-- Agents can view all listings (for market overview)
CREATE POLICY "Agents can view all listings" ON public.property_listings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

-- Agents can manage their own listings
CREATE POLICY "Agents can update their own listings" ON public.property_listings
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own listings" ON public.property_listings
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own listings" ON public.property_listings
  FOR DELETE USING (auth.uid() = agent_id);

-- 3. CLIENTS TABLE (if it exists as a separate table)
-- This would be for additional client data beyond the profile
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