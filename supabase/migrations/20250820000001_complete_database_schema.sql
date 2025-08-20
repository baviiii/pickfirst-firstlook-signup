-- Complete database schema migration for PickFirst platform
-- This migration creates all necessary tables and relationships

-- 1. Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer', 'agent', 'super_admin')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT,
  subscription_status TEXT,
  subscription_expires_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create property listings table (if not exists)
CREATE TABLE IF NOT EXISTS public.property_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'apartment', 'condo', 'townhouse', 'land', 'commercial', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'withdrawn')),
  price DECIMAL(12,2) NOT NULL,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  lot_size DECIMAL(10,2),
  year_built INTEGER,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  features TEXT[],
  images TEXT[],
  contact_phone TEXT,
  contact_email TEXT,
  showing_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT
);

-- 3. Create property inquiries table (if not exists) - BEFORE conversations
CREATE TABLE IF NOT EXISTS public.property_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.property_listings(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID, -- Will be updated after conversations table is created
  message TEXT NOT NULL,
  contact_preference TEXT CHECK (contact_preference IN ('email', 'phone', 'both')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  agent_response TEXT,
  -- Prevent duplicate inquiries per buyer per property
  UNIQUE(buyer_id, property_id)
);

-- 4. Create conversations table (if not exists)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES public.property_inquiries(id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT 'New Conversation',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Allow multiple conversations per agent-client pair, but only one per inquiry
  UNIQUE(agent_id, client_id, inquiry_id)
);

-- 5. Now add the foreign key constraint to property_inquiries
ALTER TABLE public.property_inquiries 
ADD CONSTRAINT property_inquiries_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

-- 6. Create messages table (if not exists)
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

-- 7. Create property favorites table (if not exists)
CREATE TABLE IF NOT EXISTS public.property_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.property_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, property_id)
);

-- 8. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 10. Create RLS policies for property_listings
CREATE POLICY "Agents can view own listings" ON public.property_listings
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert own listings" ON public.property_listings
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own listings" ON public.property_listings
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete own listings" ON public.property_listings
  FOR DELETE USING (auth.uid() = agent_id);

CREATE POLICY "Buyers can view approved listings" ON public.property_listings
  FOR SELECT USING (
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'buyer'
    )
  );

-- 11. Create RLS policies for conversations
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

-- 12. Create RLS policies for messages
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

-- 13. Create RLS policies for property_inquiries
CREATE POLICY "Buyers can create inquiries" ON public.property_inquiries
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can view own inquiries" ON public.property_inquiries
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Agents can view inquiries for their properties" ON public.property_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.property_listings 
      WHERE id = property_id AND agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update inquiries for their properties" ON public.property_inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.property_listings 
      WHERE id = property_id AND agent_id = auth.uid()
    )
  );

-- 14. Create RLS policies for property_favorites
CREATE POLICY "Buyers can manage own favorites" ON public.property_favorites
  FOR ALL USING (auth.uid() = buyer_id);

-- 15. Create functions for automatic conversation creation
CREATE OR REPLACE FUNCTION create_conversation_for_inquiry()
RETURNS TRIGGER AS $$
DECLARE
  property_title TEXT;
  agent_id UUID;
  conversation_record RECORD;
BEGIN
  -- Get property title and agent_id
  SELECT title, agent_id INTO property_title, agent_id
  FROM public.property_listings
  WHERE id = NEW.property_id;
  
  -- Create conversation
  INSERT INTO public.conversations (agent_id, client_id, inquiry_id, subject)
  VALUES (agent_id, NEW.buyer_id, NEW.id, 'Property Inquiry: ' || property_title)
  RETURNING * INTO conversation_record;
  
  -- Update the inquiry with the conversation_id
  UPDATE public.property_inquiries 
  SET conversation_id = conversation_record.id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 16. Create function to send initial message when conversation is created
CREATE OR REPLACE FUNCTION send_initial_inquiry_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the initial inquiry message
  INSERT INTO public.messages (conversation_id, sender_id, content, content_type)
  VALUES (NEW.id, 
          (SELECT buyer_id FROM public.property_inquiries WHERE id = NEW.inquiry_id),
          (SELECT message FROM public.property_inquiries WHERE id = NEW.inquiry_id),
          'text');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 17. Create function to update conversation timestamps
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

-- 18. Create triggers
CREATE TRIGGER trigger_create_conversation_for_inquiry
  AFTER INSERT ON public.property_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_for_inquiry();

CREATE TRIGGER trigger_send_initial_inquiry_message
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  WHEN (NEW.inquiry_id IS NOT NULL)
  EXECUTE FUNCTION send_initial_inquiry_message();

CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- 19. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.property_inquiries TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.property_favorites TO authenticated; 