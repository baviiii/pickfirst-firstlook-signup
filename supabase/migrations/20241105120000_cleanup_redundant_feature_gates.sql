-- Clean up redundant feature gates and keep only the essential ones
-- This migration removes overlapping/redundant feature configurations
-- and keeps only the simplified, logical feature gates

-- First, let's see what we're working with (for reference)
-- SELECT feature_key, feature_name FROM feature_configurations ORDER BY feature_key;

-- Delete all the redundant/overlapping feature gates
DELETE FROM feature_configurations WHERE feature_key IN (
  -- Remove redundant favorites gates (keep only 'favorites')
  'favorites_basic',
  'favorites_unlimited', 
  'limited_favorites',
  'unlimited_favorites',
  
  -- Remove redundant property alerts gates (keep only 'property_alerts')
  'property_alerts_basic',
  'property_alerts_unlimited',
  'email_property_alerts',
  'personalized_alerts',
  'personalized_property_notifications',
  
  -- Remove redundant messaging gates (keep only 'agent_messaging')
  'direct_messaging',
  'live_messaging', 
  'direct_chat_agents',
  'standard_agent_contact',
  'property_inquiry_messaging',
  'priority_agent_connections',
  
  -- Remove redundant comparison gates (keep only 'property_comparison')
  'property_comparison_basic',
  'property_comparison_unlimited',
  
  -- Remove redundant search gates (keep 'basic_search' and 'advanced_search_filters')
  'browse_listings',
  'save_searches',
  
  -- Remove redundant premium features (consolidate)
  'exclusive_offmarket',
  'early_access_listings',
  'property_insights',
  'investor_filters',
  'message_history_30days',
  'message_history_unlimited',
  'message_history_access',
  'instant_notifications',
  'email_notifications'
);

-- First, update any existing records that we want to keep but rename
UPDATE feature_configurations SET
  feature_key = 'advanced_search_temp',
  feature_name = 'Advanced Search',
  description = 'Advanced filtering and search capabilities'
WHERE feature_key = 'advanced_search_filters';

-- Now insert/update the clean, simplified feature gates
INSERT INTO feature_configurations (feature_key, feature_name, description, free_tier_enabled, premium_tier_enabled) VALUES

-- === CORE FEATURES (All Users) ===
('browse_properties', 'Browse Properties', 'View and search property listings', true, true),
('basic_search', 'Basic Search', 'Use standard search and filter options', true, true),
('save_searches', 'Save Searches', 'Save search criteria for later use', true, true),
('property_alerts', 'Property Alerts', 'Get notified when properties match your criteria', true, true),
('agent_messaging', 'Agent Messaging', 'Communicate with real estate agents', true, true),

-- === LIMITED FEATURES (Free users get limited, Premium gets unlimited) ===
('favorites', 'Favorites', 'Save favorite properties (Free: 10, Premium: unlimited)', true, true),
('property_comparison', 'Property Comparison', 'Compare properties side by side (Free: 2, Premium: unlimited)', true, true),

-- === PREMIUM ONLY FEATURES ===
('off_market_properties', 'Off-Market Properties', 'Access to exclusive off-market listings', false, true),
('market_insights', 'Market Insights', 'Access to market analytics and trends', false, true),
('priority_support', 'Priority Support', 'Priority customer support', false, true),
('schedule_appointments', 'Schedule Appointments', 'Book appointments directly with agents', false, true)

ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled,
  updated_at = NOW();

-- Handle the advanced_search rename properly
INSERT INTO feature_configurations (feature_key, feature_name, description, free_tier_enabled, premium_tier_enabled) VALUES
('advanced_search', 'Advanced Search', 'Advanced filtering and search capabilities', false, true)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled,
  updated_at = NOW();

-- Clean up the temp record
DELETE FROM feature_configurations WHERE feature_key = 'advanced_search_temp';

-- Clean up any orphaned or duplicate records
DELETE FROM feature_configurations 
WHERE feature_key NOT IN (
  'browse_properties',
  'basic_search', 
  'save_searches',
  'property_alerts',
  'agent_messaging',
  'favorites',
  'property_comparison',
  'off_market_properties',
  'advanced_search',
  'market_insights', 
  'priority_support',
  'schedule_appointments',
  'vendor_details'
);

-- Verify the cleanup (this will show in the migration logs)
-- SELECT 
--   feature_key, 
--   feature_name, 
--   free_tier_enabled, 
--   premium_tier_enabled 
-- FROM feature_configurations 
-- ORDER BY 
--   CASE 
--     WHEN free_tier_enabled = true AND premium_tier_enabled = true THEN 1
--     WHEN free_tier_enabled = false AND premium_tier_enabled = true THEN 2
--     ELSE 3
--   END,
--   feature_key;
