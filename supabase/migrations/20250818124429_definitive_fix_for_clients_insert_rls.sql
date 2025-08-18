-- Drop the previous, incorrect policy for inserting clients
DROP POLICY IF EXISTS "Agents can insert new clients" ON public.clients;

-- This policy ensures that only authenticated agents can create client records,
-- and that the client record they are creating corresponds to an existing 'buyer' profile.
CREATE POLICY "Agents can insert new clients for existing buyers" ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (
  -- Rule 1: The user performing the insert must be an agent.
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'agent' 
  AND
  -- Rule 2: The ID of the new client record must match a profile with the 'buyer' role.
  (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = clients.id AND profiles.role = 'buyer'))
);
