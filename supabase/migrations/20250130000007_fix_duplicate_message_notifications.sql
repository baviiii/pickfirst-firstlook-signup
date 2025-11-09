-- Ensure only a single trigger fires when new messages are inserted

-- Drop legacy trigger name that may still exist
DROP TRIGGER IF EXISTS new_message_notification ON public.messages;
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;

-- Recreate role-aware function (matches latest version)
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_subject TEXT;
  recipient_role TEXT;
  message_link TEXT;
BEGIN
  SELECT 
    CASE 
      WHEN NEW.sender_id = c.client_id THEN c.agent_id
      WHEN NEW.sender_id = c.agent_id THEN c.client_id
      ELSE NULL
    END,
    c.subject
  INTO recipient_id, conv_subject
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  SELECT role INTO recipient_role
  FROM profiles
  WHERE id = recipient_id;

  IF recipient_role = 'agent' THEN
    message_link := '/agent-messages';
  ELSIF recipient_role = 'super_admin' THEN
    message_link := '/admin-messages';
  ELSE
    message_link := '/buyer-messages';
  END IF;

  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      recipient_id,
      'new_message',
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      message_link,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create a single trigger that uses the updated function
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.content_type IS NULL OR NEW.content_type IN ('text','image','file'))
  EXECUTE FUNCTION public.notify_new_message();
