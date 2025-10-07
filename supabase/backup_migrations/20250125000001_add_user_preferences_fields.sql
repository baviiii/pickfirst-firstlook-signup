-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  marketing_emails BOOLEAN DEFAULT false,
  property_alerts BOOLEAN DEFAULT true,
  agent_messages BOOLEAN DEFAULT true,
  appointment_reminders BOOLEAN DEFAULT true,
  new_listings BOOLEAN DEFAULT true,
  price_changes BOOLEAN DEFAULT true,
  market_updates BOOLEAN DEFAULT false,
  personalized_property_notifications BOOLEAN DEFAULT false,
  
  -- Privacy settings
  profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'contacts_only')),
  show_email BOOLEAN DEFAULT false,
  show_phone BOOLEAN DEFAULT false,
  show_location BOOLEAN DEFAULT true,
  show_activity_status BOOLEAN DEFAULT false,
  allow_marketing BOOLEAN DEFAULT false,
  
  -- Buyer specific preferences
  preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'both')),
  budget_range TEXT,
  preferred_areas TEXT[],
  property_type_preferences TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON public.user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Add personalized_property_notifications field to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS personalized_property_notifications BOOLEAN DEFAULT false;

-- Update existing records to have the default value
UPDATE public.user_preferences 
SET personalized_property_notifications = false 
WHERE personalized_property_notifications IS NULL;
