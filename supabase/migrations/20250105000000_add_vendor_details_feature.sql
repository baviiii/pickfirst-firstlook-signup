-- Add vendor_details feature configuration
-- This is a premium-only feature that allows users to view vendor/seller details

INSERT INTO feature_configurations (
  feature_key, 
  feature_name, 
  description, 
  free_tier_enabled, 
  basic_tier_enabled,
  premium_tier_enabled
) VALUES (
  'vendor_details',
  'Vendor Details',
  'Access detailed vendor/seller information including ownership duration, motivation, and special conditions',
  false,
  false,
  true
)
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  basic_tier_enabled = EXCLUDED.basic_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled,
  updated_at = NOW();
