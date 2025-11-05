-- Add vendor_details feature configuration
-- Run this in Supabase SQL Editor to add the vendor details premium feature

-- Add the vendor_details feature
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

-- Verify the feature was added
SELECT 
  feature_key, 
  feature_name, 
  description,
  free_tier_enabled,
  basic_tier_enabled,
  premium_tier_enabled,
  created_at,
  updated_at
FROM feature_configurations 
WHERE feature_key = 'vendor_details';
