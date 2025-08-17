-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, client_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (
    agent_id = auth.uid() OR client_id = auth.uid()
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    agent_id = auth.uid() OR client_id = auth.uid()
  );

CREATE POLICY "Users can update their own conversations" ON conversations
  FOR UPDATE USING (
    agent_id = auth.uid() OR client_id = auth.uid()
  );

-- RLS policies for messages
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
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Function to update conversation updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();