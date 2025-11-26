-- Create RPC function to create notifications that bypasses RLS
-- This allows users to create notifications for other users (e.g., buyers creating notifications for agents)

CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id uuid,
  notification_type text,
  notification_title text,
  notification_message text,
  notification_link text DEFAULT NULL,
  notification_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  -- Insert notification using service role privileges
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata,
    read,
    created_at
  ) VALUES (
    target_user_id,
    notification_type,
    notification_title,
    notification_message,
    notification_link,
    notification_metadata,
    false,
    NOW()
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, jsonb) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_notification IS 'Creates a notification for a target user, bypassing RLS. Allows users to notify other users (e.g., buyers notifying agents about inquiries).';

