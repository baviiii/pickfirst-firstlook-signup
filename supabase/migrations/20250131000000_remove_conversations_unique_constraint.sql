-- Remove the UNIQUE constraint on (agent_id, client_id) to allow multiple conversations
-- between the same agent and client for different properties
-- This enables buyers to have separate conversation threads for each property inquiry

-- Drop the existing unique constraint that prevents multiple conversations per agent/client pair
ALTER TABLE "public"."conversations" 
DROP CONSTRAINT IF EXISTS "conversations_agent_id_client_id_key";

-- Create a new unique constraint that includes inquiry_id to prevent duplicate conversations for the same inquiry
-- This allows multiple conversations per agent/client pair for different properties/inquiries
-- Only applies when inquiry_id is NOT NULL (partial index)
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_agent_id_client_id_inquiry_id_key" 
ON "public"."conversations" ("agent_id", "client_id", "inquiry_id") 
WHERE "inquiry_id" IS NOT NULL;

-- Note: The application logic (edge function) handles checking for existing property conversations
-- by checking metadata.property_id. This allows:
-- - Multiple conversations per agent/client for different properties (no constraint blocks this)
-- - One conversation per inquiry (enforced by unique index above)
-- - General conversations without inquiry_id (no constraint, handled by app logic checking metadata.property_id)

