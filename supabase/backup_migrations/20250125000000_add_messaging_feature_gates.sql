-- Create feature_configurations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.feature_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  free_tier_enabled BOOLEAN DEFAULT false,
  premium_tier_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view feature configurations" ON public.feature_configurations
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage feature configurations" ON public.feature_configurations
  FOR ALL USING (true);

-- Add new feature configurations for messaging and notifications
INSERT INTO public.feature_configurations (feature_key, feature_name, description, free_tier_enabled, premium_tier_enabled) VALUES
('live_messaging', 'Live Messaging', 'Real-time messaging with agents and property inquiries', false, true),
('personalized_property_notifications', 'Personalized Property Notifications', 'Customized property alerts based on buyer preferences and search history', false, true),
('property_inquiry_messaging', 'Property Inquiry Messaging', 'Send messages to agents about specific properties', true, true),
('message_history_access', 'Message History Access', 'Access to complete conversation history with agents', false, true)
ON CONFLICT (feature_key) DO NOTHING;

-- Update existing direct_messaging feature to be more specific (only if it exists)
UPDATE public.feature_configurations 
SET 
  feature_name = 'Basic Agent Contact',
  description = 'Basic contact form functionality for reaching agents'
WHERE feature_key = 'direct_messaging';
