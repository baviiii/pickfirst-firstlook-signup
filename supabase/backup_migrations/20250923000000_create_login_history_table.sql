-- Create login_history table for IP tracking and user activity logging
-- Migration: 20250923000000_create_login_history_table.sql

CREATE TABLE IF NOT EXISTS public.login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  location_info JSONB DEFAULT '{}',
  login_type TEXT NOT NULL DEFAULT 'signin' CHECK (login_type IN ('signin', 'signup', 'password_reset', 'logout')),
  success BOOLEAN NOT NULL DEFAULT true,
  failure_reason TEXT,
  session_id TEXT,
  referer TEXT,
  origin TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_ip_address ON public.login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON public.login_history(created_at);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON public.login_history(email);
CREATE INDEX IF NOT EXISTS idx_login_history_login_type ON public.login_history(login_type);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only view their own login history
CREATE POLICY "Users can view own login history" ON public.login_history
  FOR SELECT USING (auth.uid() = user_id);

-- Super admins can view all login history
CREATE POLICY "Super admins can view all login history" ON public.login_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Only the system can insert login history records (via service role)
CREATE POLICY "System can insert login history" ON public.login_history
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.login_history TO authenticated;
GRANT INSERT ON public.login_history TO service_role;
GRANT SELECT ON public.login_history TO service_role;

-- Create function to clean up old login history (optional - keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_history()
RETURNS void AS $$
BEGIN
  DELETE FROM public.login_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view for recent suspicious login attempts (fixed SQL)
CREATE OR REPLACE VIEW public.suspicious_logins AS
WITH login_attempts AS (
  SELECT 
    lh.*,
    p.full_name,
    p.role,
    COUNT(*) OVER (PARTITION BY lh.ip_address ORDER BY lh.created_at RANGE BETWEEN INTERVAL '1 hour' PRECEDING AND CURRENT ROW) as attempts_last_hour,
    COUNT(*) OVER (PARTITION BY lh.email ORDER BY lh.created_at RANGE BETWEEN INTERVAL '1 hour' PRECEDING AND CURRENT ROW) as email_attempts_last_hour
  FROM public.login_history lh
  LEFT JOIN public.profiles p ON lh.user_id = p.id
  WHERE lh.created_at > NOW() - INTERVAL '24 hours'
)
SELECT *
FROM login_attempts
WHERE success = false OR attempts_last_hour > 5;

-- Grant access to the view
GRANT SELECT ON public.suspicious_logins TO authenticated;
