-- Create property alerts table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.property_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed')),
  email_template TEXT NOT NULL DEFAULT 'propertyAlert',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Prevent duplicate alerts for the same property to the same buyer
  UNIQUE(buyer_id, property_id)
);

-- Enable RLS
ALTER TABLE public.property_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Buyers can view their own alerts" ON public.property_alerts
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "System can insert alerts" ON public.property_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update alert status" ON public.property_alerts
  FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_alerts_buyer_id ON public.property_alerts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_property_alerts_property_id ON public.property_alerts(property_id);
CREATE INDEX IF NOT EXISTS idx_property_alerts_created_at ON public.property_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_property_alerts_status ON public.property_alerts(status);

-- Create trigger for updated_at
CREATE TRIGGER update_property_alerts_updated_at
  BEFORE UPDATE ON public.property_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.property_alerts TO authenticated;
GRANT ALL ON public.property_alerts TO service_role;

-- Create function to process new property alerts
CREATE OR REPLACE FUNCTION process_new_property_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process approved properties
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Insert a job record to be processed by the application
    INSERT INTO property_alert_jobs (property_id, status, created_at)
    VALUES (NEW.id, 'pending', now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create property alert jobs table for queuing
CREATE TABLE IF NOT EXISTS public.property_alert_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES property_listings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for jobs table
ALTER TABLE public.property_alert_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for jobs table
CREATE POLICY "System can manage alert jobs" ON public.property_alert_jobs
  FOR ALL USING (true);

-- Create indexes for jobs table
CREATE INDEX IF NOT EXISTS idx_property_alert_jobs_status ON public.property_alert_jobs(status);
CREATE INDEX IF NOT EXISTS idx_property_alert_jobs_created_at ON public.property_alert_jobs(created_at);

-- Create trigger for property alert jobs
CREATE TRIGGER update_property_alert_jobs_updated_at
  BEFORE UPDATE ON public.property_alert_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create the trigger on property_listings table
DROP TRIGGER IF EXISTS trigger_process_new_property_alert ON public.property_listings;
CREATE TRIGGER trigger_process_new_property_alert
  AFTER INSERT OR UPDATE OF status ON public.property_listings
  FOR EACH ROW
  EXECUTE FUNCTION process_new_property_alert();

-- Grant permissions for jobs table
GRANT ALL ON public.property_alert_jobs TO service_role;
GRANT SELECT ON public.property_alert_jobs TO authenticated;

-- Create function to get pending alert jobs
CREATE OR REPLACE FUNCTION get_pending_alert_jobs(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  property_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    paj.id,
    paj.property_id,
    paj.created_at
  FROM property_alert_jobs paj
  WHERE paj.status = 'pending'
  ORDER BY paj.created_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark alert job as processing
CREATE OR REPLACE FUNCTION mark_alert_job_processing(job_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE property_alert_jobs 
  SET 
    status = 'processing',
    updated_at = now()
  WHERE id = job_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark alert job as completed
CREATE OR REPLACE FUNCTION mark_alert_job_completed(job_id UUID, error_msg TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE property_alert_jobs 
  SET 
    status = CASE WHEN error_msg IS NOT NULL THEN 'failed' ELSE 'completed' END,
    processed_at = now(),
    error_message = error_msg,
    updated_at = now()
  WHERE id = job_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_pending_alert_jobs(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION mark_alert_job_processing(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION mark_alert_job_completed(UUID, TEXT) TO service_role;
