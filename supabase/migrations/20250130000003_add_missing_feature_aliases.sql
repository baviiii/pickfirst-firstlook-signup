-- Add ONLY missing feature aliases that code is checking for
-- This migration is SAFE: Uses ON CONFLICT to avoid duplicates
-- It will only INSERT new features that don't exist, or UPDATE existing ones if they do

-- Your existing 13 features will NOT be touched:
-- favorites, property_alerts, schedule_appointments, priority_support,
-- browse_properties, property_comparison, off_market_properties, vendor_details,
-- market_insights, save_searches, basic_search, agent_messaging, advanced_search

-- Only adding NEW features that code needs but are missing:
INSERT INTO public.feature_configurations (feature_key, feature_name, description, free_tier_enabled, basic_tier_enabled, premium_tier_enabled) 
VALUES 
  -- Aliases for existing features (code checks these but they don't exist in DB)
  ('advanced_search_filters', 'Advanced Search Filters', 'Advanced property filtering and search options', false, true, true),
  ('exclusive_offmarket', 'Exclusive Off-Market Listings', 'Access to agent-posted off-market properties', false, false, true),
  
  -- Property comparison variants (code uses these)
  ('property_comparison_basic', 'Basic Property Comparison', 'Compare up to 2 properties side by side', true, true, true),
  ('property_comparison_unlimited', 'Unlimited Property Comparison', 'Compare unlimited properties side by side', false, false, true),
  
  -- Favorites variants (code uses these)
  ('favorites_basic', 'Basic Favorites', 'Save up to 10 favorite properties', true, true, true),
  ('favorites_unlimited', 'Unlimited Favorites', 'Save unlimited favorite properties', false, false, true),
  ('unlimited_favorites', 'Unlimited Favorites', 'Save unlimited favorite properties (legacy alias)', false, false, true),
  
  -- Additional premium features (code uses these)
  ('early_access_listings', 'Early Access to Listings', '24-hour early access to new listings', false, true, true),
  ('property_insights', 'Property Insights & Data', 'Detailed property analytics and market data', false, true, true),
  ('investor_filters', 'Smart Investor Filters', 'Advanced filters for investment properties', false, true, true),
  
  -- Notification features (code uses these)
  ('personalized_property_notifications', 'Personalized Property Notifications', 'Custom property alerts based on preferences', false, false, true),
  ('personalized_alerts', 'Personalized Alerts', 'Custom property alerts based on preferences', false, false, true),
  ('instant_notifications', 'Instant Notifications', 'Real-time property notifications', true, true, true),
  
  -- Messaging aliases (code uses this)
  ('direct_chat_agents', 'Direct Chat with Agents', 'Direct messaging with agents (alias for agent_messaging)', true, true, true),
  
  -- Message history features (code uses these)
  ('message_history_30days', '30-Day Message History', 'Access to 30 days of message history', true, true, true),
  ('message_history_unlimited', 'Unlimited Message History', 'Access to all message history', false, false, true),
  
  -- Browse listings alias (code uses this)
  ('browse_listings', 'Browse Listings', 'View all public property listings (alias for browse_properties)', true, true, true)

ON CONFLICT (feature_key) DO UPDATE SET
  -- Only update if feature already exists (shouldn't happen for these, but safe)
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  basic_tier_enabled = COALESCE(EXCLUDED.basic_tier_enabled, feature_configurations.basic_tier_enabled, false),
  premium_tier_enabled = EXCLUDED.premium_tier_enabled,
  updated_at = now();

