-- Allow buyers to view basic agent information
-- This fixes messaging, email notifications, and other agent info needs

CREATE POLICY "Anyone can view agent basic info" ON public.profiles
  FOR SELECT USING (role = 'agent');