-- Proper RLS policies from scratch
-- These policies are designed to avoid recursion and provide proper security

-- 1. PROFILES TABLE - Simple, clean policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. PROPERTY_LISTINGS TABLE - Agent-based policies
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

-- Agents can view all listings (for browsing)
CREATE POLICY "Anyone can view approved listings" ON public.property_listings
  FOR SELECT USING (status = 'approved');

-- Agents can manage their own listings
CREATE POLICY "Agents can view their own listings" ON public.property_listings
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own listings" ON public.property_listings
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own listings" ON public.property_listings
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own listings" ON public.property_listings
  FOR DELETE USING (auth.uid() = agent_id);

-- 3. CLIENTS TABLE (if it exists)
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