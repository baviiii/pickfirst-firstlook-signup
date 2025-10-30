-- Create function to notify about new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv_subject TEXT;
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

  -- Create notification for recipient
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      recipient_id,
      'new_message',
      'New Message',
      COALESCE(sender_name, 'Someone') || ' sent you a message',
      '/buyer-messages',
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Create function to notify about appointment changes
CREATE OR REPLACE FUNCTION notify_appointment_change()
RETURNS TRIGGER AS $$
DECLARE
  property_title TEXT;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get property title
  SELECT title INTO property_title
  FROM property_listings
  WHERE id = NEW.property_id;

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
    '/buyer-account-settings?tab=appointments',
    jsonb_build_object(
      'appointment_id', NEW.id,
      'property_id', NEW.property_id,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for appointments
DROP TRIGGER IF EXISTS trigger_notify_appointment_change ON appointments;
CREATE TRIGGER trigger_notify_appointment_change
  AFTER INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_change();

-- Create function to notify about property alerts
CREATE OR REPLACE FUNCTION notify_property_alert()
RETURNS TRIGGER AS $$
DECLARE
  property_title TEXT;
  property_price NUMERIC;
BEGIN
  -- Get property details
  SELECT title, price INTO property_title, property_price
  FROM property_listings
  WHERE id = NEW.property_id;

  -- Create notification for buyer
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.buyer_id,
    'property_alert',
    'New Property Match',
    'A property matching your criteria is available: ' || COALESCE(property_title, 'View property'),
    '/property/' || NEW.property_id,
    jsonb_build_object(
      'property_id', NEW.property_id,
      'alert_id', NEW.id,
      'price', property_price
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for property alerts
DROP TRIGGER IF EXISTS trigger_notify_property_alert ON property_alerts;
CREATE TRIGGER trigger_notify_property_alert
  AFTER INSERT ON property_alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_property_alert();

-- Create function to notify about inquiry responses
CREATE OR REPLACE FUNCTION notify_inquiry_response()
RETURNS TRIGGER AS $$
DECLARE
  property_title TEXT;
BEGIN
  -- Only notify if agent response is being added
  IF NEW.agent_response IS NOT NULL AND (OLD.agent_response IS NULL OR OLD.agent_response != NEW.agent_response) THEN
    -- Get property title
    SELECT title INTO property_title
    FROM property_listings
    WHERE id = NEW.property_id;

    -- Create notification for buyer
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.buyer_id,
      'inquiry_response',
      'Agent Response',
      'An agent has responded to your inquiry about ' || COALESCE(property_title, 'a property'),
      '/buyer-messages',
      jsonb_build_object(
        'inquiry_id', NEW.id,
        'property_id', NEW.property_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for inquiry responses
DROP TRIGGER IF EXISTS trigger_notify_inquiry_response ON property_inquiries;
CREATE TRIGGER trigger_notify_inquiry_response
  AFTER UPDATE ON property_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION notify_inquiry_response();