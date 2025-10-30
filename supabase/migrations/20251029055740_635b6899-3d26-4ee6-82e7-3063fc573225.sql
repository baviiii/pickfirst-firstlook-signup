-- ===================================================================
-- COMPREHENSIVE SECURITY FIX (FINAL) - Handles Views Correctly
-- ===================================================================

-- ==========================
-- STEP 1: ROLE SYSTEM
-- ==========================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('buyer', 'agent', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Migrate existing roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, role::app_role, created_at FROM public.profiles WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ==========================
-- STEP 2: FIX PROFILES
-- ==========================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view agent basic info" ON public.profiles;
DROP POLICY IF EXISTS "Agents can view buyer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agents can insert buyer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agents can update buyer profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.profiles;

CREATE POLICY "Users view own profile only" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile only" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile only" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Super admins view all" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update all" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));

CREATE OR REPLACE VIEW public.agent_public_profiles AS
SELECT p.id, p.full_name, p.bio, p.company, p.avatar_url, p.location, p.website, p.created_at
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'agent');

GRANT SELECT ON public.agent_public_profiles TO anon, authenticated;

-- ==========================
-- STEP 3: PROPERTY CONTACT
-- ==========================

CREATE OR REPLACE FUNCTION public.can_view_property_contact(property_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM property_listings WHERE id = property_id AND agent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM property_inquiries WHERE property_id = property_id AND buyer_id = auth.uid())
    OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'agent');
END;
$$;

CREATE OR REPLACE VIEW public.property_listings_public AS
SELECT 
  pl.id, pl.title, pl.description, pl.address, pl.city, pl.state, pl.zip_code,
  pl.price, pl.property_type, pl.bedrooms, pl.bathrooms, pl.square_feet,
  pl.lot_size, pl.year_built, pl.features, pl.images, pl.latitude, pl.longitude,
  pl.status, pl.created_at, pl.updated_at, pl.agent_id, pl.listing_source,
  pl.early_access_until, pl.garages, pl.showing_instructions,
  CASE WHEN can_view_property_contact(pl.id) THEN pl.contact_email ELSE NULL END AS contact_email,
  CASE WHEN can_view_property_contact(pl.id) THEN pl.contact_phone ELSE NULL END AS contact_phone
FROM public.property_listings pl WHERE pl.status = 'approved';

GRANT SELECT ON public.property_listings_public TO anon, authenticated;

-- ==========================
-- STEP 4: AREA_INSIGHTS (only table)
-- ==========================

ALTER TABLE public.area_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All view area insights" ON public.area_insights;
DROP POLICY IF EXISTS "System inserts insights" ON public.area_insights;
DROP POLICY IF EXISTS "System can manage area insights" ON public.area_insights;
DROP POLICY IF EXISTS "Anyone can view area insights" ON public.area_insights;
DROP POLICY IF EXISTS "Only system can insert area insights" ON public.area_insights;

CREATE POLICY "All view area insights" ON public.area_insights FOR SELECT USING (true);
CREATE POLICY "System inserts insights" ON public.area_insights FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ==========================
-- STEP 5: UPDATE POLICIES
-- ==========================

DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Super admins manage plans" ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can update any listing" ON public.property_listings;
DROP POLICY IF EXISTS "Super admins can delete any listing" ON public.property_listings;
CREATE POLICY "Super admins update listings" ON public.property_listings FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete listings" ON public.property_listings FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can view all alerts" ON public.system_alerts;
DROP POLICY IF EXISTS "Super admins can insert alerts" ON public.system_alerts;
DROP POLICY IF EXISTS "Super admins can update alerts" ON public.system_alerts;
DROP POLICY IF EXISTS "Super admins can delete alerts" ON public.system_alerts;
CREATE POLICY "Super admins view alerts" ON public.system_alerts FOR SELECT USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins insert alerts" ON public.system_alerts FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins update alerts" ON public.system_alerts FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins delete alerts" ON public.system_alerts FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can manage feature configurations" ON public.feature_configurations;
CREATE POLICY "Super admins manage features" ON public.feature_configurations FOR ALL
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can view all login history" ON public.login_history;
CREATE POLICY "Super admins view login history" ON public.login_history FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admins view audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'super_admin'));

-- ==========================
-- STEP 6: UPDATE TRIGGER
-- ==========================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta_role text := coalesce(nullif(new.raw_user_meta_data->>'user_type',''),'buyer');
  user_role app_role;
BEGIN
  IF meta_role NOT IN ('buyer','agent','super_admin') THEN meta_role := 'buyer'; END IF;
  user_role := meta_role::app_role;
  
  INSERT INTO public.profiles (id, email, full_name, subscription_tier, subscription_status, created_at, updated_at)
  VALUES (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'free', 'inactive', now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role, created_at) VALUES (new.id, user_role, now())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  INSERT INTO public.user_preferences (user_id) VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new;
END;
$$;

-- ==========================
-- STEP 7: HELPER
-- ==========================

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'super_admin' THEN 1 WHEN 'agent' THEN 2 WHEN 'buyer' THEN 3 END LIMIT 1
$$;

COMMENT ON TABLE user_roles IS 'Stores roles separately from profiles - prevents privilege escalation';
COMMENT ON FUNCTION has_role IS 'SECURITY DEFINER function for role checks without RLS recursion';
COMMENT ON FUNCTION get_user_role IS 'Returns highest privilege role for user';
COMMENT ON VIEW agent_public_profiles IS 'Public agent profiles without PII';
COMMENT ON VIEW property_listings_public IS 'Public properties with masked contact info';