-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES property_inquiries(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT NOT NULL,
  property_id UUID REFERENCES property_listings(id) ON DELETE SET NULL,
  property_address TEXT NOT NULL DEFAULT 'Virtual/Office Meeting',
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('property_showing', 'consultation', 'contract_review', 'closing', 'follow_up')),
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60, -- minutes
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_agent_id ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agents can view their own appointments" ON appointments
  FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Agents can create appointments" ON appointments
  FOR INSERT WITH CHECK (agent_id = auth.uid());

CREATE POLICY "Agents can update their own appointments" ON appointments
  FOR UPDATE USING (agent_id = auth.uid());

CREATE POLICY "Agents can delete their own appointments" ON appointments
  FOR DELETE USING (agent_id = auth.uid());

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();