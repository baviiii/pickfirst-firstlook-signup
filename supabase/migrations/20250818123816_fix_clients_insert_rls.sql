-- Drop the existing restrictive policy for inserting clients
DROP POLICY IF EXISTS "Agents can insert their own clients" ON public.clients;

-- Create a new policy that allows any user with the 'agent' role to insert new clients.
-- This is necessary for converting leads, as the agent_id is assigned during the creation process.
CREATE POLICY "Agents can insert new clients" ON public.clients
FOR INSERT
TO authenticated
WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent');
