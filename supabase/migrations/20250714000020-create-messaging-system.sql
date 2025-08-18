-- Production-grade messaging system for PickFirst platform
-- This migration creates a secure, scalable messaging infrastructure

-- 1. Create conversations table with proper constraints
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'New Conversation',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, client_id)
);

-- 2. Create messages table with proper constraints
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file', 'system')),
  read_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create message attachments table for file sharing
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create conversation participants table for group conversations (future expansion)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('agent', 'client', 'participant')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(conversation_id, user_id)
);

-- 5. Create message reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction)
);

-- 6. Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- 7. Create comprehensive RLS policies for conversations
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    agent_id = auth.uid() OR client_id = auth.uid()
  );

CREATE POLICY "Agents can create conversations with clients" ON public.conversations
  FOR INSERT WITH CHECK (
    agent_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = client_id AND role = 'buyer'
    )
  );

CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (
    agent_id = auth.uid() OR client_id = auth.uid()
  );

-- 8. Create comprehensive RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (agent_id = auth.uid() OR client_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (agent_id = auth.uid() OR client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (
    sender_id = auth.uid()
  );

-- 9. Create RLS policies for attachments
CREATE POLICY "Users can view attachments in their conversations" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id 
      AND (c.agent_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload attachments to their messages" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id 
      AND m.sender_id = auth.uid()
      AND (c.agent_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- 10. Create RLS policies for participants
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE id = conversation_id 
      AND (agent_id = auth.uid() OR client_id = auth.uid())
    )
  );

-- 11. Create RLS policies for reactions
CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id 
      AND (c.agent_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can add reactions to messages" ON public.message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Users can remove their own reactions" ON public.message_reactions
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- 12. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON public.conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON public.messages(read_at);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);

-- 13. Create full-text search indexes for message content
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages USING gin(to_tsvector('english', content));

-- 14. Create functions for conversation management
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET 
    updated_at = NOW(),
    last_message_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert agent and client as participants when conversation is created
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id, role)
    VALUES 
      (NEW.id, NEW.agent_id, 'agent'),
      (NEW.id, NEW.client_id, 'client');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create triggers
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

CREATE TRIGGER update_conversation_participants_trigger
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_participants();

-- 16. Create views for easier querying
CREATE OR REPLACE VIEW conversation_summary AS
SELECT 
  c.id,
  c.agent_id,
  c.client_id,
  c.subject,
  c.status,
  c.priority,
  c.created_at,
  c.updated_at,
  c.last_message_at,
  ap.full_name as agent_name,
  ap.avatar_url as agent_avatar,
  cp.full_name as client_name,
  cp.avatar_url as client_avatar,
  (SELECT COUNT(*) FROM public.messages m WHERE m.conversation_id = c.id) as message_count,
  (SELECT COUNT(*) FROM public.messages m WHERE m.conversation_id = c.id AND m.read_at IS NULL AND m.sender_id != auth.uid()) as unread_count
FROM public.conversations c
JOIN public.profiles ap ON c.agent_id = ap.id
JOIN public.profiles cp ON c.client_id = cp.id;

-- 17. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
GRANT SELECT ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT SELECT ON conversation_summary TO authenticated;

-- 18. Create real-time publication for messaging
INSERT INTO supabase_realtime.subscription (id, entity, filters, claims)
VALUES (
  'messaging',
  'public',
  '{"event": "INSERT", "schema": "public", "table": "messages"}',
  '{"role": "authenticated"}'
) ON CONFLICT (id) DO NOTHING;

-- 19. Insert initial conversation participants for existing conversations
INSERT INTO public.conversation_participants (conversation_id, user_id, role)
SELECT 
  c.id,
  c.agent_id,
  'agent'
FROM public.conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_participants cp 
  WHERE cp.conversation_id = c.id AND cp.user_id = c.agent_id
);

INSERT INTO public.conversation_participants (conversation_id, user_id, role)
SELECT 
  c.id,
  c.client_id,
  'client'
FROM public.conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM public.conversation_participants cp 
  WHERE cp.conversation_id = c.id AND cp.user_id = c.client_id
); 