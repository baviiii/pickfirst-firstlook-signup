-- Clean Feature Gates Migration Script
-- This script safely migrates from redundant feature gates to clean ones

-- Step 1: Add new clean feature gates
INSERT INTO feature_configurations (feature_key, feature_name, description, free_tier_enabled, premium_tier_enabled) 
VALUES 
  -- Search & Discovery
  ('basic_search', 'Basic Search', 'Standard property search functionality', true, true),
  ('advanced_search_filters', 'Advanced Search Filters', 'Advanced property filtering options', false, true),
  ('market_insights', 'Market Insights', 'Access to market analytics and insights', false, true),
  
  -- Property Management  
  ('favorites_basic', 'Basic Favorites', 'Save up to 10 favorite properties', true, true),
  ('favorites_unlimited', 'Unlimited Favorites', 'Save unlimited favorite properties', false, true),
  ('property_comparison_basic', 'Basic Property Comparison', 'Compare up to 2 properties', true, true),
  ('property_comparison_unlimited', 'Unlimited Property Comparison', 'Compare unlimited properties', false, true),
  ('property_alerts_basic', 'Basic Property Alerts', 'Up to 3 property alerts', true, true),
  ('property_alerts_unlimited', 'Unlimited Property Alerts', 'Unlimited property alerts', false, true),
  
  -- Communication
  ('agent_messaging', 'Agent Messaging', 'Send messages to agents about properties', true, true),
  ('message_history_30days', 'Message History (30 Days)', 'Access to 30 days of message history', true, true),
  ('message_history_unlimited', 'Unlimited Message History', 'Access to complete message history', false, true),
  ('priority_support', 'Priority Support', 'Get priority response from agents', false, true),
  
  -- Notifications
  ('email_notifications', 'Email Notifications', 'Receive email notifications', true, true),
  ('personalized_alerts', 'Personalized Alerts', 'Customized property alerts based on preferences', false, true),
  ('instant_notifications', 'Instant Notifications', 'Real-time push notifications', false, true)
ON CONFLICT (feature_key) DO UPDATE SET
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled;

-- Step 2: Update existing redundant gates to be disabled (safe migration)
-- We'll keep them for backward compatibility but disable them
UPDATE feature_configurations 
SET 
  description = CONCAT('[DEPRECATED] ', description),
  free_tier_enabled = false,
  premium_tier_enabled = false
WHERE feature_key IN (
  'limited_favorites',
  'standard_agent_contact', 
  'direct_messaging',
  'live_messaging',
  'message_history_access',
  'personalized_property_notifications'
);

-- Step 3: Keep some old gates active for backward compatibility during migration
-- These will be removed in Phase 2 after all components are updated
UPDATE feature_configurations 
SET 
  description = CONCAT('[LEGACY] ', description)
WHERE feature_key IN (
  'unlimited_favorites',
  'property_inquiry_messaging',
  'email_property_alerts',
  'property_comparison',
  'property_alerts',
  'priority_agent_connections'
);

-- Step 4: Add comments for tracking
COMMENT ON TABLE feature_configurations IS 'Feature gates for subscription tiers. Clean gates added 2025-01-28. Legacy gates marked for removal.';
