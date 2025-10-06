-- Fix property alerts feature access check to use correct feature keys
-- The function was looking for 'property_alerts' but we have 'property_alerts_basic' and 'property_alerts_unlimited'

CREATE OR REPLACE FUNCTION check_property_alerts_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_subscription_tier TEXT;
  feature_basic_enabled BOOLEAN;
  feature_unlimited_enabled BOOLEAN;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_subscription_tier
  FROM profiles
  WHERE id = user_id;
  
  -- Default to 'free' if null
  user_subscription_tier := COALESCE(user_subscription_tier, 'free');
  
  -- Get feature configurations for both basic and unlimited alerts
  SELECT 
    (SELECT free_tier_enabled FROM feature_configurations WHERE feature_key = 'property_alerts_basic'),
    (SELECT premium_tier_enabled FROM feature_configurations WHERE feature_key = 'property_alerts_unlimited')
  INTO feature_basic_enabled, feature_unlimited_enabled;
  
  -- Check access based on subscription tier
  IF user_subscription_tier = 'free' AND feature_basic_enabled THEN
    RETURN TRUE;
  ELSIF user_subscription_tier = 'premium' AND feature_unlimited_enabled THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_property_alerts_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_property_alerts_access(UUID) TO service_role;

-- Add comment explaining the fix
COMMENT ON FUNCTION check_property_alerts_access(UUID) IS 
'Validates if a user has access to property alerts based on their subscription tier and feature configuration. Updated to use correct feature keys: property_alerts_basic for free tier and property_alerts_unlimited for premium tier.';
