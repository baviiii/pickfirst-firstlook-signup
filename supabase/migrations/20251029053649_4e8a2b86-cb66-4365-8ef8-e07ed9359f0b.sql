-- Add alert_type to property_alerts to distinguish on-market vs off-market
ALTER TABLE public.property_alerts 
ADD COLUMN IF NOT EXISTS alert_type TEXT NOT NULL DEFAULT 'on_market' 
CHECK (alert_type IN ('on_market', 'off_market'));

-- Add index for alert_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_property_alerts_alert_type ON public.property_alerts(alert_type);

-- Update email_template field to allow different templates
COMMENT ON COLUMN public.property_alerts.alert_type IS 'Type of property alert: on_market for regular listings, off_market for premium-only listings';

-- Add alert_type to property_alert_jobs for separate processing
ALTER TABLE public.property_alert_jobs 
ADD COLUMN IF NOT EXISTS alert_type TEXT NOT NULL DEFAULT 'on_market'
CHECK (alert_type IN ('on_market', 'off_market'));

-- Update the process_new_property_alert function to set alert_type based on listing_source
CREATE OR REPLACE FUNCTION process_new_property_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT case (auto-loaded properties)
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    INSERT INTO property_alert_jobs (
      property_id, 
      status, 
      alert_type,
      created_at
    )
    VALUES (
      NEW.id, 
      'pending',
      CASE 
        WHEN NEW.listing_source = 'agent_posted' THEN 'off_market'
        ELSE 'on_market'
      END,
      now()
    );
  END IF;
  
  -- Handle UPDATE case (manually approved properties)
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO property_alert_jobs (
      property_id, 
      status, 
      alert_type,
      created_at
    )
    VALUES (
      NEW.id, 
      'pending',
      CASE 
        WHEN NEW.listing_source = 'agent_posted' THEN 'off_market'
        ELSE 'on_market'
      END,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

COMMENT ON FUNCTION process_new_property_alert() IS 
'Processes property alerts for both auto-loaded properties (INSERT with status=approved) and manually approved properties (UPDATE status to approved). Sets alert_type based on listing_source: off_market for agent_posted, on_market for external_feed.';