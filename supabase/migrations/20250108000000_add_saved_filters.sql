-- Create saved_filters table for storing user filter preferences
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique names per user
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own saved filters" ON public.saved_filters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved filters" ON public.saved_filters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved filters" ON public.saved_filters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved filters" ON public.saved_filters
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_saved_filters_user_id ON public.saved_filters USING btree (user_id);
CREATE INDEX idx_saved_filters_created_at ON public.saved_filters USING btree (created_at);
CREATE INDEX idx_saved_filters_is_default ON public.saved_filters USING btree (is_default);

-- Create trigger for updated_at
CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON public.saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add some useful indexes for property filtering performance
CREATE INDEX IF NOT EXISTS idx_property_listings_price_range ON public.property_listings USING btree (price) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_property_listings_bedrooms ON public.property_listings USING btree (bedrooms) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_property_listings_bathrooms ON public.property_listings USING btree (bathrooms) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_property_listings_property_type ON public.property_listings USING btree (property_type) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_property_listings_square_feet ON public.property_listings USING btree (square_feet) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_property_listings_year_built ON public.property_listings USING btree (year_built) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_property_listings_features ON public.property_listings USING gin (features) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS idx_property_listings_location_text ON public.property_listings USING gin (to_tsvector('english', city || ' ' || state || ' ' || address)) WHERE status = 'approved';
