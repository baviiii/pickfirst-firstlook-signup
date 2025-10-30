-- Fix notification links to be role-aware instead of hardcoded to buyer routes

-- Update notify_new_message to use role-appropriate links
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_subject TEXT;
  recipient_role TEXT;
  message_link TEXT;
BEGIN
  -- Get the recipient (the other person in the conversation)
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

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Get recipient role to determine correct link
  SELECT role INTO recipient_role
  FROM profiles
  WHERE id = recipient_id;

  -- Set appropriate message link based on role
  IF recipient_role = 'agent' THEN
    message_link := '/agent-messages';
  ELSIF recipient_role = 'super_admin' THEN
    message_link := '/admin-messages';
  ELSE
    message_link := '/buyer-messages';
  END IF;

  -- Create notification for recipient
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
$function$;

-- Update notify_appointment_change to use role-appropriate links
CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  property_title TEXT;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  client_role TEXT;
  appointment_link TEXT;
BEGIN
  -- Get property title
  SELECT title INTO property_title
  FROM property_listings
  WHERE id = NEW.property_id;

  -- Get client role to determine correct link
  SELECT role INTO client_role
  FROM profiles
  WHERE id = NEW.client_id;

  -- Set appropriate appointment link based on role
  IF client_role = 'agent' THEN
    appointment_link := '/appointments';
  ELSIF client_role = 'super_admin' THEN
    appointment_link := '/appointments';
  ELSE
    appointment_link := '/buyer-account-settings?tab=appointments';
  END IF;

  -- Determine notification type and message based on status
  IF TG_OP = 'INSERT' THEN
    notification_type := 'appointment_scheduled';
    notification_title := 'Appointment Scheduled';
    notification_message := 'Your ' || NEW.appointment_type || ' appointment for ' || COALESCE(property_title, 'a property') || ' is scheduled';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'confirmed' THEN
      notification_type := 'appointment_confirmed';
      notification_title := 'Appointment Confirmed';
      notification_message := 'Your ' || NEW.appointment_type || ' appointment for ' || COALESCE(property_title, 'a property') || ' has been confirmed';
    ELSIF NEW.status = 'cancelled' THEN
      notification_type := 'appointment_cancelled';
      notification_title := 'Appointment Cancelled';
      notification_message := 'Your appointment for ' || COALESCE(property_title, 'a property') || ' has been cancelled';
    ELSE
      RETURN NEW; -- Don't notify for other status changes
    END IF;
  ELSE
    RETURN NEW; -- Don't notify for updates that don't change status
  END IF;

  -- Create notification for client
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.client_id,
    notification_type,
    notification_title,
    notification_message,
    appointment_link,
    jsonb_build_object(
      'appointment_id', NEW.id,
      'property_id', NEW.property_id,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION notify_new_message() IS 'Creates role-aware notifications for new messages, routing agents to /agent-messages and buyers to /buyer-messages';
COMMENT ON FUNCTION notify_appointment_change() IS 'Creates role-aware notifications for appointment changes, routing users to appropriate appointment pages based on their role';