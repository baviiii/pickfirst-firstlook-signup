-- Update subscription plans with new pricing and features
UPDATE subscription_plans 
SET 
  features = '["Browse listings", "Basic search filters", "Save searches and alerts"]'::jsonb,
  price_monthly = 0,
  price_yearly = 0
WHERE name = 'Free';

UPDATE subscription_plans 
SET 
  features = '["All Free features", "Early access to listings (24 hours before free users)", "Property insights and data", "Smart investor filters", "Advanced analytics"]'::jsonb,
  price_monthly = 9.99,
  price_yearly = 99.99
WHERE name = 'Basic';

UPDATE subscription_plans 
SET 
  features = '["All Basic features", "Direct chat with agents", "Schedule appointments", "Exclusive off-market listings", "Vendor details (ownership duration, special conditions)", "Priority support"]'::jsonb,
  price_monthly = 19.99,
  price_yearly = 199.99
WHERE name = 'Premium';

-- Add listing_source column to property_listings to distinguish between agent-posted and external listings
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS listing_source text DEFAULT 'agent_posted' CHECK (listing_source IN ('agent_posted', 'external_feed'));

-- Add early_access_until column for premium early access feature
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS early_access_until timestamp with time zone;

-- Add basic_tier_enabled column to feature_configurations if it doesn't exist
ALTER TABLE feature_configurations 
ADD COLUMN IF NOT EXISTS basic_tier_enabled boolean DEFAULT false;

-- Add vendor details columns to property_listings table
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS vendor_ownership_duration integer, -- months
ADD COLUMN IF NOT EXISTS vendor_special_conditions text,
ADD COLUMN IF NOT EXISTS vendor_favorable_contracts text,
ADD COLUMN IF NOT EXISTS vendor_motivation text;

-- Update feature gates to match new tier structure
INSERT INTO feature_configurations (feature_key, feature_name, description, free_tier_enabled, basic_tier_enabled, premium_tier_enabled) 
VALUES 
  ('browse_listings', 'Browse Listings', 'View all public property listings', true, true, true),
  ('basic_search', 'Basic Search Filters', 'Use standard search and filter options', true, true, true),
  ('save_searches', 'Save Searches & Alerts', 'Save search criteria and get alerts', true, true, true),
  ('early_access_listings', 'Early Access to Listings', '24-hour early access to new listings', false, true, true),
  ('property_insights', 'Property Insights & Data', 'Detailed property analytics and market data', false, true, true),
  ('investor_filters', 'Smart Investor Filters', 'Advanced filters for investment properties', false, true, true),
  ('vendor_details', 'Vendor Details', 'View ownership duration and special conditions', false, false, true),
  ('exclusive_offmarket', 'Exclusive Off-Market Listings', 'Access to agent-posted off-market properties', false, false, true)
ON CONFLICT (feature_key) DO UPDATE SET
  description = EXCLUDED.description,
  free_tier_enabled = EXCLUDED.free_tier_enabled,
  basic_tier_enabled = EXCLUDED.basic_tier_enabled,
  premium_tier_enabled = EXCLUDED.premium_tier_enabled;

-- Create function to check if user can view off-market listings
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