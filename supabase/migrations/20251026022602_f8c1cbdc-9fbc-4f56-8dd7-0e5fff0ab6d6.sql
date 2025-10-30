-- Restructure clients table to support non-registered clients
-- Step 1: Drop dependent foreign keys
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
ALTER TABLE public.client_interactions DROP CONSTRAINT IF EXISTS client_interactions_client_id_fkey;
ALTER TABLE public.client_notes DROP CONSTRAINT IF EXISTS client_notes_client_id_fkey;
ALTER TABLE public.property_listings DROP CONSTRAINT IF EXISTS property_listings_sold_to_client_id_fkey;

-- Step 2: Drop existing constraints on clients table
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_agent_id_fkey;

-- Step 3: Rename id to user_id and make it nullable (for non-registered clients)
ALTER TABLE public.clients RENAME COLUMN id TO user_id;
ALTER TABLE public.clients ALTER COLUMN user_id DROP NOT NULL;

-- Step 4: Add new auto-generated id as primary key
ALTER TABLE public.clients ADD COLUMN new_id UUID DEFAULT gen_random_uuid();
UPDATE public.clients SET new_id = gen_random_uuid() WHERE new_id IS NULL;
ALTER TABLE public.clients ALTER COLUMN new_id SET NOT NULL;
ALTER TABLE public.clients ADD PRIMARY KEY (new_id);
ALTER TABLE public.clients RENAME COLUMN new_id TO id;

-- Step 5: Add user_id foreign key to profiles
ALTER TABLE public.clients ADD CONSTRAINT clients_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 6: Add agent_id foreign key back
ALTER TABLE public.clients ADD CONSTRAINT clients_agent_id_fkey 
  FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 7: Add invite tracking columns
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS invite_accepted_at TIMESTAMP WITH TIME ZONE;

-- Step 8: Modify email constraint - allow null if phone is provided
ALTER TABLE public.clients ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.clients ADD CONSTRAINT clients_contact_check 
  CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Step 9: Recreate foreign keys on dependent tables
-- Since clients.id changed, we need to handle this carefully
-- For existing data, we'll use user_id as the link since old clients.id was the user_id
ALTER TABLE public.appointments ADD CONSTRAINT appointments_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.client_interactions ADD CONSTRAINT client_interactions_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.client_notes ADD CONSTRAINT client_notes_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

ALTER TABLE public.property_listings ADD CONSTRAINT property_listings_sold_to_client_id_fkey
  FOREIGN KEY (sold_to_client_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 10: Create function to link client to user when they sign up via invite
CREATE OR REPLACE FUNCTION public.link_client_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_id_from_metadata UUID;
BEGIN
  -- Check if signup included client_id in metadata
  client_id_from_metadata := (NEW.raw_user_meta_data->>'client_id')::UUID;
  
  IF client_id_from_metadata IS NOT NULL THEN
    -- Link the client record to the new user
    UPDATE public.clients
    SET 
      user_id = NEW.id,
      email = NEW.email,
      invite_accepted_at = NOW(),
      updated_at = NOW()
    WHERE id = client_id_from_metadata
      AND user_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 11: Create trigger to link client when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_link_client ON auth.users;
CREATE TRIGGER on_auth_user_created_link_client
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_client_to_user();

-- Step 12: Create indices for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_agent_id ON public.clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_invited_at ON public.clients(invited_at) WHERE invited_at IS NOT NULL;