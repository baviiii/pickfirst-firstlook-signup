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
