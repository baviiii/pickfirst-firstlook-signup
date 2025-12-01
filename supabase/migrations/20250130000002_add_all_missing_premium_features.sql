-- Add all missing premium features to feature_configurations
-- This ensures all premium features exist in the database

INSERT INTO public.feature_configurations (feature_key, feature_name, description, free_tier_enabled, basic_tier_enabled, premium_tier_enabled) 
VALUES 
  -- Core features (all tiers)
  ('browse_properties', 'Browse Properties', 'View and search property listings', true, true, true),
  ('browse_listings', 'Browse Listings', 'View all public property listings', true, true, true),
  ('basic_search', 'Basic Search', 'Use standard search and filter options', true, true, true),
  ('save_searches', 'Save Searches', 'Save search criteria for later use', true, true, true),
  ('property_alerts', 'Property Alerts', 'Get notified when properties match your criteria', true, true, true),
  ('agent_messaging', 'Agent Messaging', 'Communicate with real estate agents', true, true, true),
  
  -- Limited features
  ('favorites', 'Favorites', 'Save favorite properties (Free: 10, Premium: unlimited)', true, true, true),
  ('property_comparison', 'Property Comparison', 'Compare properties side by side (Free: 2, Premium: unlimited)', true, true, true),
  ('property_comparison_basic', 'Basic Property Comparison', 'Compare up to 2 properties side by side', true, true, true),
  ('property_comparison_unlimited', 'Unlimited Property Comparison', 'Compare unlimited properties side by side', false, false, true),
  
  -- Premium only features
  ('off_market_properties', 'Off-Market Properties', 'Access to exclusive off-market listings', false, false, true),
  ('exclusive_offmarket', 'Exclusive Off-Market Listings', 'Access to agent-posted off-market properties', false, false, true),
  ('advanced_search', 'Advanced Search', 'Advanced filtering and search capabilities', false, false, true),
  ('advanced_search_filters', 'Advanced Search Filters', 'Advanced property filtering and search options', false, true, true),
  ('market_insights', 'Market Insights', 'Access to market analytics and trends', false, true, true),
  ('property_insights', 'Property Insights & Data', 'Detailed property analytics and market data', false, true, true),
  ('priority_support', 'Priority Support', 'Priority customer support', false, false, true),
  ('schedule_appointments', 'Schedule Appointments', 'Book appointments directly with agents', false, false, true),
  ('vendor_details', 'Vendor Details', 'View ownership duration and special conditions', false, false, true),
  ('early_access_listings', 'Early Access to Listings', '24-hour early access to new listings', false, true, true),
  ('investor_filters', 'Smart Investor Filters', 'Advanced filters for investment properties', false, true, true),
  
  -- Legacy/alias features
  ('personalized_property_notifications', 'Personalized Property Notifications', 'Custom property alerts based on preferences', false, false, true),
  ('personalized_alerts', 'Personalized Alerts', 'Custom property alerts based on preferences', false, false, true),
  ('direct_chat_agents', 'Direct Chat with Agents', 'Direct messaging with agents', true, true, true),
  ('unlimited_favorites', 'Unlimited Favorites', 'Save unlimited favorite properties', false, false, true),
  ('message_history_30days', '30-Day Message History', 'Access to 30 days of message history', true, true, true),
  ('message_history_unlimited', 'Unlimited Message History', 'Access to all message history', false, false, true),
  ('instant_notifications', 'Instant Notifications', 'Real-time property notifications', true, true, true)

ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  basic_tier_enabled = COALESCE(EXCLUDED.basic_tier_enabled, feature_configurations.basic_tier_enabled, false),
  premium_tier_enabled = EXCLUDED.premium_tier_enabled,
  updated_at = now();

