-- Improve buyer inquiry system with immediate conversation creation and better tracking
-- This migration adds conversation_id to property_inquiries and adds viewed_at for status tracking

-- Add conversation_id column to property_inquiries if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_inquiries' 
    AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.property_inquiries 
    ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_property_inquiries_conversation_id 
    ON public.property_inquiries(conversation_id);
  END IF;
END $$;

-- Add viewed_at column for status tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'property_inquiries' 
    AND column_name = 'viewed_at'
  ) THEN
    ALTER TABLE public.property_inquiries 
    ADD COLUMN viewed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.property_inquiries.conversation_id IS 'Links inquiry to the conversation created when inquiry is submitted';
COMMENT ON COLUMN public.property_inquiries.viewed_at IS 'Timestamp when agent first viewed the inquiry';

