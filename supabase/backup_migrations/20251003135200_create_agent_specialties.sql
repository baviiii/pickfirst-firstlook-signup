CREATE TABLE public.agent_specialties (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    user_id UUID NOT NULL,
    specialty TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT agent_specialties_pkey PRIMARY KEY (id),
    CONSTRAINT agent_specialties_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.agent_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own specialties" ON public.agent_specialties
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Agents can insert their own specialties" ON public.agent_specialties
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents can delete their own specialties" ON public.agent_specialties
FOR DELETE USING (auth.uid() = user_id);

-- Add a unique constraint to prevent duplicate specialties per user
ALTER TABLE public.agent_specialties
ADD CONSTRAINT unique_user_specialty UNIQUE (user_id, specialty);
