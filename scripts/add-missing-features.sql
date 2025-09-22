-- Add missing features to feature_configurations table
INSERT INTO feature_configurations (feature_key, feature_name, description, free_tier_enabled, premium_tier_enabled) VALUES
('property_comparison', 'Property Comparison Tool', 'Compare multiple properties side by side to make informed decisions', false, true),
('property_alerts', 'Property Alerts', 'Get notified when properties match your saved criteria', false, true)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled;

-- Verify the features were added
SELECT feature_key, feature_name, free_tier_enabled, premium_tier_enabled 
FROM feature_configurations 
WHERE feature_key IN ('property_comparison', 'property_alerts');
