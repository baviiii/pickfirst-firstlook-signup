-- Add personalized_property_notifications field to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS personalized_property_notifications BOOLEAN DEFAULT false;

-- Update existing records to have the default value
UPDATE public.user_preferences 
SET personalized_property_notifications = false 
WHERE personalized_property_notifications IS NULL;
