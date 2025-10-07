-- Create database maintenance and optimization functions
-- These functions will run actual database operations with elevated privileges

-- Function to run database maintenance (VACUUM and ANALYZE)
CREATE OR REPLACE FUNCTION public.run_database_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to optimize database (rebuild indexes and update statistics)
CREATE OR REPLACE FUNCTION public.optimize_database()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Function to get database performance insights
CREATE OR REPLACE FUNCTION public.get_database_performance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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