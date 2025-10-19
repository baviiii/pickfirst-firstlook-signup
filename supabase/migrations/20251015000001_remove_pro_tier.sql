-- Remove 'pro' subscription tier and clean up references
-- This migration removes the 'pro' tier since we now have Free, Basic, Premium

-- First, convert any remaining 'pro' users to 'premium' (should already be done, but just in case)
UPDATE profiles 
SET subscription_tier = 'premium' 
WHERE subscription_tier = 'pro';

-- Remove 'pro' from the subscription tier constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier = ANY (ARRAY['free'::text, 'basic'::text, 'premium'::text]));

-- Remove any 'pro' subscription plans if they exist
DELETE FROM subscription_plans WHERE name = 'pro';

-- Update any feature configurations that might reference 'pro' tier
-- (This is just cleanup - the new system only uses free, basic, premium)
UPDATE feature_configurations 
SET description = REPLACE(description, 'pro tier', 'premium tier')
WHERE description LIKE '%pro tier%';

-- Clean up any other references to 'pro' in feature descriptions
UPDATE feature_configurations 
SET description = REPLACE(description, 'Pro users', 'Premium users')
WHERE description LIKE '%Pro users%';

UPDATE feature_configurations 
SET description = REPLACE(description, 'pro users', 'premium users')
WHERE description LIKE '%pro users%';
