-- Create table for dynamic feature configurations
CREATE TABLE public.feature_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  free_tier_enabled BOOLEAN NOT NULL DEFAULT false,
  premium_tier_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view feature configurations" 
ON public.feature_configurations 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can manage feature configurations" 
ON public.feature_configurations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'super_admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'super_admin'
));

-- Insert default features
INSERT INTO public.feature_configurations (feature_key, feature_name, description, free_tier_enabled, premium_tier_enabled) VALUES
('basic_search', 'Basic Search', 'Standard property search functionality', true, true),
('limited_favorites', 'Limited Favorites', 'Save up to 10 favorite properties', true, true),
('standard_agent_contact', 'Standard Agent Contact', 'Basic agent contact functionality', true, true),
('unlimited_favorites', 'Unlimited Favorites', 'Save unlimited favorite properties', false, true),
('advanced_search_filters', 'Advanced Search Filters', 'Advanced property filtering options', false, true),
('priority_agent_connections', 'Priority Agent Connections', 'Get priority response from agents', false, true),
('email_property_alerts', 'Email Property Alerts', 'Receive email notifications for new properties', false, true),
('market_insights', 'Market Insights', 'Access to market analytics and insights', false, true),
('direct_messaging', 'Direct Messaging', 'Direct messaging with agents', false, true);

-- Create trigger for updated_at
CREATE TRIGGER update_feature_configurations_updated_at
  BEFORE UPDATE ON public.feature_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();