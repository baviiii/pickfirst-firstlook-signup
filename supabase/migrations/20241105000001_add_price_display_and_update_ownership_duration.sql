-- Migration: Add price_display field and update vendor_ownership_duration type
-- Date: 2024-11-05
-- Purpose: Support flexible price ranges/text and ownership duration formats

-- Add price_display column to store original price text (ranges, "Best Offers", etc.)
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS price_display TEXT;

-- Update vendor_ownership_duration from integer to text to allow flexible formats
-- First, create a new column with text type
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS vendor_ownership_duration_new TEXT;

-- Copy existing data, converting numbers to text with "months" suffix
UPDATE property_listings 
SET vendor_ownership_duration_new = 
  CASE 
    WHEN vendor_ownership_duration IS NOT NULL AND vendor_ownership_duration > 0 
    THEN vendor_ownership_duration || ' months'
    ELSE NULL
  END
WHERE vendor_ownership_duration_new IS NULL;

-- Drop the old column
ALTER TABLE property_listings 
DROP COLUMN IF EXISTS vendor_ownership_duration;

-- Rename the new column to the original name
ALTER TABLE property_listings 
RENAME COLUMN vendor_ownership_duration_new TO vendor_ownership_duration;

-- Add comments for documentation
COMMENT ON COLUMN property_listings.price_display IS 'Original price text as entered by agent (e.g., "900k-1.2M", "Best Offers")';
COMMENT ON COLUMN property_listings.vendor_ownership_duration IS 'Flexible ownership duration format (e.g., "7 years, 2 months", "18 months")';

-- Create index on price_display for potential text searches
CREATE INDEX IF NOT EXISTS idx_property_listings_price_display 
ON property_listings USING gin(to_tsvector('english', price_display))
WHERE price_display IS NOT NULL;

-- Update any existing RLS policies if needed (they should still work with the new fields)
-- No changes needed as the policies are based on user_id/agent_id relationships
