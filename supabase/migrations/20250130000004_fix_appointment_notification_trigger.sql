-- Fix appointment notification trigger to handle null client_id
-- When client_id is null but inquiry_id exists, use buyer_id from the inquiry

CREATE OR REPLACE FUNCTION public.notify_appointment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  property_title TEXT;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  client_role TEXT;
  appointment_link TEXT;
  notification_user_id UUID;
  inquiry_buyer_id UUID;
BEGIN
  -- Get property title
  SELECT title INTO property_title
  FROM property_listings
  WHERE id = NEW.property_id;

  -- Determine the user_id for the notification
  -- If client_id exists, use it; otherwise, get buyer_id from inquiry
  IF NEW.client_id IS NOT NULL THEN
    notification_user_id := NEW.client_id;
    -- Get client role from profiles
    SELECT role INTO client_role
    FROM profiles
    WHERE id = NEW.client_id;
  ELSIF NEW.inquiry_id IS NOT NULL THEN
    -- Get buyer_id from the inquiry
    SELECT buyer_id INTO inquiry_buyer_id
    FROM property_inquiries
    WHERE id = NEW.inquiry_id;
    
    IF inquiry_buyer_id IS NOT NULL THEN
      notification_user_id := inquiry_buyer_id;
      -- Get buyer role from profiles
      SELECT role INTO client_role
      FROM profiles
      WHERE id = inquiry_buyer_id;
    ELSE
      -- No buyer_id found in inquiry, skip notification
      RETURN NEW;
    END IF;
  ELSE
    -- No client_id or inquiry_id, skip notification
    RETURN NEW;
  END IF;

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

  -- Only create notification if we have a valid user_id
  IF notification_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      notification_user_id,
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
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION notify_appointment_change() IS 'Creates role-aware notifications for appointment changes. Handles cases where client_id is null by using buyer_id from the inquiry.';

