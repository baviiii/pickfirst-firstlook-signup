-- Add logging to the trigger function to debug profile creation

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Log the incoming data
  RAISE LOG 'handle_new_user called with user_id: %, email: %, user_type: %', 
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'user_type';
  
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'agent' THEN 'agent'
      WHEN NEW.raw_user_meta_data->>'user_type' = 'super_admin' THEN 'super_admin'
      ELSE 'buyer'
    END
  );
  
  RAISE LOG 'Profile created with role: %', 
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'agent' THEN 'agent'
      WHEN NEW.raw_user_meta_data->>'user_type' = 'super_admin' THEN 'super_admin'
      ELSE 'buyer'
    END;
    
  RETURN NEW;
END;
$function$; 