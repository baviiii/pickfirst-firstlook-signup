-- Update subscription system to support 3 tiers: Free, Basic ($9.99), Premium ($19.99)
-- This migration updates the existing subscription plans and adds new features

-- Update subscription_plans table to support the new tier structure
UPDATE subscription_plans 
SET 
  features = '["Browse listings", "Basic search filters", "Save searches and alerts"]'::jsonb,
  price_monthly = 0,
  price_yearly = 0
WHERE name = 'Free';

-- Insert Basic plan if it doesn't exist
INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, stripe_product_id, stripe_price_id, max_listings, is_active)
SELECT 
  'Basic', 
  9.99, 
  99.99, 
  '["All Free features", "Early access to listings (24 hours before free users)", "Property insights and data", "Smart investor filters", "Advanced analytics"]'::jsonb,
  NULL, -- Will be set when Stripe products are created
  NULL, -- Will be set when Stripe products are created
  NULL, 
  true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Basic');

-- Update Premium plan
UPDATE subscription_plans 
SET 
  features = '["All Basic features", "Direct chat with agents", "Schedule appointments", "Exclusive off-market listings", "Vendor details (ownership duration, special conditions)", "Priority support"]'::jsonb,
  price_monthly = 19.99,
  price_yearly = 199.99
WHERE name = 'Premium';

-- Add basic_tier_enabled column to feature_configurations if it doesn't exist
ALTER TABLE feature_configurations 
ADD COLUMN IF NOT EXISTS basic_tier_enabled boolean DEFAULT false;

-- Update feature configurations for the new tier structure
INSERT INTO feature_configurations (feature_key, feature_name, description, free_tier_enabled, basic_tier_enabled, premium_tier_enabled) 
VALUES 
  -- Core features available to all tiers
  ('browse_listings', 'Browse Listings', 'View all public property listings', true, true, true),
  ('basic_search', 'Basic Search Filters', 'Use standard search and filter options', true, true, true),
  ('save_searches', 'Save Searches & Alerts', 'Save search criteria and get alerts', true, true, true),
  
  -- Basic tier features
  ('early_access_listings', 'Early Access to Listings', '24-hour early access to new listings', false, true, true),
  ('property_insights', 'Property Insights & Data', 'Detailed property analytics and market data', false, true, true),
  ('investor_filters', 'Smart Investor Filters', 'Advanced filters for investment properties', false, true, true),
  
  -- Premium tier features
  ('exclusive_offmarket', 'Exclusive Off-Market Listings', 'Access to agent-posted off-market properties', false, false, true),
  ('vendor_details', 'Vendor Details', 'View ownership duration and special conditions', false, false, true),
  ('schedule_appointments', 'Schedule Appointments', 'Book appointments directly with agents', false, false, true),
  ('direct_chat_agents', 'Direct Chat with Agents', 'In-app messaging with agents', false, false, true),
  
  -- Property management features
  ('favorites_basic', 'Basic Favorites', 'Save up to 10 properties', true, true, true),
  ('favorites_unlimited', 'Unlimited Favorites', 'Save unlimited properties', false, false, true),
  ('property_alerts_basic', 'Basic Property Alerts', 'Set up to 3 property alerts', true, true, true),
  ('property_alerts_unlimited', 'Unlimited Property Alerts', 'Set unlimited property alerts', false, false, true),
  
  -- Communication features
  ('agent_messaging', 'Agent Messaging', 'Basic messaging with agents', true, true, true),
  ('message_history_30days', '30-Day Message History', 'Access to 30 days of message history', true, true, true),
  ('message_history_unlimited', 'Unlimited Message History', 'Access to all message history', false, false, true),
  ('priority_support', 'Priority Support', 'Priority customer support', false, false, true)
ON CONFLICT (feature_key) DO UPDATE SET
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  basic_tier_enabled = EXCLUDED.basic_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled;

-- Add vendor details columns to property_listings table
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS vendor_ownership_duration integer, -- months
ADD COLUMN IF NOT EXISTS vendor_special_conditions text,
ADD COLUMN IF NOT EXISTS vendor_favorable_contracts text,
ADD COLUMN IF NOT EXISTS vendor_motivation text;

-- Update the can_view_offmarket_listing function to work with new tier structure
CREATE OR REPLACE FUNCTION can_view_offmarket_listing(listing_id uuid, user_subscription_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  listing_source_type text;
BEGIN
  SELECT listing_source INTO listing_source_type
  FROM property_listings
  WHERE id = listing_id;
  
  -- If it's an external feed listing, everyone can see it
  IF listing_source_type = 'external_feed' THEN
    RETURN TRUE;
  END IF;
  
  -- If it's agent_posted (off-market), only premium users can see it
  IF listing_source_type = 'agent_posted' AND user_subscription_tier = 'premium' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Create function to check if user has early access to a listing
CREATE OR REPLACE FUNCTION has_early_access_to_listing(listing_id uuid, user_subscription_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  early_access_until timestamp with time zone;
BEGIN
  SELECT early_access_until INTO early_access_until
  FROM property_listings
  WHERE id = listing_id;
  
  -- If no early access period set, everyone can see it
  IF early_access_until IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- If current time is before early access period ends, only basic+ users can see it
  IF NOW() < early_access_until THEN
    RETURN user_subscription_tier IN ('basic', 'premium');
  END IF;
  
  -- After early access period, everyone can see it
  RETURN TRUE;
END;
$$;

-- Create function to check if user can view vendor details
CREATE OR REPLACE FUNCTION can_view_vendor_details(user_subscription_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only premium users can view vendor details
  RETURN user_subscription_tier = 'premium';
END;
$$;

-- Update profiles table to support the new subscription tiers
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;

-- Convert existing 'pro' users to 'premium' to maintain their access
UPDATE profiles 
SET subscription_tier = 'premium' 
WHERE subscription_tier = 'pro';

ALTER TABLE profiles 
ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier = ANY (ARRAY['free'::text, 'basic'::text, 'premium'::text]));

-- Create index for better performance on subscription tier queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_property_listings_listing_source ON property_listings(listing_source);
CREATE INDEX IF NOT EXISTS idx_property_listings_early_access ON property_listings(early_access_until);
