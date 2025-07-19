-- Fix broker role issue by updating existing users and ensuring correct constraints

-- First, update any existing users with 'broker' role to 'agent' role
UPDATE public.profiles 
SET role = 'agent' 
WHERE role = 'broker';

-- Ensure the role constraint is correct
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('buyer', 'agent', 'super_admin'));

-- Update default role to buyer
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'buyer';

-- Update the trigger function to handle user type from metadata correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'buyer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 