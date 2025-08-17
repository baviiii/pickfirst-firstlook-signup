-- Create appointments table if not exists
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES property_inquiries(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT NOT NULL,
  property_id UUID REFERENCES property_listings(id) ON DELETE SET NULL,
  property_address TEXT NOT NULL DEFAULT 'Virtual/Office Meeting',
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('property_showing', 'consultation', 'contract_review', 'closing', 'follow_up')),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60, -- minutes
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create conversations table if not exists
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES property_inquiries(id) ON DELETE SET NULL,
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, client_id)
);

-- Create messages table if not exists
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Appointments RLS policies
CREATE POLICY "Agents can view their own appointments" ON appointments
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Agents can create appointments" ON appointments
  FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their own appointments" ON appointments
  FOR UPDATE USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own appointments" ON appointments
  FOR DELETE USING (agent_id = auth.uid());

-- Conversations RLS policies
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (agent_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (agent_id = auth.uid() OR client_id = auth.uid());

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE USING (agent_id = auth.uid() OR client_id = auth.uid());

-- Messages RLS policies
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.agent_id = auth.uid() OR conversations.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.agent_id = auth.uid() OR conversations.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.agent_id = auth.uid() OR conversations.client_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_agent_id ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to update conversation timestamp on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NOW(), updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();