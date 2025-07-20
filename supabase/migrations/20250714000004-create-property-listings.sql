-- Create property listings table
CREATE TABLE public.property_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('house', 'apartment', 'condo', 'townhouse', 'land', 'commercial', 'other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'withdrawn')),
  price DECIMAL(12,2) NOT NULL,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  lot_size DECIMAL(10,2),
  year_built INTEGER,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  features TEXT[], -- Array of features like ['pool', 'garage', 'fireplace']
  images TEXT[], -- Array of image URLs
  contact_phone TEXT,
  contact_email TEXT,
  showing_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_property_listings_agent_id ON public.property_listings(agent_id);
CREATE INDEX idx_property_listings_status ON public.property_listings(status);
CREATE INDEX idx_property_listings_location ON public.property_listings(city, state);
CREATE INDEX idx_property_listings_price ON public.property_listings(price);
CREATE INDEX idx_property_listings_created_at ON public.property_listings(created_at);

-- Enable RLS on property_listings table
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_listings

-- Agents can view their own listings
CREATE POLICY "Agents can view own listings" ON public.property_listings
  FOR SELECT USING (
    auth.uid() = agent_id
  );

-- Agents can insert their own listings
CREATE POLICY "Agents can insert own listings" ON public.property_listings
  FOR INSERT WITH CHECK (
    auth.uid() = agent_id
  );

-- Agents can update their own listings
CREATE POLICY "Agents can update own listings" ON public.property_listings
  FOR UPDATE USING (
    auth.uid() = agent_id
  );

-- Agents can delete their own listings
CREATE POLICY "Agents can delete own listings" ON public.property_listings
  FOR DELETE USING (
    auth.uid() = agent_id
  );

-- Super admins can view all listings
CREATE POLICY "Super admins can view all listings" ON public.property_listings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can update all listings (for approval/rejection)
CREATE POLICY "Super admins can update all listings" ON public.property_listings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Buyers can view approved listings only
CREATE POLICY "Buyers can view approved listings" ON public.property_listings
  FOR SELECT USING (
    status = 'approved' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'buyer'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_property_listings_updated_at
  BEFORE UPDATE ON public.property_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create property favorites table for buyers
CREATE TABLE public.property_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.property_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(buyer_id, property_id)
);

-- Enable RLS on property_favorites table
ALTER TABLE public.property_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_favorites
CREATE POLICY "Buyers can manage own favorites" ON public.property_favorites
  FOR ALL USING (auth.uid() = buyer_id);

-- Create property inquiries table
CREATE TABLE public.property_inquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES public.property_listings(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  contact_preference TEXT CHECK (contact_preference IN ('email', 'phone', 'both')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  agent_response TEXT
);

-- Enable RLS on property_inquiries table
ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_inquiries
CREATE POLICY "Buyers can create inquiries" ON public.property_inquiries
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can view own inquiries" ON public.property_inquiries
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Agents can view inquiries for their properties" ON public.property_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.property_listings 
      WHERE id = property_id AND agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update inquiries for their properties" ON public.property_inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.property_listings 
      WHERE id = property_id AND agent_id = auth.uid()
    )
  ); 