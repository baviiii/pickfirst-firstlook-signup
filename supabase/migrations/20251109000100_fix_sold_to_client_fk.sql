-- Ensure property_listings.sold_to_client_id references clients.id so agents can
-- record sales against both registered and offline clients.

BEGIN;

ALTER TABLE public.property_listings
  DROP CONSTRAINT IF EXISTS property_listings_sold_to_client_id_fkey;

UPDATE public.property_listings pl
SET sold_to_client_id = NULL
WHERE sold_to_client_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = pl.sold_to_client_id
  );

ALTER TABLE public.property_listings
  ADD CONSTRAINT property_listings_sold_to_client_id_fkey
  FOREIGN KEY (sold_to_client_id)
  REFERENCES public.clients (id)
  ON DELETE SET NULL;

COMMIT;

