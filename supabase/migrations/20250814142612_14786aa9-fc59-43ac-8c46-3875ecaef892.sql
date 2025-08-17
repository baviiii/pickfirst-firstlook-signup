-- Fix security issues from the linter

-- Fix function search path for existing functions
DROP FUNCTION IF EXISTS create_system_alert(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

-- Recreate with proper search path
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
SET search_path = public
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

-- Fix existing functions by adding search path
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'agent' THEN 'agent'
      WHEN NEW.raw_user_meta_data->>'user_type' = 'super_admin' THEN 'super_admin'
      ELSE 'buyer'
    END
  );
  RETURN NEW;
END;
$$;

-- Drop the view with security definer and recreate as a normal view
DROP VIEW IF EXISTS database_statistics;

-- Create a secure function instead of a view for database statistics
CREATE OR REPLACE FUNCTION get_database_statistics()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  table_size TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'profiles'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('profiles'::regclass)) as table_size
  FROM profiles
  UNION ALL
  SELECT 
    'property_listings'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('property_listings'::regclass)) as table_size
  FROM property_listings
  UNION ALL
  SELECT 
    'property_inquiries'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('property_inquiries'::regclass)) as table_size
  FROM property_inquiries
  UNION ALL
  SELECT 
    'property_favorites'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('property_favorites'::regclass)) as table_size
  FROM property_favorites
  UNION ALL
  SELECT 
    'conversations'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('conversations'::regclass)) as table_size
  FROM conversations
  UNION ALL
  SELECT 
    'messages'::TEXT as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('messages'::regclass)) as table_size
  FROM messages;
END;
$$;