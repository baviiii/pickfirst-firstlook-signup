-- Update notification helper functions to use the new property_favorites table
-- instead of the legacy favorites table (which no longer exists).

BEGIN;

CREATE OR REPLACE FUNCTION public.notify_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price AND NEW.status = 'approved' THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT 
      pf.buyer_id,
      'price_change',
      'Price Change Alert',
      'Price updated for ' || NEW.title || ': $' || NEW.price,
      '/property/' || NEW.id,
      jsonb_build_object(
        'property_id', NEW.id,
        'old_price', OLD.price,
        'new_price', NEW.price,
        'property_title', NEW.title
      )
    FROM property_favorites pf
    WHERE pf.property_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_property_sold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.sold_date IS NOT NULL AND (OLD.sold_date IS NULL OR OLD.sold_date IS DISTINCT FROM NEW.sold_date) THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT DISTINCT
      interested_buyers.buyer_id,
      'property_sold',
      'Property Sold',
      NEW.title || ' has been sold',
      '/browse-properties',
      jsonb_build_object(
        'property_id', NEW.id,
        'property_title', NEW.title,
        'sold_price', NEW.sold_price,
        'sold_date', NEW.sold_date
      )
    FROM (
      SELECT pf.buyer_id
      FROM property_favorites pf
      WHERE pf.property_id = NEW.id
      UNION
      SELECT pi.buyer_id
      FROM property_inquiries pi
      WHERE pi.property_id = NEW.id
        AND pi.buyer_id IS NOT NULL
    ) AS interested_buyers;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;

