-- Quick fix: Add missing columns to blocked_ips table
-- Run this if you get "Could not find the 'unblocked_by' column" error

-- Add missing columns if they don't exist
ALTER TABLE public.blocked_ips 
ADD COLUMN IF NOT EXISTS unblocked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unblocked_by TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'blocked_ips' 
ORDER BY ordinal_position;

