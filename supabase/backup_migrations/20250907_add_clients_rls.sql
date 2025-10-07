-- Enable RLS (safe if already enabled)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Allow agents to INSERT their own clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Agents can insert own clients'
  ) THEN
    CREATE POLICY "Agents can insert own clients" ON public.clients
      FOR INSERT
      WITH CHECK (agent_id = auth.uid());
  END IF;
END$$;

-- Allow agents to SELECT only their own clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Agents can view own clients'
  ) THEN
    CREATE POLICY "Agents can view own clients" ON public.clients
      FOR SELECT
      USING (agent_id = auth.uid());
  END IF;
END$$;

-- Allow agents to UPDATE only their own clients
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'Agents can update own clients'
  ) THEN
    CREATE POLICY "Agents can update own clients" ON public.clients
      FOR UPDATE
      USING (agent_id = auth.uid())
      WITH CHECK (agent_id = auth.uid());
  END IF;
END$$;

