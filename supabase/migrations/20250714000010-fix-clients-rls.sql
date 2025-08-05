-- Fix clients table RLS policies
-- Remove conflicting policies and ensure correct column names

-- First, disable RLS temporarily to clean up
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Re-enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create correct policies using agent_id column
CREATE POLICY "Agents can view their own clients" ON public.clients
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own clients" ON public.clients
  FOR DELETE USING (auth.uid() = agent_id);

-- Also fix client_notes and client_interactions tables
ALTER TABLE public.client_notes DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notes" ON public.client_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.client_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.client_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.client_notes;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view notes for their clients" ON public.client_notes
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert notes for their clients" ON public.client_notes
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update notes for their clients" ON public.client_notes
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete notes for their clients" ON public.client_notes
  FOR DELETE USING (auth.uid() = agent_id);

ALTER TABLE public.client_interactions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Users can update their own interactions" ON public.client_interactions;
DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.client_interactions;
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view interactions for their clients" ON public.client_interactions
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert interactions for their clients" ON public.client_interactions
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update interactions for their clients" ON public.client_interactions
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete interactions for their clients" ON public.client_interactions
  FOR DELETE USING (auth.uid() = agent_id); 