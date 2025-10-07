-- Add sold_to_client_id column to property_listings table
ALTER TABLE property_listings 
ADD COLUMN sold_to_client_id UUID REFERENCES clients(id),
ADD COLUMN sold_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN sold_price DECIMAL(12,2);

-- Add sold status as valid option (assuming status is an enum or has constraints)
-- First check current status values and add 'sold' if not exists
DO $$
BEGIN
    -- Add sold status to any existing check constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name
        WHERE cc.constraint_name LIKE '%status%' 
        AND ccu.table_name = 'property_listings'
        AND ccu.table_schema = 'public'
    ) THEN
        -- Update constraint to include 'sold'
        ALTER TABLE property_listings DROP CONSTRAINT IF EXISTS property_listings_status_check;
        ALTER TABLE property_listings ADD CONSTRAINT property_listings_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected', 'sold'));
    ELSE
        -- Add new constraint if none exists
        ALTER TABLE property_listings ADD CONSTRAINT property_listings_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected', 'sold'));
    END IF;
END $$;

-- Create index for better query performance on sold properties
CREATE INDEX IF NOT EXISTS idx_property_listings_sold_date ON property_listings(sold_date) WHERE status = 'sold';
CREATE INDEX IF NOT EXISTS idx_property_listings_agent_status ON property_listings(agent_id, status);

-- Create view for agent analytics
CREATE OR REPLACE VIEW agent_analytics AS
SELECT 
    p.agent_id,
    COUNT(*) FILTER (WHERE p.status = 'approved') as active_listings,
    COUNT(*) FILTER (WHERE p.status = 'sold') as total_sales,
    COUNT(*) FILTER (WHERE p.status = 'sold' AND p.sold_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_sales,
    COUNT(*) FILTER (WHERE p.status = 'sold' AND p.sold_date >= CURRENT_DATE - INTERVAL '7 days') as weekly_sales,
    COALESCE(SUM(p.sold_price) FILTER (WHERE p.status = 'sold' AND p.sold_date >= CURRENT_DATE - INTERVAL '30 days'), 0) as monthly_revenue,
    COALESCE(AVG(p.sold_price) FILTER (WHERE p.status = 'sold'), 0) as avg_sale_price,
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_appointments,
    COUNT(DISTINCT pi.id) as total_inquiries,
    COUNT(DISTINCT pi.id) FILTER (WHERE pi.created_at >= CURRENT_DATE - INTERVAL '30 days') as monthly_inquiries
FROM profiles prof
LEFT JOIN property_listings p ON prof.id = p.agent_id
LEFT JOIN clients c ON prof.id = c.agent_id
LEFT JOIN appointments a ON prof.id = a.agent_id
LEFT JOIN property_inquiries pi ON p.id = pi.property_id
WHERE prof.role = 'agent'
GROUP BY p.agent_id, prof.id;

-- Create monthly performance view for charts
CREATE OR REPLACE VIEW agent_monthly_performance AS
SELECT 
    p.agent_id,
    DATE_TRUNC('month', COALESCE(p.sold_date, p.created_at)) as month,
    COUNT(*) FILTER (WHERE p.status = 'approved' OR p.status = 'sold') as listings,
    COUNT(DISTINCT a.id) as showings,
    COUNT(*) FILTER (WHERE p.status = 'sold') as sales,
    COALESCE(SUM(p.sold_price), 0) as revenue
FROM property_listings p
LEFT JOIN appointments a ON p.id = a.property_id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY p.agent_id, DATE_TRUNC('month', COALESCE(p.sold_date, p.created_at))
ORDER BY month DESC;

-- Create client source analytics view
CREATE OR REPLACE VIEW agent_client_sources AS
SELECT 
    c.agent_id,
    CASE 
        WHEN c.notes ILIKE '%referral%' OR c.notes ILIKE '%referred%' THEN 'Referrals'
        WHEN c.notes ILIKE '%online%' OR c.notes ILIKE '%website%' OR c.notes ILIKE '%internet%' THEN 'Online'
        WHEN c.notes ILIKE '%walk%' OR c.notes ILIKE '%office%' THEN 'Walk-ins'
        WHEN c.notes ILIKE '%marketing%' OR c.notes ILIKE '%advertisement%' OR c.notes ILIKE '%ad%' THEN 'Marketing'
        ELSE 'Other'
    END as source,
    COUNT(*) as count
FROM clients c
GROUP BY c.agent_id, source;

-- Grant necessary permissions
GRANT SELECT ON agent_analytics TO authenticated;
GRANT SELECT ON agent_monthly_performance TO authenticated;
GRANT SELECT ON agent_client_sources TO authenticated;
