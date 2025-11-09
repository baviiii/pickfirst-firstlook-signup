-- Add floor plan support to property listings

-- 1. Add floor_plans column to property_listings
ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS floor_plans text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.property_listings.floor_plans IS 'Array of public URLs pointing to uploaded floor plan assets';

-- 2. Ensure dedicated storage bucket exists for floor plans (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-floorplans',
  'property-floorplans',
  true,
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 3. Replace policies for the bucket to avoid duplicates
DROP POLICY IF EXISTS "Agents can upload floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Agents can update floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Agents can delete floor plans" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view floor plans" ON storage.objects;

CREATE POLICY "Agents can upload floor plans" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'property-floorplans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Agents can update floor plans" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'property-floorplans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Agents can delete floor plans" ON storage.objects
FOR DELETE USING (
  bucket_id = 'property-floorplans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view floor plans" ON storage.objects
FOR SELECT USING (bucket_id = 'property-floorplans');
