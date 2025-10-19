-- Add garages field to property_listings table
ALTER TABLE public.property_listings 
ADD COLUMN IF NOT EXISTS garages INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.property_listings.garages IS 'Number of garage spaces (e.g., 1 for single garage, 2 for double garage)';

-- Add preferred_features to user_preferences for buyer preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS preferred_features TEXT[] DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.user_preferences.preferred_features IS 'Array of property features the buyer prefers (e.g., pool, air conditioning, garage)';

-- Create index for better performance on feature searches
CREATE INDEX IF NOT EXISTS idx_user_preferences_preferred_features ON public.user_preferences USING GIN(preferred_features);