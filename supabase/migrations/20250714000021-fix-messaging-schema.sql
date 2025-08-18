-- Fix messaging system to work with existing database schema
-- This migration adds only the necessary fields without breaking existing structure

-- 1. Add missing columns to existing conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 2. Add missing columns to existing messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 3. Create indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_priority ON public.conversations(priority);
CREATE INDEX IF NOT EXISTS idx_messages_content_type ON public.messages(content_type);
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON public.messages(delivered_at);

-- 4. Create full-text search index for messages
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON public.messages USING gin(to_tsvector('english', content));

-- 5. Update existing conversations to have proper status
UPDATE public.conversations SET status = 'active' WHERE status IS NULL;

-- 6. Update existing messages to have proper content_type
UPDATE public.messages SET content_type = 'text' WHERE content_type IS NULL;

-- 7. Ensure the conversation timestamp trigger exists
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

-- 8. Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_conversation_timestamp_trigger ON public.messages;
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- 9. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated; 