-- Add 'declined' status to appointments status constraint
-- This allows buyers to decline appointments while agents use 'cancelled'

-- Drop the existing constraint
ALTER TABLE "public"."appointments" DROP CONSTRAINT "appointments_status_check";

-- Add the new constraint with 'declined' included
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_status_check" 
CHECK ((status = ANY (ARRAY['scheduled'::text, 'confirmed'::text, 'declined'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]))) NOT VALID;

-- Validate the constraint
ALTER TABLE "public"."appointments" VALIDATE CONSTRAINT "appointments_status_check";
