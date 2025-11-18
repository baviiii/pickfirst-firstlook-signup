-- Fix property alerts RLS policy to allow users to view their alert history
-- Users should be able to view their own alert history regardless of current subscription status
-- since these are historical records of alerts that were already sent to them

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Buyers can view own alerts with subscription check" ON public.property_alerts;

-- Create a new policy that allows users to view their own alert history
-- without requiring subscription check (since these are historical records)
CREATE POLICY "Buyers can view own alert history" ON public.property_alerts
  FOR SELECT USING (auth.uid() = buyer_id);

-- Keep the subscription check for creating new alerts (this is handled by the Edge Function)
-- The INSERT policy already exists and is handled by service_role

COMMENT ON POLICY "Buyers can view own alert history" ON public.property_alerts IS 
'Allows buyers to view their own property alert history regardless of current subscription status. This ensures users can see alerts that were already sent to them.';

