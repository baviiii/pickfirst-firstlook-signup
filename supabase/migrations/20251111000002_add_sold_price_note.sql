-- Add sold_price_note column so agents can record textual sale context
ALTER TABLE public.property_listings
ADD COLUMN IF NOT EXISTS sold_price_note text;

COMMENT ON COLUMN public.property_listings.sold_price_note IS 'Optional note entered when a listing is marked as sold (can include text like "Contracted" or "Sold to Best Buyer").';

