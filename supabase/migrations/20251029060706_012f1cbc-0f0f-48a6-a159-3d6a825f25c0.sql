-- Fix all SECURITY DEFINER functions to prevent privilege escalation attacks
-- These functions run with elevated privileges and MUST have fixed search_path

-- 1. Fix notification triggers
CREATE OR REPLACE FUNCTION public.notify_property_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  property_title TEXT;
  property_price NUMERIC;
BEGIN
  SELECT title, price INTO property_title, property_price
  FROM property_listings
  WHERE id = NEW.property_id;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.buyer_id,
    'property_alert',
    'New Property Match',
    'A property matching your criteria is available: ' || COALESCE(property_title, 'View property'),
    '/property/' || NEW.property_id,
    jsonb_build_object(
      'property_id', NEW.property_id,
      'alert_id', NEW.id,
      'price', property_price
    )
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_client_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  client_id_from_metadata UUID;
BEGIN
  client_id_from_metadata := (NEW.raw_user_meta_data->>'client_id')::UUID;
  
  IF client_id_from_metadata IS NOT NULL THEN
    UPDATE public.clients
    SET 
      user_id = NEW.id,
      email = NEW.email,
      invite_accepted_at = NOW(),
      updated_at = NOW()
    WHERE id = client_id_from_metadata
      AND user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_subject TEXT;
  recipient_role TEXT;
  message_link TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN NEW.sender_id = c.client_id THEN c.agent_id
      WHEN NEW.sender_id = c.agent_id THEN c.client_id
      ELSE NULL
    END,
    c.subject
  INTO recipient_id, conv_subject
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  SELECT role INTO recipient_role
  FROM profiles
  WHERE id = recipient_id;

  IF recipient_role = 'agent' THEN
    message_link := '/agent-messages';
  ELSIF recipient_role = 'super_admin' THEN
    message_link := '/admin-messages';
  ELSE
    message_link := '/buyer-messages';
  END IF;

  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      recipient_id,
      'new_message',
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      message_link,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  property_title TEXT;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  client_role TEXT;
  appointment_link TEXT;
BEGIN
  SELECT title INTO property_title
  FROM property_listings
  WHERE id = NEW.property_id;

  SELECT role INTO client_role
  FROM profiles
  WHERE id = NEW.client_id;

  IF client_role = 'agent' THEN
    appointment_link := '/appointments';
  ELSIF client_role = 'super_admin' THEN
    appointment_link := '/appointments';
  ELSE
    appointment_link := '/buyer-account-settings?tab=appointments';
  END IF;

  IF TG_OP = 'INSERT' THEN
    notification_type := 'appointment_scheduled';
    notification_title := 'Appointment Scheduled';
    notification_message := 'Your ' || NEW.appointment_type || ' appointment for ' || COALESCE(property_title, 'a property') || ' is scheduled';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      notification_type := 'appointment_confirmed';
      notification_title := 'Appointment Confirmed';
      notification_message := 'Your ' || NEW.appointment_type || ' appointment for ' || COALESCE(property_title, 'a property') || ' has been confirmed';
    ELSIF NEW.status = 'cancelled' THEN
      notification_type := 'appointment_cancelled';
      notification_title := 'Appointment Cancelled';
      notification_message := 'Your appointment for ' || COALESCE(property_title, 'a property') || ' has been cancelled';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.client_id,
    notification_type,
    notification_title,
    notification_message,
    appointment_link,
    jsonb_build_object(
      'appointment_id', NEW.id,
      'property_id', NEW.property_id,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$function$;

-- 2. Fix cleanup and utility functions
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM notifications
  WHERE read = true 
    AND created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM notifications
  WHERE read = false 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_offmarket_listing(listing_id uuid, user_subscription_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  listing_source_type text;
BEGIN
  SELECT listing_source INTO listing_source_type
  FROM property_listings
  WHERE id = listing_id;
  
  IF listing_source_type = 'external_feed' THEN
    RETURN TRUE;
  END IF;
  
  IF listing_source_type = 'agent_posted' AND user_subscription_tier = 'premium' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_early_access_to_listing(listing_id uuid, user_subscription_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  early_access_until timestamp with time zone;
BEGIN
  SELECT early_access_until INTO early_access_until
  FROM property_listings
  WHERE id = listing_id;
  
  IF early_access_until IS NULL THEN
    RETURN TRUE;
  END IF;
  
  IF NOW() < early_access_until THEN
    RETURN user_subscription_tier IN ('basic', 'premium');
  END IF;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_view_vendor_details(user_subscription_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN user_subscription_tier = 'premium';
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.price != OLD.price AND NEW.status = 'approved' THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT 
      f.user_id,
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
    FROM favorites f
    WHERE f.property_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_inquiry_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  property_title TEXT;
BEGIN
  IF NEW.agent_response IS NOT NULL AND (OLD.agent_response IS NULL OR OLD.agent_response != NEW.agent_response) THEN
    SELECT title INTO property_title
    FROM property_listings
    WHERE id = NEW.property_id;

    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.buyer_id,
      'inquiry_response',
      'Agent Response',
      'An agent has responded to your inquiry about ' || COALESCE(property_title, 'a property'),
      '/buyer-messages',
      jsonb_build_object(
        'inquiry_id', NEW.id,
        'property_id', NEW.property_id
      )
    );
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
      user_id,
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
      SELECT f.user_id
      FROM favorites f
      WHERE f.property_id = NEW.id
      UNION
      SELECT pi.buyer_id as user_id
      FROM property_inquiries pi
      WHERE pi.property_id = NEW.id AND pi.buyer_id IS NOT NULL
    ) AS interested_buyers;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Fix property alert functions
CREATE OR REPLACE FUNCTION public.check_property_alerts_access(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  user_subscription_tier TEXT;
  feature_basic_enabled BOOLEAN;
  feature_unlimited_enabled BOOLEAN;
BEGIN
  SELECT subscription_tier INTO user_subscription_tier
  FROM profiles
  WHERE id = user_id;
  
  user_subscription_tier := COALESCE(user_subscription_tier, 'free');
  
  SELECT 
    (SELECT free_tier_enabled FROM feature_configurations WHERE feature_key = 'property_alerts_basic'),
    (SELECT premium_tier_enabled FROM feature_configurations WHERE feature_key = 'property_alerts_unlimited')
  INTO feature_basic_enabled, feature_unlimited_enabled;
  
  IF user_subscription_tier = 'free' AND feature_basic_enabled THEN
    RETURN TRUE;
  ELSIF user_subscription_tier = 'premium' AND feature_unlimited_enabled THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_login_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.login_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_system_alert(alert_title text, alert_description text, alert_severity text, alert_category text, alert_source text, alert_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO system_alerts (title, description, severity, category, source, metadata)
  VALUES (alert_title, alert_description, alert_severity, alert_category, alert_source, alert_metadata)
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_database_performance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  result jsonb;
  active_connections int;
  total_size bigint;
  cache_hit_ratio numeric;
BEGIN
  SELECT count(*) INTO active_connections
  FROM pg_stat_activity
  WHERE state = 'active' AND pid != pg_backend_pid();
  
  SELECT pg_database_size(current_database()) INTO total_size;
  
  SELECT 
    CASE 
      WHEN (sum(heap_blks_hit) + sum(heap_blks_read)) > 0 
      THEN round(sum(heap_blks_hit) * 100.0 / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
      ELSE 0 
    END INTO cache_hit_ratio
  FROM pg_statio_user_tables;
  
  result := jsonb_build_object(
    'active_connections', active_connections,
    'database_size_bytes', total_size,
    'cache_hit_ratio', cache_hit_ratio,
    'timestamp', now()
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_database_statistics()
RETURNS TABLE(table_name text, row_count bigint, table_size text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_pending_alert_jobs(limit_count integer DEFAULT 10)
RETURNS TABLE(id uuid, property_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_property_alerts_access_violation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
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
  
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_alert_job_completed(job_id uuid, error_msg text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.mark_alert_job_processing(job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE property_alert_jobs 
  SET 
    status = 'processing',
    updated_at = now()
  WHERE id = job_id AND status = 'pending';
  
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.optimize_database()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  indexes_rebuilt text[] := ARRAY[]::text[];
  index_name text;
  result jsonb;
BEGIN
  FOR index_name IN 
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('REINDEX INDEX public.%I', index_name);
    indexes_rebuilt := array_append(indexes_rebuilt, index_name);
  END LOOP;
  
  EXECUTE 'ANALYZE';
  
  result := jsonb_build_object(
    'success', true,
    'indexes_rebuilt', indexes_rebuilt,
    'total_indexes', array_length(indexes_rebuilt, 1),
    'timestamp', now()
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_new_property_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
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
$function$;

CREATE OR REPLACE FUNCTION public.run_database_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  tables_processed text[] := ARRAY[]::text[];
  table_name text;
  result jsonb;
BEGIN
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('VACUUM ANALYZE public.%I', table_name);
    tables_processed := array_append(tables_processed, table_name);
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'tables_processed', tables_processed,
    'total_tables', array_length(tables_processed, 1),
    'timestamp', now()
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  UPDATE public.conversations 
  SET 
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;