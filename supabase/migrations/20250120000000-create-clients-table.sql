-- Drop existing clients table if it exists (for migration)
DROP TABLE IF EXISTS public.clients CASCADE;

-- Create clients table for agent-client relationships
-- This table links agents to buyers (clients) using the buyer's profile ID
CREATE TABLE public.clients (
  id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY, -- This is the buyer's profile ID
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'inactive', 'past_client')),
  budget_range TEXT,
  preferred_areas TEXT[],
  property_type TEXT,
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  last_contact TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, id) -- Prevent duplicate agent-client relationships
);

-- Create client notes table for history tracking
CREATE TABLE public.client_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'showing', 'offer', 'follow_up', 'important')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client interactions table for contact history
CREATE TABLE public.client_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email', 'text', 'meeting', 'showing', 'offer_submitted', 'offer_accepted', 'offer_rejected')),
  subject TEXT,
  content TEXT,
  duration_minutes INTEGER,
  outcome TEXT,
  next_follow_up TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_clients_agent_id ON public.clients(agent_id);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_created_at ON public.clients(created_at);
CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_notes_created_at ON public.client_notes(created_at);
CREATE INDEX idx_client_interactions_client_id ON public.client_interactions(client_id);
CREATE INDEX idx_client_interactions_created_at ON public.client_interactions(created_at);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Agents can view their own clients" ON public.clients
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own clients" ON public.clients
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own clients" ON public.clients
  FOR DELETE USING (auth.uid() = agent_id);

-- RLS Policies for client_notes table
CREATE POLICY "Agents can view notes for their clients" ON public.client_notes
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert notes for their clients" ON public.client_notes
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update notes for their clients" ON public.client_notes
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete notes for their clients" ON public.client_notes
  FOR DELETE USING (auth.uid() = agent_id);

-- RLS Policies for client_interactions table
CREATE POLICY "Agents can view interactions for their clients" ON public.client_interactions
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert interactions for their clients" ON public.client_interactions
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update interactions for their clients" ON public.client_interactions
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete interactions for their clients" ON public.client_interactions
  FOR DELETE USING (auth.uid() = agent_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for clients table
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 