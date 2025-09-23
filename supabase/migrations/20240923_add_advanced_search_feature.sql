-- Add advanced search feature flag
INSERT INTO public.feature_configurations 
  (feature_key, feature_name, description, free_tier_enabled, premium_tier_enabled)
VALUES
  ('advanced_property_search', 'Advanced Property Search', 'Advanced property search with in-depth insights', false, true)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled,
  updated_at = NOW();
