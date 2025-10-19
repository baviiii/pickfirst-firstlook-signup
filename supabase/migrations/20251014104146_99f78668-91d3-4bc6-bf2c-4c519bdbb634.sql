-- Add missing premium features to feature_configurations
INSERT INTO public.feature_configurations (feature_key, feature_name, description, free_tier_enabled, basic_tier_enabled, premium_tier_enabled) 
VALUES 
  ('advanced_search_filters', 'Advanced Search Filters', 'Advanced property filtering and search options', false, true, true),
  ('market_insights', 'Market Insights', 'Access to market analytics and insights', false, true, true),
  ('property_comparison_basic', 'Basic Property Comparison', 'Compare up to 2 properties side by side', true, true, true),
  ('property_comparison_unlimited', 'Unlimited Property Comparison', 'Compare unlimited properties side by side', false, false, true)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  basic_tier_enabled = EXCLUDED.basic_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled,
  updated_at = now();