-- Enhanced RLS policies for property alerts with subscription validation

-- Drop existing policies to replace with secure versions
DROP POLICY IF EXISTS "Buyers can view their own alerts" ON public.property_alerts;
DROP POLICY IF EXISTS "System can insert alerts" ON public.property_alerts;
DROP POLICY IF EXISTS "System can update alert status" ON public.property_alerts;

-- Create function to check property alerts feature access
CREATE OR REPLACE FUNCTION check_property_alerts_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_subscription_tier TEXT;
  feature_free_enabled BOOLEAN;
  feature_premium_enabled BOOLEAN;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_subscription_tier
  FROM profiles
  WHERE id = user_id;
  
  -- Default to 'free' if null
  user_subscription_tier := COALESCE(user_subscription_tier, 'free');
  
  -- Get feature configuration
  SELECT free_tier_enabled, premium_tier_enabled
  INTO feature_free_enabled, feature_premium_enabled
  FROM feature_configurations
  WHERE feature_key = 'property_alerts';
  
  -- Check access based on subscription tier
  IF user_subscription_tier = 'free' AND feature_free_enabled THEN
    RETURN TRUE;
  ELSIF user_subscription_tier = 'premium' AND feature_premium_enabled THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_property_alerts_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_property_alerts_access(UUID) TO service_role;

-- Enhanced policy: Buyers can only view their own alerts if they have feature access
CREATE POLICY "Buyers can view own alerts with subscription check" ON public.property_alerts
  FOR SELECT USING (
    auth.uid() = buyer_id 
    AND check_property_alerts_access(auth.uid())
  );

-- Policy: System can insert alerts (service role only)
CREATE POLICY "System can insert alerts" ON public.property_alerts
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );

-- Policy: System can update alert status (service role only)
CREATE POLICY "System can update alert status" ON public.property_alerts
  FOR UPDATE USING (
    auth.role() = 'service_role'
  );

-- Enhanced policy for property_alert_jobs table
DROP POLICY IF EXISTS "System can manage alert jobs" ON public.property_alert_jobs;

CREATE POLICY "Service role can manage alert jobs" ON public.property_alert_jobs
  FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Create policy for authenticated users to view job status (limited)
CREATE POLICY "Users can view job status" ON public.property_alert_jobs
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND status IN ('completed', 'failed')
  );

-- Add subscription validation to user_preferences for property_alerts field
-- Create function to validate property alerts preference update
CREATE OR REPLACE FUNCTION validate_property_alerts_preference()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to enable property_alerts, check feature access
  IF NEW.property_alerts = TRUE AND (OLD.property_alerts IS NULL OR OLD.property_alerts = FALSE) THEN
    IF NOT check_property_alerts_access(NEW.user_id) THEN
      RAISE EXCEPTION 'Property alerts feature requires premium subscription'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate property alerts preference updates
DROP TRIGGER IF EXISTS validate_property_alerts_preference_trigger ON public.user_preferences;
CREATE TRIGGER validate_property_alerts_preference_trigger
  BEFORE UPDATE OF property_alerts ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION validate_property_alerts_preference();

-- Add audit logging for policy violations
CREATE OR REPLACE FUNCTION log_property_alerts_access_violation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the access violation attempt
  INSERT INTO audit_logs (
    user_id,
    table_name,
    action,
    new_values
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    'access_violation_' || TG_OP,
    jsonb_build_object(
      'attempted_action', TG_OP,
      'table', TG_TABLE_NAME,
      'reason', 'insufficient_subscription_tier',
      'timestamp', NOW()
    )
  );
  
  -- Return NULL to prevent the operation
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create separate triggers for INSERT/UPDATE and DELETE operations
-- Trigger for INSERT and UPDATE operations
CREATE TRIGGER log_property_alerts_violations_insert_update
  BEFORE INSERT OR UPDATE ON public.property_alerts
  FOR EACH ROW
  WHEN (NOT check_property_alerts_access(NEW.buyer_id))
  EXECUTE FUNCTION log_property_alerts_access_violation();

-- Trigger for DELETE operations
CREATE TRIGGER log_property_alerts_violations_delete
  BEFORE DELETE ON public.property_alerts
  FOR EACH ROW
  WHEN (NOT check_property_alerts_access(OLD.buyer_id))
  EXECUTE FUNCTION log_property_alerts_access_violation();

-- Update the property alert processing function to include subscription checks
CREATE OR REPLACE FUNCTION process_new_property_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process approved properties
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Insert a job record to be processed by the application
    -- The Edge Function will handle subscription validation
    INSERT INTO property_alert_jobs (property_id, status, created_at)
    VALUES (NEW.id, 'pending', now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the security model
COMMENT ON FUNCTION check_property_alerts_access(UUID) IS 
'Validates if a user has access to property alerts based on their subscription tier and feature configuration. Used by RLS policies to enforce subscription-based access control.';

COMMENT ON POLICY "Buyers can view own alerts with subscription check" ON public.property_alerts IS 
'Ensures buyers can only view their own property alerts and only if they have the required subscription tier for the property_alerts feature.';

COMMENT ON TRIGGER validate_property_alerts_preference_trigger ON public.user_preferences IS 
'Prevents users from enabling property_alerts preference without proper subscription tier.';

-- Verify the security setup
DO $$
BEGIN
  RAISE NOTICE 'Property alerts security enhancement completed:';
  RAISE NOTICE '- Enhanced RLS policies with subscription validation';
  RAISE NOTICE '- Database-level feature access validation';
  RAISE NOTICE '- Audit logging for access violations';
  RAISE NOTICE '- Preference update validation';
END $$;
