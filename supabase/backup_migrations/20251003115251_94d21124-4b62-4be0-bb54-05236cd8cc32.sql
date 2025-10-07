-- Fix agent_analytics view to show correct sales data
DROP VIEW IF EXISTS agent_analytics CASCADE;

CREATE OR REPLACE VIEW agent_analytics AS
SELECT 
  pl.agent_id,
  COUNT(DISTINCT CASE WHEN pl.status = 'approved' THEN pl.id END) as active_listings,
  COUNT(DISTINCT CASE WHEN pl.status = 'sold' THEN pl.id END) as total_sales,
  COUNT(DISTINCT CASE WHEN pl.status = 'sold' AND pl.sold_date >= CURRENT_DATE - INTERVAL '30 days' THEN pl.id END) as monthly_sales,
  COUNT(DISTINCT CASE WHEN pl.status = 'sold' AND pl.sold_date >= CURRENT_DATE - INTERVAL '7 days' THEN pl.id END) as weekly_sales,
  COALESCE(SUM(CASE WHEN pl.status = 'sold' AND pl.sold_date >= CURRENT_DATE - INTERVAL '30 days' THEN pl.sold_price END), 0) as monthly_revenue,
  COALESCE(AVG(CASE WHEN pl.status = 'sold' THEN pl.sold_price END), 0) as avg_sale_price,
  COUNT(DISTINCT c.id) as total_clients,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT CASE WHEN a.date >= CURRENT_DATE - INTERVAL '30 days' THEN a.id END) as monthly_appointments,
  COUNT(DISTINCT pi.id) as total_inquiries,
  COUNT(DISTINCT CASE WHEN pi.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN pi.id END) as monthly_inquiries
FROM profiles p
LEFT JOIN property_listings pl ON p.id = pl.agent_id
LEFT JOIN clients c ON p.id = c.agent_id
LEFT JOIN appointments a ON p.id = a.agent_id
LEFT JOIN property_inquiries pi ON pl.id = pi.property_id
WHERE p.role = 'agent'
GROUP BY pl.agent_id;

-- Delete duplicate conversations where buyer is incorrectly set as agent
DELETE FROM conversations 
WHERE id IN (
  SELECT c1.id
  FROM conversations c1
  INNER JOIN conversations c2 ON c1.inquiry_id = c2.inquiry_id AND c1.id != c2.id
  INNER JOIN profiles p ON c1.agent_id = p.id
  WHERE p.role = 'buyer'
);