-- Create calendar_integrations table
CREATE TABLE IF NOT EXISTS public.calendar_integrations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON public.calendar_integrations USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON public.calendar_integrations USING btree (provider);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_active ON public.calendar_integrations USING btree (is_active);

-- Create unique constraint for user + provider + calendar_id
CREATE UNIQUE INDEX IF NOT EXISTS calendar_integrations_user_provider_calendar_key 
ON public.calendar_integrations USING btree (user_id, provider, calendar_id);

-- Add RLS policies
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own calendar integrations
CREATE POLICY "Users can view own calendar integrations" ON public.calendar_integrations
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own calendar integrations
CREATE POLICY "Users can insert own calendar integrations" ON public.calendar_integrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own calendar integrations
CREATE POLICY "Users can update own calendar integrations" ON public.calendar_integrations
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own calendar integrations
CREATE POLICY "Users can delete own calendar integrations" ON public.calendar_integrations
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_calendar_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_integrations_updated_at
    BEFORE UPDATE ON public.calendar_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_integrations_updated_at();

-- Create storage bucket for calendar files (ICS files)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('calendar-files', 'calendar-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for calendar files
CREATE POLICY "Users can upload their own calendar files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'calendar-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own calendar files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'calendar-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own calendar files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'calendar-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
