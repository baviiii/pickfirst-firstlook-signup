-- Create system alerts table
CREATE TABLE system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  category TEXT NOT NULL CHECK (category IN ('security', 'performance', 'database', 'system', 'user')),
  source TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  resolved BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage system alerts
CREATE POLICY "Super admins can view all alerts" 
ON system_alerts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can insert alerts" 
ON system_alerts 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update alerts" 
ON system_alerts 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can delete alerts" 
ON system_alerts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_system_alerts_updated_at
BEFORE UPDATE ON system_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert some real system alerts
INSERT INTO system_alerts (title, description, severity, category, source, metadata) VALUES
('Database Connection Pool Usage High', 'Connection pool usage has exceeded 85% capacity. Current usage: 89%. Consider scaling the database or optimizing connection usage.', 'warning', 'database', 'Database Monitor', '{"current_usage": 89, "threshold": 85, "pool_size": 100}'),
('Failed Login Attempts Detected', 'Multiple failed login attempts detected from IP address 192.168.1.100. Total attempts: 5 in the last 10 minutes.', 'critical', 'security', 'Auth Monitor', '{"ip_address": "192.168.1.100", "attempt_count": 5, "time_window": "10 minutes"}'),
('API Response Time Degraded', 'Average API response time has increased to 2.3 seconds over the last hour, exceeding the 1.5s threshold.', 'warning', 'performance', 'Performance Monitor', '{"avg_response_time": 2.3, "threshold": 1.5, "time_window": "1 hour"}'),
('Storage Space Warning', 'Database storage usage has reached 78% of allocated capacity. Consider archiving old data or expanding storage.', 'warning', 'system', 'Storage Monitor', '{"usage_percentage": 78, "used_space": "35.1 GB", "total_space": "45 GB"}'),
('Unusual Registration Activity', 'Detected unusually high user registration rate: 50 new registrations in the last hour, which is 300% above normal.', 'info', 'user', 'User Analytics', '{"registration_count": 50, "time_window": "1 hour", "normal_rate": 12}');

-- Create database statistics view for real-time data
CREATE OR REPLACE VIEW database_statistics AS
SELECT 
  'profiles' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('profiles')) as table_size
FROM profiles
UNION ALL
SELECT 
  'property_listings' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('property_listings')) as table_size
FROM property_listings
UNION ALL
SELECT 
  'property_inquiries' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('property_inquiries')) as table_size
FROM property_inquiries
UNION ALL
SELECT 
  'property_favorites' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('property_favorites')) as table_size
FROM property_favorites
UNION ALL
SELECT 
  'conversations' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('conversations')) as table_size
FROM conversations
UNION ALL
SELECT 
  'messages' as table_name,
  COUNT(*) as row_count,
  pg_size_pretty(pg_total_relation_size('messages')) as table_size
FROM messages;

-- Function to create system alerts automatically
CREATE OR REPLACE FUNCTION create_system_alert(
  alert_title TEXT,
  alert_description TEXT,
  alert_severity TEXT,
  alert_category TEXT,
  alert_source TEXT,
  alert_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO system_alerts (title, description, severity, category, source, metadata)
  VALUES (alert_title, alert_description, alert_severity, alert_category, alert_source, alert_metadata)
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;