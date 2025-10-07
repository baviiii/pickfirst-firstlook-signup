

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_property_alerts_access"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_subscription_tier TEXT;
  feature_basic_enabled BOOLEAN;
  feature_unlimited_enabled BOOLEAN;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_subscription_tier
  FROM profiles
  WHERE id = user_id;
  
  -- Default to 'free' if null
  user_subscription_tier := COALESCE(user_subscription_tier, 'free');
  
  -- Get feature configurations for both basic and unlimited alerts
  SELECT 
    (SELECT free_tier_enabled FROM feature_configurations WHERE feature_key = 'property_alerts_basic'),
    (SELECT premium_tier_enabled FROM feature_configurations WHERE feature_key = 'property_alerts_unlimited')
  INTO feature_basic_enabled, feature_unlimited_enabled;
  
  -- Check access based on subscription tier
  IF user_subscription_tier = 'free' AND feature_basic_enabled THEN
    RETURN TRUE;
  ELSIF user_subscription_tier = 'premium' AND feature_unlimited_enabled THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."check_property_alerts_access"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_property_alerts_access"("user_id" "uuid") IS 'Validates if a user has access to property alerts based on their subscription tier and feature configuration. Updated to use correct feature keys: property_alerts_basic for free tier and property_alerts_unlimited for premium tier.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_login_history"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.login_history 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_login_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_system_alert"("alert_title" "text", "alert_description" "text", "alert_severity" "text", "alert_category" "text", "alert_source" "text", "alert_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_system_alert"("alert_title" "text", "alert_description" "text", "alert_severity" "text", "alert_category" "text", "alert_source" "text", "alert_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_database_performance"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
  active_connections int;
  total_size bigint;
  cache_hit_ratio numeric;
BEGIN
  -- Get active connections
  SELECT count(*) INTO active_connections
  FROM pg_stat_activity
  WHERE state = 'active' AND pid != pg_backend_pid();
  
  -- Get total database size
  SELECT pg_database_size(current_database()) INTO total_size;
  
  -- Calculate cache hit ratio
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
$$;


ALTER FUNCTION "public"."get_database_performance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_database_statistics"() RETURNS TABLE("table_name" "text", "row_count" bigint, "table_size" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_database_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pending_alert_jobs"("limit_count" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "property_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_pending_alert_jobs"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Insert profile
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
  
  -- Create default preferences for the new user
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_property_alerts_access_violation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."log_property_alerts_access_violation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_alert_job_completed"("job_id" "uuid", "error_msg" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."mark_alert_job_completed"("job_id" "uuid", "error_msg" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_alert_job_processing"("job_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE property_alert_jobs 
  SET 
    status = 'processing',
    updated_at = now()
  WHERE id = job_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."mark_alert_job_processing"("job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."optimize_database"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  indexes_rebuilt text[] := ARRAY[]::text[];
  index_name text;
  result jsonb;
BEGIN
  -- Rebuild all indexes in the public schema
  FOR index_name IN 
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND indexname NOT LIKE 'pg_%'
  LOOP
    -- Reindex each index
    EXECUTE format('REINDEX INDEX public.%I', index_name);
    indexes_rebuilt := array_append(indexes_rebuilt, index_name);
  END LOOP;
  
  -- Update table statistics for query planner
  EXECUTE 'ANALYZE';
  
  result := jsonb_build_object(
    'success', true,
    'indexes_rebuilt', indexes_rebuilt,
    'total_indexes', array_length(indexes_rebuilt, 1),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."optimize_database"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_new_property_alert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."process_new_property_alert"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."process_new_property_alert"() IS 'Processes property alerts for both auto-loaded properties (INSERT with status=approved) and manually approved properties (UPDATE status to approved).';



CREATE OR REPLACE FUNCTION "public"."run_database_maintenance"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tables_processed text[] := ARRAY[]::text[];
  table_name text;
  result jsonb;
BEGIN
  -- List of tables to maintain
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
  LOOP
    -- Run VACUUM ANALYZE on each table
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
$$;


ALTER FUNCTION "public"."run_database_maintenance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_calendar_integrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_calendar_integrations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.conversations 
  SET 
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_property_alerts_preference"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_property_alerts_preference"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."appointments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "inquiry_id" "uuid",
    "client_name" "text" NOT NULL,
    "client_phone" "text",
    "client_email" "text" NOT NULL,
    "property_id" "uuid",
    "property_address" "text" DEFAULT 'Virtual/Office Meeting'::"text" NOT NULL,
    "appointment_type" "text" NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone NOT NULL,
    "duration" integer DEFAULT 60 NOT NULL,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "appointments_appointment_type_check" CHECK (("appointment_type" = ANY (ARRAY['property_showing'::"text", 'consultation'::"text", 'contract_review'::"text", 'closing'::"text", 'follow_up'::"text"]))),
    CONSTRAINT "appointments_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'declined'::"text", 'completed'::"text", 'cancelled'::"text", 'no_show'::"text"])))
);


ALTER TABLE "public"."appointments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "status" "text" DEFAULT 'lead'::"text" NOT NULL,
    "budget_range" "text",
    "preferred_areas" "text"[],
    "property_type" "text",
    "rating" integer DEFAULT 0,
    "notes" "text",
    "last_contact" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clients_rating_check" CHECK ((("rating" >= 0) AND ("rating" <= 5))),
    CONSTRAINT "clients_status_check" CHECK (("status" = ANY (ARRAY['lead'::"text", 'active'::"text", 'inactive'::"text", 'past_client'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "text" DEFAULT 'buyer'::"text" NOT NULL,
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "subscription_status" "text" DEFAULT 'inactive'::"text",
    "subscription_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "avatar_url" "text",
    "phone" "text",
    "bio" "text",
    "location" "text",
    "company" "text",
    "website" "text",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "subscription_product_id" "text",
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['buyer'::"text", 'agent'::"text", 'super_admin'::"text"]))),
    CONSTRAINT "profiles_subscription_status_check" CHECK (("subscription_status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'expired'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "profiles_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'basic'::"text", 'premium'::"text", 'pro'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_inquiries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "contact_preference" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone,
    "agent_response" "text",
    CONSTRAINT "property_inquiries_contact_preference_check" CHECK (("contact_preference" = ANY (ARRAY['email'::"text", 'phone'::"text", 'both'::"text"]))),
    CONSTRAINT "property_inquiries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'responded'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."property_inquiries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "property_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "price" numeric(12,2) NOT NULL,
    "bedrooms" integer,
    "bathrooms" numeric(3,1),
    "square_feet" integer,
    "lot_size" numeric(10,2),
    "year_built" integer,
    "address" "text" NOT NULL,
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "zip_code" "text" NOT NULL,
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "features" "text"[],
    "images" "text"[],
    "contact_phone" "text",
    "contact_email" "text",
    "showing_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "rejection_reason" "text",
    "sold_to_client_id" "uuid",
    "sold_date" timestamp with time zone,
    "sold_price" numeric(12,2),
    CONSTRAINT "property_listings_property_type_check" CHECK (("property_type" = ANY (ARRAY['house'::"text", 'apartment'::"text", 'condo'::"text", 'townhouse'::"text", 'land'::"text", 'commercial'::"text", 'other'::"text"]))),
    CONSTRAINT "property_listings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'sold'::"text"])))
);


ALTER TABLE "public"."property_listings" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_analytics" AS
 SELECT "pl"."agent_id",
    "count"(DISTINCT
        CASE
            WHEN ("pl"."status" = 'approved'::"text") THEN "pl"."id"
            ELSE NULL::"uuid"
        END) AS "active_listings",
    "count"(DISTINCT
        CASE
            WHEN ("pl"."status" = 'sold'::"text") THEN "pl"."id"
            ELSE NULL::"uuid"
        END) AS "total_sales",
    "count"(DISTINCT
        CASE
            WHEN (("pl"."status" = 'sold'::"text") AND ("pl"."sold_date" >= (CURRENT_DATE - '30 days'::interval))) THEN "pl"."id"
            ELSE NULL::"uuid"
        END) AS "monthly_sales",
    "count"(DISTINCT
        CASE
            WHEN (("pl"."status" = 'sold'::"text") AND ("pl"."sold_date" >= (CURRENT_DATE - '7 days'::interval))) THEN "pl"."id"
            ELSE NULL::"uuid"
        END) AS "weekly_sales",
    COALESCE("sum"(
        CASE
            WHEN (("pl"."status" = 'sold'::"text") AND ("pl"."sold_date" >= (CURRENT_DATE - '30 days'::interval))) THEN "pl"."sold_price"
            ELSE NULL::numeric
        END), (0)::numeric) AS "monthly_revenue",
    COALESCE("avg"(
        CASE
            WHEN ("pl"."status" = 'sold'::"text") THEN "pl"."sold_price"
            ELSE NULL::numeric
        END), (0)::numeric) AS "avg_sale_price",
    "count"(DISTINCT "c"."id") AS "total_clients",
    "count"(DISTINCT "a"."id") AS "total_appointments",
    "count"(DISTINCT
        CASE
            WHEN ("a"."date" >= (CURRENT_DATE - '30 days'::interval)) THEN "a"."id"
            ELSE NULL::"uuid"
        END) AS "monthly_appointments",
    "count"(DISTINCT "pi"."id") AS "total_inquiries",
    "count"(DISTINCT
        CASE
            WHEN ("pi"."created_at" >= (CURRENT_DATE - '30 days'::interval)) THEN "pi"."id"
            ELSE NULL::"uuid"
        END) AS "monthly_inquiries"
   FROM (((("public"."profiles" "p"
     LEFT JOIN "public"."property_listings" "pl" ON (("p"."id" = "pl"."agent_id")))
     LEFT JOIN "public"."clients" "c" ON (("p"."id" = "c"."agent_id")))
     LEFT JOIN "public"."appointments" "a" ON (("p"."id" = "a"."agent_id")))
     LEFT JOIN "public"."property_inquiries" "pi" ON (("pl"."id" = "pi"."property_id")))
  WHERE ("p"."role" = 'agent'::"text")
  GROUP BY "pl"."agent_id";


ALTER VIEW "public"."agent_analytics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_client_sources" AS
 SELECT "agent_id",
        CASE
            WHEN (("notes" ~~* '%referral%'::"text") OR ("notes" ~~* '%referred%'::"text")) THEN 'Referrals'::"text"
            WHEN (("notes" ~~* '%online%'::"text") OR ("notes" ~~* '%website%'::"text") OR ("notes" ~~* '%internet%'::"text")) THEN 'Online'::"text"
            WHEN (("notes" ~~* '%walk%'::"text") OR ("notes" ~~* '%office%'::"text")) THEN 'Walk-ins'::"text"
            WHEN (("notes" ~~* '%marketing%'::"text") OR ("notes" ~~* '%advertisement%'::"text") OR ("notes" ~~* '%ad%'::"text")) THEN 'Marketing'::"text"
            ELSE 'Other'::"text"
        END AS "source",
    "count"(*) AS "count"
   FROM "public"."clients" "c"
  GROUP BY "agent_id",
        CASE
            WHEN (("notes" ~~* '%referral%'::"text") OR ("notes" ~~* '%referred%'::"text")) THEN 'Referrals'::"text"
            WHEN (("notes" ~~* '%online%'::"text") OR ("notes" ~~* '%website%'::"text") OR ("notes" ~~* '%internet%'::"text")) THEN 'Online'::"text"
            WHEN (("notes" ~~* '%walk%'::"text") OR ("notes" ~~* '%office%'::"text")) THEN 'Walk-ins'::"text"
            WHEN (("notes" ~~* '%marketing%'::"text") OR ("notes" ~~* '%advertisement%'::"text") OR ("notes" ~~* '%ad%'::"text")) THEN 'Marketing'::"text"
            ELSE 'Other'::"text"
        END;


ALTER VIEW "public"."agent_client_sources" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."agent_monthly_performance" AS
 SELECT "p"."agent_id",
    "date_trunc"('month'::"text", COALESCE("p"."sold_date", "p"."created_at")) AS "month",
    "count"(*) FILTER (WHERE (("p"."status" = 'approved'::"text") OR ("p"."status" = 'sold'::"text"))) AS "listings",
    "count"(DISTINCT "a"."id") AS "showings",
    "count"(*) FILTER (WHERE ("p"."status" = 'sold'::"text")) AS "sales",
    COALESCE("sum"("p"."sold_price"), (0)::numeric) AS "revenue"
   FROM ("public"."property_listings" "p"
     LEFT JOIN "public"."appointments" "a" ON (("p"."id" = "a"."property_id")))
  WHERE ("p"."created_at" >= (CURRENT_DATE - '1 year'::interval))
  GROUP BY "p"."agent_id", ("date_trunc"('month'::"text", COALESCE("p"."sold_date", "p"."created_at")))
  ORDER BY ("date_trunc"('month'::"text", COALESCE("p"."sold_date", "p"."created_at"))) DESC;


ALTER VIEW "public"."agent_monthly_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_specialties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "specialty" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agent_specialties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "calendar_id" "text" NOT NULL,
    "calendar_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "calendar_integrations_provider_check" CHECK (("provider" = ANY (ARRAY['google'::"text", 'outlook'::"text", 'apple'::"text"])))
);


ALTER TABLE "public"."calendar_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "interaction_type" "text" NOT NULL,
    "subject" "text",
    "content" "text",
    "duration_minutes" integer,
    "outcome" "text",
    "next_follow_up" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "client_interactions_interaction_type_check" CHECK (("interaction_type" = ANY (ARRAY['call'::"text", 'email'::"text", 'text'::"text", 'meeting'::"text", 'showing'::"text", 'offer_submitted'::"text", 'offer_accepted'::"text", 'offer_rejected'::"text"])))
);


ALTER TABLE "public"."client_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "note_type" "text" DEFAULT 'general'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "client_notes_note_type_check" CHECK (("note_type" = ANY (ARRAY['general'::"text", 'meeting'::"text", 'showing'::"text", 'offer'::"text", 'follow_up'::"text", 'important'::"text"])))
);


ALTER TABLE "public"."client_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid",
    "client_id" "uuid",
    "inquiry_id" "uuid",
    "subject" "text",
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    "priority" "text" DEFAULT 'normal'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feature_configurations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feature_key" "text" NOT NULL,
    "feature_name" "text" NOT NULL,
    "description" "text",
    "free_tier_enabled" boolean DEFAULT false NOT NULL,
    "premium_tier_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."feature_configurations" OWNER TO "postgres";


COMMENT ON TABLE "public"."feature_configurations" IS 'Feature gates for subscription tiers. Clean gates added 2025-01-28. Legacy gates marked for removal.';



CREATE TABLE IF NOT EXISTS "public"."login_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "ip_address" "text" NOT NULL,
    "user_agent" "text",
    "device_info" "jsonb" DEFAULT '{}'::"jsonb",
    "location_info" "jsonb" DEFAULT '{}'::"jsonb",
    "login_type" "text" DEFAULT 'signin'::"text" NOT NULL,
    "success" boolean DEFAULT true NOT NULL,
    "failure_reason" "text",
    "session_id" "text",
    "referer" "text",
    "origin" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "login_history_login_type_check" CHECK (("login_type" = ANY (ARRAY['signin'::"text", 'signup'::"text", 'password_reset'::"text", 'logout'::"text"])))
);


ALTER TABLE "public"."login_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "content_type" "text" DEFAULT 'text'::"text",
    "delivered_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_alert_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "processed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_alert_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."property_alert_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "email_template" "text" DEFAULT 'propertyAlert'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "property_alerts_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."property_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_filters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "filters" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_filters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "price_monthly" numeric(10,2),
    "price_yearly" numeric(10,2),
    "features" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "max_listings" integer,
    "featured_listings_included" integer DEFAULT 0,
    "priority_support" boolean DEFAULT false,
    "advanced_analytics" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "stripe_product_id" "text",
    "stripe_price_id" "text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."suspicious_logins" AS
 WITH "login_attempts" AS (
         SELECT "lh"."id",
            "lh"."user_id",
            "lh"."email",
            "lh"."ip_address",
            "lh"."user_agent",
            "lh"."device_info",
            "lh"."location_info",
            "lh"."login_type",
            "lh"."success",
            "lh"."failure_reason",
            "lh"."session_id",
            "lh"."referer",
            "lh"."origin",
            "lh"."created_at",
            "p"."full_name",
            "p"."role",
            "count"(*) OVER (PARTITION BY "lh"."ip_address" ORDER BY "lh"."created_at" RANGE BETWEEN '01:00:00'::interval PRECEDING AND CURRENT ROW) AS "attempts_last_hour",
            "count"(*) OVER (PARTITION BY "lh"."email" ORDER BY "lh"."created_at" RANGE BETWEEN '01:00:00'::interval PRECEDING AND CURRENT ROW) AS "email_attempts_last_hour"
           FROM ("public"."login_history" "lh"
             LEFT JOIN "public"."profiles" "p" ON (("lh"."user_id" = "p"."id")))
          WHERE ("lh"."created_at" > ("now"() - '24:00:00'::interval))
        )
 SELECT "id",
    "user_id",
    "email",
    "ip_address",
    "user_agent",
    "device_info",
    "location_info",
    "login_type",
    "success",
    "failure_reason",
    "session_id",
    "referer",
    "origin",
    "created_at",
    "full_name",
    "role",
    "attempts_last_hour",
    "email_attempts_last_hour"
   FROM "login_attempts"
  WHERE (("success" = false) OR ("attempts_last_hour" > 5));


ALTER VIEW "public"."suspicious_logins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "severity" "text" NOT NULL,
    "category" "text" NOT NULL,
    "source" "text" NOT NULL,
    "acknowledged" boolean DEFAULT false NOT NULL,
    "resolved" boolean DEFAULT false NOT NULL,
    "acknowledged_by" "uuid",
    "resolved_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "system_alerts_category_check" CHECK (("category" = ANY (ARRAY['security'::"text", 'performance'::"text", 'database'::"text", 'system'::"text", 'user'::"text"]))),
    CONSTRAINT "system_alerts_severity_check" CHECK (("severity" = ANY (ARRAY['critical'::"text", 'warning'::"text", 'info'::"text"])))
);


ALTER TABLE "public"."system_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_password_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "password_hash" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_password_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "email_notifications" boolean DEFAULT true,
    "push_notifications" boolean DEFAULT false,
    "marketing_emails" boolean DEFAULT false,
    "property_alerts" boolean DEFAULT true,
    "agent_messages" boolean DEFAULT true,
    "appointment_reminders" boolean DEFAULT true,
    "new_listings" boolean DEFAULT true,
    "price_changes" boolean DEFAULT true,
    "market_updates" boolean DEFAULT false,
    "profile_visibility" "text" DEFAULT 'public'::"text",
    "show_email" boolean DEFAULT false,
    "show_phone" boolean DEFAULT false,
    "show_location" boolean DEFAULT true,
    "show_activity_status" boolean DEFAULT false,
    "allow_marketing" boolean DEFAULT false,
    "preferred_contact_method" "text" DEFAULT 'email'::"text",
    "budget_range" "text",
    "preferred_areas" "text"[],
    "property_type_preferences" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "personalized_property_notifications" boolean DEFAULT false,
    CONSTRAINT "user_preferences_preferred_contact_method_check" CHECK (("preferred_contact_method" = ANY (ARRAY['email'::"text", 'phone'::"text", 'both'::"text"]))),
    CONSTRAINT "user_preferences_profile_visibility_check" CHECK (("profile_visibility" = ANY (ARRAY['public'::"text", 'private'::"text", 'contacts_only'::"text"])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agent_specialties"
    ADD CONSTRAINT "agent_specialties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_integrations"
    ADD CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_interactions"
    ADD CONSTRAINT "client_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_notes"
    ADD CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_agent_id_id_key" UNIQUE ("agent_id", "id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_agent_id_client_id_key" UNIQUE ("agent_id", "client_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feature_configurations"
    ADD CONSTRAINT "feature_configurations_feature_key_key" UNIQUE ("feature_key");



ALTER TABLE ONLY "public"."feature_configurations"
    ADD CONSTRAINT "feature_configurations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."login_history"
    ADD CONSTRAINT "login_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_alert_jobs"
    ADD CONSTRAINT "property_alert_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_alerts"
    ADD CONSTRAINT "property_alerts_buyer_id_property_id_key" UNIQUE ("buyer_id", "property_id");



ALTER TABLE ONLY "public"."property_alerts"
    ADD CONSTRAINT "property_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_favorites"
    ADD CONSTRAINT "property_favorites_buyer_id_property_id_key" UNIQUE ("buyer_id", "property_id");



ALTER TABLE ONLY "public"."property_favorites"
    ADD CONSTRAINT "property_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_inquiries"
    ADD CONSTRAINT "property_inquiries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_alerts"
    ADD CONSTRAINT "system_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_specialties"
    ADD CONSTRAINT "unique_user_specialty" UNIQUE ("user_id", "specialty");



ALTER TABLE ONLY "public"."user_password_history"
    ADD CONSTRAINT "user_password_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



CREATE UNIQUE INDEX "calendar_integrations_user_provider_calendar_key" ON "public"."calendar_integrations" USING "btree" ("user_id", "provider", "calendar_id");



CREATE INDEX "idx_appointments_agent_id" ON "public"."appointments" USING "btree" ("agent_id");



CREATE INDEX "idx_appointments_date" ON "public"."appointments" USING "btree" ("date");



CREATE INDEX "idx_appointments_status" ON "public"."appointments" USING "btree" ("status");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "idx_audit_logs_record_id" ON "public"."audit_logs" USING "btree" ("record_id");



CREATE INDEX "idx_audit_logs_table_name" ON "public"."audit_logs" USING "btree" ("table_name");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_calendar_integrations_active" ON "public"."calendar_integrations" USING "btree" ("is_active");



CREATE INDEX "idx_calendar_integrations_provider" ON "public"."calendar_integrations" USING "btree" ("provider");



CREATE INDEX "idx_calendar_integrations_user_id" ON "public"."calendar_integrations" USING "btree" ("user_id");



CREATE INDEX "idx_client_interactions_client_id" ON "public"."client_interactions" USING "btree" ("client_id");



CREATE INDEX "idx_client_interactions_created_at" ON "public"."client_interactions" USING "btree" ("created_at");



CREATE INDEX "idx_client_notes_client_id" ON "public"."client_notes" USING "btree" ("client_id");



CREATE INDEX "idx_client_notes_created_at" ON "public"."client_notes" USING "btree" ("created_at");



CREATE INDEX "idx_clients_agent_id" ON "public"."clients" USING "btree" ("agent_id");



CREATE INDEX "idx_clients_created_at" ON "public"."clients" USING "btree" ("created_at");



CREATE INDEX "idx_clients_email" ON "public"."clients" USING "btree" ("email");



CREATE INDEX "idx_clients_status" ON "public"."clients" USING "btree" ("status");



CREATE INDEX "idx_conversations_agent_id" ON "public"."conversations" USING "btree" ("agent_id");



CREATE INDEX "idx_conversations_client_id" ON "public"."conversations" USING "btree" ("client_id");



CREATE INDEX "idx_conversations_priority" ON "public"."conversations" USING "btree" ("priority");



CREATE INDEX "idx_conversations_status" ON "public"."conversations" USING "btree" ("status");



CREATE INDEX "idx_login_history_created_at" ON "public"."login_history" USING "btree" ("created_at");



CREATE INDEX "idx_login_history_email" ON "public"."login_history" USING "btree" ("email");



CREATE INDEX "idx_login_history_ip_address" ON "public"."login_history" USING "btree" ("ip_address");



CREATE INDEX "idx_login_history_login_type" ON "public"."login_history" USING "btree" ("login_type");



CREATE INDEX "idx_login_history_user_id" ON "public"."login_history" USING "btree" ("user_id");



CREATE INDEX "idx_messages_content_search" ON "public"."messages" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_messages_content_type" ON "public"."messages" USING "btree" ("content_type");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_delivered_at" ON "public"."messages" USING "btree" ("delivered_at");



CREATE INDEX "idx_property_alert_jobs_created_at" ON "public"."property_alert_jobs" USING "btree" ("created_at");



CREATE INDEX "idx_property_alert_jobs_status" ON "public"."property_alert_jobs" USING "btree" ("status");



CREATE INDEX "idx_property_alerts_buyer_id" ON "public"."property_alerts" USING "btree" ("buyer_id");



CREATE INDEX "idx_property_alerts_created_at" ON "public"."property_alerts" USING "btree" ("created_at");



CREATE INDEX "idx_property_alerts_property_id" ON "public"."property_alerts" USING "btree" ("property_id");



CREATE INDEX "idx_property_alerts_status" ON "public"."property_alerts" USING "btree" ("status");



CREATE INDEX "idx_property_listings_agent_id" ON "public"."property_listings" USING "btree" ("agent_id");



CREATE INDEX "idx_property_listings_agent_status" ON "public"."property_listings" USING "btree" ("agent_id", "status");



CREATE INDEX "idx_property_listings_bathrooms" ON "public"."property_listings" USING "btree" ("bathrooms") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_property_listings_bedrooms" ON "public"."property_listings" USING "btree" ("bedrooms") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_property_listings_created_at" ON "public"."property_listings" USING "btree" ("created_at");



CREATE INDEX "idx_property_listings_features" ON "public"."property_listings" USING "gin" ("features") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_property_listings_location" ON "public"."property_listings" USING "btree" ("city", "state");



CREATE INDEX "idx_property_listings_location_text" ON "public"."property_listings" USING "gin" ("to_tsvector"('"english"'::"regconfig", (((("city" || ' '::"text") || "state") || ' '::"text") || "address"))) WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_property_listings_price" ON "public"."property_listings" USING "btree" ("price");



CREATE INDEX "idx_property_listings_price_range" ON "public"."property_listings" USING "btree" ("price") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_property_listings_property_type" ON "public"."property_listings" USING "btree" ("property_type") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_property_listings_sold_date" ON "public"."property_listings" USING "btree" ("sold_date") WHERE ("status" = 'sold'::"text");



CREATE INDEX "idx_property_listings_square_feet" ON "public"."property_listings" USING "btree" ("square_feet") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_property_listings_status" ON "public"."property_listings" USING "btree" ("status");



CREATE INDEX "idx_property_listings_year_built" ON "public"."property_listings" USING "btree" ("year_built") WHERE ("status" = 'approved'::"text");



CREATE INDEX "idx_saved_filters_created_at" ON "public"."saved_filters" USING "btree" ("created_at");



CREATE INDEX "idx_saved_filters_is_default" ON "public"."saved_filters" USING "btree" ("is_default");



CREATE INDEX "idx_saved_filters_user_id" ON "public"."saved_filters" USING "btree" ("user_id");



CREATE INDEX "idx_user_password_history_user_id" ON "public"."user_password_history" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "log_property_alerts_violations_delete" BEFORE DELETE ON "public"."property_alerts" FOR EACH ROW WHEN ((NOT "public"."check_property_alerts_access"("old"."buyer_id"))) EXECUTE FUNCTION "public"."log_property_alerts_access_violation"();



CREATE OR REPLACE TRIGGER "log_property_alerts_violations_insert_update" BEFORE INSERT OR UPDATE ON "public"."property_alerts" FOR EACH ROW WHEN ((NOT "public"."check_property_alerts_access"("new"."buyer_id"))) EXECUTE FUNCTION "public"."log_property_alerts_access_violation"();



CREATE OR REPLACE TRIGGER "trigger_process_new_property_alert" AFTER INSERT OR UPDATE OF "status" ON "public"."property_listings" FOR EACH ROW EXECUTE FUNCTION "public"."process_new_property_alert"();



CREATE OR REPLACE TRIGGER "update_appointments_updated_at" BEFORE UPDATE ON "public"."appointments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_calendar_integrations_updated_at" BEFORE UPDATE ON "public"."calendar_integrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_calendar_integrations_updated_at"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversation_timestamp_trigger" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feature_configurations_updated_at" BEFORE UPDATE ON "public"."feature_configurations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_alert_jobs_updated_at" BEFORE UPDATE ON "public"."property_alert_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_alerts_updated_at" BEFORE UPDATE ON "public"."property_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_listings_updated_at" BEFORE UPDATE ON "public"."property_listings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_saved_filters_updated_at" BEFORE UPDATE ON "public"."saved_filters" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_system_alerts_updated_at" BEFORE UPDATE ON "public"."system_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_property_alerts_preference_trigger" BEFORE UPDATE OF "property_alerts" ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."validate_property_alerts_preference"();



COMMENT ON TRIGGER "validate_property_alerts_preference_trigger" ON "public"."user_preferences" IS 'Prevents users from enabling property_alerts preference without proper subscription tier.';



ALTER TABLE ONLY "public"."agent_specialties"
    ADD CONSTRAINT "agent_specialties_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "public"."property_inquiries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."appointments"
    ADD CONSTRAINT "appointments_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property_listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_integrations"
    ADD CONSTRAINT "calendar_integrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_interactions"
    ADD CONSTRAINT "client_interactions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_interactions"
    ADD CONSTRAINT "client_interactions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_notes"
    ADD CONSTRAINT "client_notes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_notes"
    ADD CONSTRAINT "client_notes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "public"."property_inquiries"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."login_history"
    ADD CONSTRAINT "login_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_alert_jobs"
    ADD CONSTRAINT "property_alert_jobs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_alerts"
    ADD CONSTRAINT "property_alerts_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_alerts"
    ADD CONSTRAINT "property_alerts_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_favorites"
    ADD CONSTRAINT "property_favorites_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_favorites"
    ADD CONSTRAINT "property_favorites_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_inquiries"
    ADD CONSTRAINT "property_inquiries_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_inquiries"
    ADD CONSTRAINT "property_inquiries_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property_listings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."property_listings"
    ADD CONSTRAINT "property_listings_sold_to_client_id_fkey" FOREIGN KEY ("sold_to_client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."saved_filters"
    ADD CONSTRAINT "saved_filters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_alerts"
    ADD CONSTRAINT "system_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."system_alerts"
    ADD CONSTRAINT "system_alerts_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_password_history"
    ADD CONSTRAINT "user_password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can view all audit logs" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Agents can create appointments" ON "public"."appointments" FOR INSERT WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can delete interactions for their clients" ON "public"."client_interactions" FOR DELETE USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can delete notes for their clients" ON "public"."client_notes" FOR DELETE USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can delete their own appointments" ON "public"."appointments" FOR DELETE USING (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can delete their own listings" ON "public"."property_listings" FOR DELETE USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can delete their own specialties" ON "public"."agent_specialties" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Agents can insert buyer profiles" ON "public"."profiles" FOR INSERT WITH CHECK (("role" = 'buyer'::"text"));



CREATE POLICY "Agents can insert interactions for their clients" ON "public"."client_interactions" FOR INSERT WITH CHECK (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can insert new clients" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'agent'::"text"));



CREATE POLICY "Agents can insert new clients for existing buyers" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'agent'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "clients"."id") AND ("profiles"."role" = 'buyer'::"text"))))));



CREATE POLICY "Agents can insert notes for their clients" ON "public"."client_notes" FOR INSERT WITH CHECK (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can insert own clients" ON "public"."clients" FOR INSERT WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can insert their own listings" ON "public"."property_listings" FOR INSERT WITH CHECK (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can insert their own specialties" ON "public"."agent_specialties" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Agents can update buyer profiles" ON "public"."profiles" FOR UPDATE USING (("role" = 'buyer'::"text"));



CREATE POLICY "Agents can update inquiries for their properties" ON "public"."property_inquiries" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."property_listings"
  WHERE (("property_listings"."id" = "property_inquiries"."property_id") AND ("property_listings"."agent_id" = "auth"."uid"())))));



CREATE POLICY "Agents can update interactions for their clients" ON "public"."client_interactions" FOR UPDATE USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can update notes for their clients" ON "public"."client_notes" FOR UPDATE USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can update own clients" ON "public"."clients" FOR UPDATE USING (("agent_id" = "auth"."uid"())) WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can update their own appointments" ON "public"."appointments" FOR UPDATE USING (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can update their own listings" ON "public"."property_listings" FOR UPDATE USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can view all listings" ON "public"."property_listings" FOR SELECT USING (true);



CREATE POLICY "Agents can view buyer profiles" ON "public"."profiles" FOR SELECT USING (("role" = 'buyer'::"text"));



CREATE POLICY "Agents can view inquiries for their properties" ON "public"."property_inquiries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."property_listings"
  WHERE (("property_listings"."id" = "property_inquiries"."property_id") AND ("property_listings"."agent_id" = "auth"."uid"())))));



CREATE POLICY "Agents can view interactions for their clients" ON "public"."client_interactions" FOR SELECT USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can view notes for their clients" ON "public"."client_notes" FOR SELECT USING (("auth"."uid"() = "agent_id"));



CREATE POLICY "Agents can view own clients" ON "public"."clients" FOR SELECT USING (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can view their own appointments" ON "public"."appointments" FOR SELECT USING (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents can view their own specialties" ON "public"."agent_specialties" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Anyone can view active subscription plans" ON "public"."subscription_plans" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view agent basic info" ON "public"."profiles" FOR SELECT USING (("role" = 'agent'::"text"));



CREATE POLICY "Anyone can view approved listings" ON "public"."property_listings" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Anyone can view feature configurations" ON "public"."feature_configurations" FOR SELECT USING (true);



CREATE POLICY "Buyers can create inquiries" ON "public"."property_inquiries" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Buyers can manage own favorites" ON "public"."property_favorites" USING (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Buyers can view own alerts with subscription check" ON "public"."property_alerts" FOR SELECT USING ((("auth"."uid"() = "buyer_id") AND "public"."check_property_alerts_access"("auth"."uid"())));



COMMENT ON POLICY "Buyers can view own alerts with subscription check" ON "public"."property_alerts" IS 'Ensures buyers can only view their own property alerts and only if they have the required subscription tier for the property_alerts feature.';



CREATE POLICY "Buyers can view own inquiries" ON "public"."property_inquiries" FOR SELECT USING (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Service role can manage alert jobs" ON "public"."property_alert_jobs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Super admins can delete alerts" ON "public"."system_alerts" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can delete any listing" ON "public"."property_listings" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can insert alerts" ON "public"."system_alerts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can manage feature configurations" ON "public"."feature_configurations" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can manage subscription plans" ON "public"."subscription_plans" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can update alerts" ON "public"."system_alerts" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can update any listing" ON "public"."property_listings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can view all alerts" ON "public"."system_alerts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can view all login history" ON "public"."login_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can view all profiles" ON "public"."profiles" FOR SELECT USING (((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text") OR (("auth"."jwt"() ->> 'user_type'::"text") = 'super_admin'::"text")));



CREATE POLICY "System can insert alerts" ON "public"."property_alerts" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can insert login history" ON "public"."login_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can update alert status" ON "public"."property_alerts" FOR UPDATE USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT WITH CHECK ((("agent_id" = "auth"."uid"()) OR ("client_id" = "auth"."uid"())));



CREATE POLICY "Users can delete own calendar integrations" ON "public"."calendar_integrations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own saved filters" ON "public"."saved_filters" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own calendar integrations" ON "public"."calendar_integrations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own password history" ON "public"."user_password_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own saved filters" ON "public"."saved_filters" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can send messages in their conversations" ON "public"."messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."agent_id" = "auth"."uid"()) OR ("conversations"."client_id" = "auth"."uid"())))))));



CREATE POLICY "Users can update own calendar integrations" ON "public"."calendar_integrations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own conversations" ON "public"."conversations" FOR UPDATE USING ((("agent_id" = "auth"."uid"()) OR ("client_id" = "auth"."uid"())));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."agent_id" = "auth"."uid"()) OR ("conversations"."client_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own saved filters" ON "public"."saved_filters" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view job status" ON "public"."property_alert_jobs" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND ("status" = ANY (ARRAY['completed'::"text", 'failed'::"text"]))));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."agent_id" = "auth"."uid"()) OR ("conversations"."client_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own calendar integrations" ON "public"."calendar_integrations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own login history" ON "public"."login_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own audit logs" ON "public"."audit_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own conversations" ON "public"."conversations" FOR SELECT USING ((("agent_id" = "auth"."uid"()) OR ("client_id" = "auth"."uid"())));



CREATE POLICY "Users can view their own password history" ON "public"."user_password_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own saved filters" ON "public"."saved_filters" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."agent_specialties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agents_can_manage_client_interactions" ON "public"."client_interactions" TO "authenticated" USING ((((("auth"."jwt"() ->> 'role'::"text") = 'agent'::"text") AND ("agent_id" = "auth"."uid"())) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")));



CREATE POLICY "agents_can_manage_client_notes" ON "public"."client_notes" TO "authenticated" USING ((((("auth"."jwt"() ->> 'role'::"text") = 'agent'::"text") AND ("agent_id" = "auth"."uid"())) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")));



ALTER TABLE "public"."appointments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "buyer can read by client_id" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("client_id" = "auth"."uid"()));



CREATE POLICY "buyer can read by email" ON "public"."appointments" FOR SELECT TO "authenticated" USING (("lower"("client_email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))));



CREATE POLICY "buyer can update own appointment status" ON "public"."appointments" FOR UPDATE TO "authenticated" USING ((("client_id" = "auth"."uid"()) OR ("lower"("client_email") = "lower"(("auth"."jwt"() ->> 'email'::"text"))))) WITH CHECK ((("client_id" = "auth"."uid"()) OR ("lower"("client_email") = "lower"(("auth"."jwt"() ->> 'email'::"text")))));



ALTER TABLE "public"."calendar_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feature_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."login_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_alert_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_inquiries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_filters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_password_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_property_alerts_access"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_property_alerts_access"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_property_alerts_access"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_login_history"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_login_history"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_login_history"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_system_alert"("alert_title" "text", "alert_description" "text", "alert_severity" "text", "alert_category" "text", "alert_source" "text", "alert_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_system_alert"("alert_title" "text", "alert_description" "text", "alert_severity" "text", "alert_category" "text", "alert_source" "text", "alert_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_system_alert"("alert_title" "text", "alert_description" "text", "alert_severity" "text", "alert_category" "text", "alert_source" "text", "alert_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_database_performance"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_database_performance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_database_performance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_database_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_database_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_database_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pending_alert_jobs"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_pending_alert_jobs"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pending_alert_jobs"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_property_alerts_access_violation"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_property_alerts_access_violation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_property_alerts_access_violation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_alert_job_completed"("job_id" "uuid", "error_msg" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_alert_job_completed"("job_id" "uuid", "error_msg" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_alert_job_completed"("job_id" "uuid", "error_msg" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_alert_job_processing"("job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_alert_job_processing"("job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_alert_job_processing"("job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."optimize_database"() TO "anon";
GRANT ALL ON FUNCTION "public"."optimize_database"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."optimize_database"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_new_property_alert"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_new_property_alert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_new_property_alert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_database_maintenance"() TO "anon";
GRANT ALL ON FUNCTION "public"."run_database_maintenance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_database_maintenance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_calendar_integrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_calendar_integrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_calendar_integrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_property_alerts_preference"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_property_alerts_preference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_property_alerts_preference"() TO "service_role";


















GRANT ALL ON TABLE "public"."appointments" TO "anon";
GRANT ALL ON TABLE "public"."appointments" TO "authenticated";
GRANT ALL ON TABLE "public"."appointments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."property_inquiries" TO "anon";
GRANT ALL ON TABLE "public"."property_inquiries" TO "authenticated";
GRANT ALL ON TABLE "public"."property_inquiries" TO "service_role";



GRANT ALL ON TABLE "public"."property_listings" TO "anon";
GRANT ALL ON TABLE "public"."property_listings" TO "authenticated";
GRANT ALL ON TABLE "public"."property_listings" TO "service_role";



GRANT ALL ON TABLE "public"."agent_analytics" TO "anon";
GRANT ALL ON TABLE "public"."agent_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."agent_client_sources" TO "anon";
GRANT ALL ON TABLE "public"."agent_client_sources" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_client_sources" TO "service_role";



GRANT ALL ON TABLE "public"."agent_monthly_performance" TO "anon";
GRANT ALL ON TABLE "public"."agent_monthly_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_monthly_performance" TO "service_role";



GRANT ALL ON TABLE "public"."agent_specialties" TO "anon";
GRANT ALL ON TABLE "public"."agent_specialties" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_specialties" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_integrations" TO "anon";
GRANT ALL ON TABLE "public"."calendar_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."client_interactions" TO "anon";
GRANT ALL ON TABLE "public"."client_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."client_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."client_notes" TO "anon";
GRANT ALL ON TABLE "public"."client_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."client_notes" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."feature_configurations" TO "anon";
GRANT ALL ON TABLE "public"."feature_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."login_history" TO "anon";
GRANT ALL ON TABLE "public"."login_history" TO "authenticated";
GRANT ALL ON TABLE "public"."login_history" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."property_alert_jobs" TO "anon";
GRANT ALL ON TABLE "public"."property_alert_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."property_alert_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."property_alerts" TO "anon";
GRANT ALL ON TABLE "public"."property_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."property_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."property_favorites" TO "anon";
GRANT ALL ON TABLE "public"."property_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."property_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."saved_filters" TO "anon";
GRANT ALL ON TABLE "public"."saved_filters" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_filters" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."suspicious_logins" TO "anon";
GRANT ALL ON TABLE "public"."suspicious_logins" TO "authenticated";
GRANT ALL ON TABLE "public"."suspicious_logins" TO "service_role";



GRANT ALL ON TABLE "public"."system_alerts" TO "anon";
GRANT ALL ON TABLE "public"."system_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."system_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."user_password_history" TO "anon";
GRANT ALL ON TABLE "public"."user_password_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_password_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
