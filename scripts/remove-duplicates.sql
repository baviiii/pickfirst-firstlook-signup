-- Remove Duplicate Feature Gates
-- This script removes old/deprecated feature gates that are now replaced by clean ones

-- Step 1: Remove deprecated features (marked as DEPRECATED)
DELETE FROM feature_configurations 
WHERE feature_key IN (
  'limited_favorites',
  'standard_agent_contact', 
  'direct_messaging',
  'live_messaging',
  'message_history_access',
  'personalized_property_notifications'
);

-- Step 2: Remove legacy features that have clean replacements
-- Keep only the clean versions
DELETE FROM feature_configurations 
WHERE feature_key IN (
  -- Old unlimited_favorites (keep the new favorites_unlimited)
  'unlimited_favorites'
) AND feature_key != 'favorites_unlimited';

-- Step 3: Remove other legacy duplicates
DELETE FROM feature_configurations 
WHERE feature_key IN (
  'email_property_alerts',        -- Replaced by property_alerts_basic
  'priority_agent_connections',   -- Replaced by priority_support  
  'property_alerts',             -- Replaced by property_alerts_basic/unlimited
  'property_comparison',         -- Replaced by property_comparison_basic/unlimited
  'property_inquiry_messaging'   -- Replaced by agent_messaging
);

-- Step 4: Remove the advanced_property_search (seems to be a duplicate)
DELETE FROM feature_configurations 
WHERE feature_key = 'advanced_property_search';

-- Step 5: Verify what's left
SELECT 
  feature_key, 
  feature_name, 
  CASE 
    WHEN feature_key LIKE '%_basic' OR feature_key LIKE '%_30days' OR feature_key = 'basic_search' OR feature_key = 'agent_messaging' OR feature_key = 'email_notifications' THEN 'FREE + PREMIUM'
    WHEN feature_key LIKE '%_unlimited' OR feature_key LIKE 'advanced_%' OR feature_key = 'market_insights' OR feature_key = 'priority_support' OR feature_key LIKE '%personalized%' OR feature_key LIKE '%instant%' THEN 'PREMIUM ONLY'
    ELSE 'CHECK CONFIG'
  END as tier_suggestion,
  free_tier_enabled,
  premium_tier_enabled
FROM feature_configurations 
ORDER BY 
  CASE 
    WHEN feature_key LIKE 'basic_%' THEN 1
    WHEN feature_key LIKE 'advanced_%' THEN 2  
    WHEN feature_key LIKE 'market_%' THEN 3
    WHEN feature_key LIKE 'favorites_%' THEN 4
    WHEN feature_key LIKE 'property_comparison_%' THEN 5
    WHEN feature_key LIKE 'property_alerts_%' THEN 6
    WHEN feature_key LIKE 'agent_%' THEN 7
    WHEN feature_key LIKE 'message_%' THEN 8
    WHEN feature_key LIKE 'priority_%' THEN 9
    WHEN feature_key LIKE 'email_%' THEN 10
    WHEN feature_key LIKE 'personalized_%' THEN 11
    WHEN feature_key LIKE 'instant_%' THEN 12
    ELSE 99
  END,
  feature_key;
