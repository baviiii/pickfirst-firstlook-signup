-- Add basic_tier_enabled column to feature_configurations if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'feature_configurations' 
    AND column_name = 'basic_tier_enabled'
  ) THEN
    ALTER TABLE feature_configurations 
    ADD COLUMN basic_tier_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing feature configurations to properly reflect all three tiers
-- Ensure all features have basic_tier_enabled set appropriately
UPDATE feature_configurations 
SET basic_tier_enabled = false 
WHERE basic_tier_enabled IS NULL;

-- Set sensible defaults for existing features based on their premium status
-- Features that are premium-only should potentially be available to Basic tier too
UPDATE feature_configurations 
SET basic_tier_enabled = true
WHERE feature_key IN (
  'early_access_listings',
  'property_alerts_basic',
  'message_history_30days',
  'personalized_alerts',
  'property_comparison_basic',
  'save_searches'
) AND premium_tier_enabled = true;