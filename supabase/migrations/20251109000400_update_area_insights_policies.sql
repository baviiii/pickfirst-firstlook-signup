BEGIN;

ALTER TABLE public.area_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All view area insights" ON public.area_insights;
DROP POLICY IF EXISTS "System inserts insights" ON public.area_insights;
DROP POLICY IF EXISTS "System can manage area insights" ON public.area_insights;
DROP POLICY IF EXISTS "Anyone can view area insights" ON public.area_insights;
DROP POLICY IF EXISTS "Only system can insert area insights" ON public.area_insights;

CREATE POLICY "All view area insights"
  ON public.area_insights
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert area insights"
  ON public.area_insights
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update area insights"
  ON public.area_insights
  FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL)
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

COMMIT;

