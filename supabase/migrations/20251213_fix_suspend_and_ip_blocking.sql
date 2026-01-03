-- Fix subscription status constraint to allow 'suspended'
-- Create blocked_ips table for IP blocking functionality
-- Migration: 20251213_fix_suspend_and_ip_blocking.sql

-- Step 1: Drop existing constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Step 2: Add new constraint with 'suspended' status
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text, 'cancelled'::text, 'suspended'::text]));

-- Step 3: Create blocked_ips table
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  blocked_by TEXT NOT NULL DEFAULT 'system',
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  unblocked_at TIMESTAMP WITH TIME ZONE,
  unblocked_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step 3a: Add missing columns if table already exists (for existing installations)
ALTER TABLE public.blocked_ips 
ADD COLUMN IF NOT EXISTS unblocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unblocked_by TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 4: Create indexes for blocked_ips
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_is_active ON public.blocked_ips(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_at ON public.blocked_ips(blocked_at);

-- Step 5: Enable RLS on blocked_ips
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for blocked_ips
-- Drop existing policies first (for idempotency)
DROP POLICY IF EXISTS "Super admins can view all blocked IPs" ON public.blocked_ips;
DROP POLICY IF EXISTS "Super admins can block IPs" ON public.blocked_ips;
DROP POLICY IF EXISTS "Super admins can update blocked IPs" ON public.blocked_ips;
DROP POLICY IF EXISTS "Super admins can manage blocked IPs" ON public.blocked_ips;
DROP POLICY IF EXISTS "Service role can manage blocked IPs" ON public.blocked_ips;
DROP POLICY IF EXISTS "Public can check if IP is blocked" ON public.blocked_ips;

-- Super admins can view all blocked IPs
CREATE POLICY "Super admins can view all blocked IPs"
  ON public.blocked_ips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can insert blocked IPs
CREATE POLICY "Super admins can block IPs"
  ON public.blocked_ips
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can update blocked IPs (for unblocking)
CREATE POLICY "Super admins can update blocked IPs"
  ON public.blocked_ips
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Service role can do everything (for system operations)
CREATE POLICY "Service role can manage blocked IPs"
  ON public.blocked_ips
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Public can check if their IP is blocked (SELECT only, no data exposure)
-- This is needed for authentication checks
CREATE POLICY "Public can check if IP is blocked"
  ON public.blocked_ips
  FOR SELECT
  USING (is_active = true);

-- Step 7: Create function to check if IP is blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(ip_address_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.blocked_ips 
    WHERE ip_address = ip_address_to_check 
      AND is_active = true
  );
END;
$$;

-- Step 8: Grant permissions
GRANT SELECT ON public.blocked_ips TO authenticated;
GRANT SELECT ON public.blocked_ips TO anon;
GRANT ALL ON public.blocked_ips TO service_role;

-- Step 9: Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_blocked_ips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS update_blocked_ips_updated_at ON public.blocked_ips;

CREATE TRIGGER update_blocked_ips_updated_at
  BEFORE UPDATE ON public.blocked_ips
  FOR EACH ROW
  EXECUTE FUNCTION update_blocked_ips_updated_at();

-- Step 10: Create function to block IP (for use by system - bypasses RLS)
CREATE OR REPLACE FUNCTION public.block_ip(
  ip_address_to_block TEXT,
  block_reason TEXT DEFAULT NULL,
  blocked_by_user TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  blocked_id UUID;
BEGIN
  -- Check if already blocked
  SELECT id INTO blocked_id
  FROM public.blocked_ips
  WHERE ip_address = ip_address_to_block AND is_active = true;
  
  IF blocked_id IS NOT NULL THEN
    RETURN blocked_id;
  END IF;
  
  -- If previously blocked but unblocked, reactivate it
  SELECT id INTO blocked_id
  FROM public.blocked_ips
  WHERE ip_address = ip_address_to_block AND is_active = false;
  
  IF blocked_id IS NOT NULL THEN
    UPDATE public.blocked_ips
    SET 
      is_active = true,
      blocked_at = NOW(),
      blocked_by = blocked_by_user,
      reason = COALESCE(block_reason, reason),
      unblocked_at = NULL,
      unblocked_by = NULL,
      updated_at = NOW()
    WHERE id = blocked_id;
    RETURN blocked_id;
  END IF;
  
  -- Create new block entry (SECURITY DEFINER bypasses RLS)
  INSERT INTO public.blocked_ips (ip_address, reason, blocked_by, blocked_at, is_active)
  VALUES (ip_address_to_block, block_reason, blocked_by_user, NOW(), true)
  RETURNING id INTO blocked_id;
  
  RETURN blocked_id;
END;
$$;

-- Step 11: Create function to unblock IP (super admin only)
CREATE OR REPLACE FUNCTION public.unblock_ip(
  ip_address_to_unblock TEXT,
  unblocked_by_user TEXT DEFAULT 'system'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Only allow super admins to unblock IPs
  IF NOT has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Permission denied: Only super admins can unblock IP addresses';
  END IF;

  UPDATE public.blocked_ips
  SET 
    is_active = false,
    unblocked_at = NOW(),
    unblocked_by = unblocked_by_user
  WHERE ip_address = ip_address_to_unblock AND is_active = true;
  
  RETURN FOUND;
END;
$$;

-- Step 12: Grant execute permissions
-- block_ip: accessible to authenticated and anon (for auto-blocking during login)
GRANT EXECUTE ON FUNCTION public.block_ip TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_ip TO anon;

-- unblock_ip: Only accessible to authenticated users (function itself checks for super_admin)
-- We don't grant to anon because unblocking should require authentication
GRANT EXECUTE ON FUNCTION public.unblock_ip TO authenticated;
-- Note: The function itself enforces super_admin check, so even authenticated users
-- who aren't super admins will get a permission denied error

-- Step 13: Add comment
COMMENT ON TABLE public.blocked_ips IS 'Stores blocked IP addresses for security purposes';
COMMENT ON FUNCTION public.is_ip_blocked IS 'Checks if an IP address is currently blocked';
COMMENT ON FUNCTION public.block_ip IS 'Blocks an IP address and returns the block record ID (bypasses RLS via SECURITY DEFINER)';
COMMENT ON FUNCTION public.unblock_ip IS 'Unblocks an IP address';

-- Step 13: Create function to check suspicious login activity (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_suspicious_login_activity(
  ip_address_to_check TEXT,
  email_to_check TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_attempts BIGINT,
  failed_attempts BIGINT,
  should_block BOOLEAN,
  should_alert BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  total_count BIGINT;
  failed_count BIGINT;
  should_block_result BOOLEAN := false;
  should_alert_result BOOLEAN := false;
BEGIN
  -- Count total attempts from this IP in last hour (bypasses RLS)
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE success = false)::BIGINT
  INTO total_count, failed_count
  FROM public.login_history
  WHERE ip_address = ip_address_to_check
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Determine if we should block or alert
  IF failed_count >= 10 OR total_count >= 10 THEN
    should_block_result := true;
    should_alert_result := true;
  ELSIF failed_count >= 5 OR total_count >= 5 THEN
    should_alert_result := true;
  ELSIF failed_count >= 3 THEN
    should_alert_result := true;
  END IF;
  
  RETURN QUERY SELECT total_count, failed_count, should_block_result, should_alert_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.check_suspicious_login_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_suspicious_login_activity TO anon;

COMMENT ON FUNCTION public.check_suspicious_login_activity IS 'Checks suspicious login activity for an IP address, bypassing RLS';

