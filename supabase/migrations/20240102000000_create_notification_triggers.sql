-- Create function to notify on new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  receiver_id UUID;
  sender_name TEXT;
  conversation_subject TEXT;
BEGIN
  -- Determine receiver (opposite of sender)
  SELECT 
    CASE 
      WHEN c.buyer_id = NEW.sender_id THEN c.agent_id
      WHEN c.agent_id = NEW.sender_id THEN c.buyer_id
      ELSE NULL
    END,
    c.subject
  INTO receiver_id, conversation_subject
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create notification for receiver
  IF receiver_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      receiver_id,
      'new_message',
      'New Message',
      'You have a new message from ' || COALESCE(sender_name, 'a user'),
      '/buyer-messages',
      jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'sender_name', sender_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
DROP TRIGGER IF EXISTS new_message_notification ON messages;
CREATE TRIGGER new_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.content_type = 'text' OR NEW.content_type = 'image' OR NEW.content_type = 'file')
  EXECUTE FUNCTION notify_new_message();

-- Create function to notify on inquiry responses
CREATE OR REPLACE FUNCTION notify_inquiry_response()
RETURNS TRIGGER AS $$
DECLARE
  buyer_name TEXT;
  property_title TEXT;
BEGIN
  -- Only notify when status changes to 'responded'
  IF NEW.status = 'responded' AND (OLD.status IS NULL OR OLD.status != 'responded') THEN
    -- Get buyer name
    SELECT full_name INTO buyer_name
    FROM profiles
    WHERE id = NEW.buyer_id;

    -- Get property title
    SELECT title INTO property_title
    FROM property_listings
    WHERE id = NEW.property_id;

    -- Create notification for buyer
    IF NEW.buyer_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link, metadata)
      VALUES (
        NEW.buyer_id,
        'inquiry_response',
        'Inquiry Response',
        'An agent has responded to your inquiry about ' || COALESCE(property_title, 'a property'),
        '/buyer-messages',
        jsonb_build_object(
          'inquiry_id', NEW.id,
          'property_id', NEW.property_id,
          'property_title', property_title
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for inquiry responses
DROP TRIGGER IF EXISTS inquiry_response_notification ON property_inquiries;
CREATE TRIGGER inquiry_response_notification
  AFTER UPDATE ON property_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION notify_inquiry_response();

-- Create function to notify on property price changes
CREATE OR REPLACE FUNCTION notify_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if price actually changed and property is approved
  IF NEW.price != OLD.price AND NEW.status = 'approved' THEN
    -- Notify all buyers who favorited this property
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT 
      f.user_id,
      'price_change',
      'Price Change Alert',
      'Price updated for ' || NEW.title || ': $' || NEW.price,
      '/property/' || NEW.id,
      jsonb_build_object(
        'property_id', NEW.id,
        'old_price', OLD.price,
        'new_price', NEW.price,
        'property_title', NEW.title
      )
    FROM favorites f
    WHERE f.property_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for price changes
DROP TRIGGER IF EXISTS price_change_notification ON property_listings;
CREATE TRIGGER price_change_notification
  AFTER UPDATE ON property_listings
  FOR EACH ROW
  WHEN (NEW.price IS DISTINCT FROM OLD.price)
  EXECUTE FUNCTION notify_price_change();

-- Create function to notify when property is sold
CREATE OR REPLACE FUNCTION notify_property_sold()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify when property becomes sold (sold_date is set)
  IF NEW.sold_date IS NOT NULL AND (OLD.sold_date IS NULL OR OLD.sold_date IS DISTINCT FROM NEW.sold_date) THEN
    -- Notify all buyers who favorited or inquired about this property
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT DISTINCT
      user_id,
      'property_sold',
      'Property Sold',
      NEW.title || ' has been sold',
      '/browse-properties',
      jsonb_build_object(
        'property_id', NEW.id,
        'property_title', NEW.title,
        'sold_price', NEW.sold_price,
        'sold_date', NEW.sold_date
      )
    FROM (
      -- Buyers who favorited
      SELECT f.user_id
      FROM favorites f
      WHERE f.property_id = NEW.id
      UNION
      -- Buyers who inquired
      SELECT pi.buyer_id as user_id
      FROM property_inquiries pi
      WHERE pi.property_id = NEW.id AND pi.buyer_id IS NOT NULL
    ) AS interested_buyers;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for property sold
DROP TRIGGER IF EXISTS property_sold_notification ON property_listings;
CREATE TRIGGER property_sold_notification
  AFTER UPDATE ON property_listings
  FOR EACH ROW
  WHEN (NEW.sold_date IS DISTINCT FROM OLD.sold_date)
  EXECUTE FUNCTION notify_property_sold();

-- Create function to clean up old notifications (optional - run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications
  WHERE read = true 
    AND created_at < NOW() - INTERVAL '30 days';
  
  -- Delete unread notifications older than 90 days
  DELETE FROM notifications
  WHERE read = false 
    AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION notify_new_message() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_inquiry_response() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_price_change() TO authenticated;
GRANT EXECUTE ON FUNCTION notify_property_sold() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION notify_new_message() IS 'Automatically creates notifications when new messages are sent';
COMMENT ON FUNCTION notify_inquiry_response() IS 'Automatically creates notifications when agents respond to inquiries';
COMMENT ON FUNCTION notify_price_change() IS 'Automatically creates notifications when property prices change';
COMMENT ON FUNCTION notify_property_sold() IS 'Automatically creates notifications when properties are sold';
COMMENT ON FUNCTION cleanup_old_notifications() IS 'Cleans up old notifications to prevent database bloat';
