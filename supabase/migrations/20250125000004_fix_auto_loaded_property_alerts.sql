-- Fix property alerts to work with auto-loaded properties
-- The current trigger only fires on status changes, but auto-loaded properties
-- are inserted with status='approved' directly, so no jobs are created

-- Update the trigger to also fire on INSERT
DROP TRIGGER IF EXISTS trigger_process_new_property_alert ON public.property_listings;

CREATE TRIGGER trigger_process_new_property_alert
  AFTER INSERT OR UPDATE OF status ON public.property_listings
  FOR EACH ROW
  EXECUTE FUNCTION process_new_property_alert();

-- Update the function to handle both INSERT and UPDATE cases
CREATE OR REPLACE FUNCTION process_new_property_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT case (auto-loaded properties)
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    INSERT INTO property_alert_jobs (property_id, status, created_at)
    VALUES (NEW.id, 'pending', now());
  END IF;
  
  -- Handle UPDATE case (manually approved properties)
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO property_alert_jobs (property_id, status, created_at)
    VALUES (NEW.id, 'pending', now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the fix
COMMENT ON FUNCTION process_new_property_alert() IS 
'Processes property alerts for both auto-loaded properties (INSERT with status=approved) and manually approved properties (UPDATE status to approved).';
