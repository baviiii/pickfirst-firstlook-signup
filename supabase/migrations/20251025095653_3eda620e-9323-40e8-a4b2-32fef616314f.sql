-- Create area_insights table for caching Google Maps data
CREATE TABLE IF NOT EXISTS public.area_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  nearby_places JSONB NOT NULL DEFAULT '{}',
  air_quality JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create unique index on address for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_area_insights_address ON public.area_insights(LOWER(address));

-- Create index on coordinates for nearby searches
CREATE INDEX IF NOT EXISTS idx_area_insights_coords ON public.area_insights(latitude, longitude);

-- Create index on fetched_at for cache expiration checks
CREATE INDEX IF NOT EXISTS idx_area_insights_fetched_at ON public.area_insights(fetched_at);

-- Enable RLS
ALTER TABLE public.area_insights ENABLE ROW LEVEL SECURITY;

-- Anyone can read cached insights (public data)
CREATE POLICY "Anyone can view area insights"
  ON public.area_insights
  FOR SELECT
  USING (true);

-- System can insert/update cache
CREATE POLICY "System can manage area insights"
  ON public.area_insights
  FOR ALL
  USING (auth.role() = 'service_role' OR auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Add trigger for updated_at
CREATE TRIGGER update_area_insights_updated_at
  BEFORE UPDATE ON public.area_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();