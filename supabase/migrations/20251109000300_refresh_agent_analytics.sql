BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_revenue_goal NUMERIC DEFAULT 60000;

DROP VIEW IF EXISTS public.agent_analytics;

CREATE OR REPLACE VIEW public.agent_analytics AS
WITH agent_properties AS (
  SELECT
    agent_id,
    COUNT(*) FILTER (WHERE status = 'approved') AS active_listings,
    COUNT(*) FILTER (WHERE status = 'sold') AS total_sales,
    COUNT(*) FILTER (
      WHERE status = 'sold'
        AND sold_date >= (CURRENT_DATE - INTERVAL '30 days')
    ) AS monthly_sales,
    COUNT(*) FILTER (
      WHERE status = 'sold'
        AND sold_date >= (CURRENT_DATE - INTERVAL '7 days')
    ) AS weekly_sales,
    COALESCE(SUM(
      CASE
        WHEN status = 'sold'
          AND sold_date >= (CURRENT_DATE - INTERVAL '30 days') THEN sold_price
        ELSE NULL
      END
    ), 0) AS monthly_revenue,
    COALESCE(AVG(
      CASE
        WHEN status = 'sold' THEN sold_price
        ELSE NULL
      END
    ), 0) AS avg_sale_price
  FROM public.property_listings
  GROUP BY agent_id
),
agent_clients AS (
  SELECT agent_id, COUNT(*) AS total_clients
  FROM public.clients
  GROUP BY agent_id
),
agent_appointments AS (
  SELECT
    agent_id,
    COUNT(*) AS total_appointments,
    COUNT(*) FILTER (
      WHERE date >= (CURRENT_DATE - INTERVAL '30 days')
    ) AS monthly_appointments
  FROM public.appointments
  GROUP BY agent_id
),
agent_inquiries AS (
  SELECT
    pl.agent_id,
    COUNT(*) AS total_inquiries,
    COUNT(*) FILTER (
      WHERE pi.created_at >= (CURRENT_DATE - INTERVAL '30 days')
    ) AS monthly_inquiries
  FROM public.property_inquiries pi
    JOIN public.property_listings pl ON pl.id = pi.property_id
  GROUP BY pl.agent_id
)
SELECT
  p.id AS agent_id,
  COALESCE(ap.active_listings, 0) AS active_listings,
  COALESCE(ap.total_sales, 0) AS total_sales,
  COALESCE(ap.monthly_sales, 0) AS monthly_sales,
  COALESCE(ap.weekly_sales, 0) AS weekly_sales,
  COALESCE(ap.monthly_revenue, 0) AS monthly_revenue,
  COALESCE(ap.avg_sale_price, 0) AS avg_sale_price,
  COALESCE(ac.total_clients, 0) AS total_clients,
  COALESCE(aa.total_appointments, 0) AS total_appointments,
  COALESCE(aa.monthly_appointments, 0) AS monthly_appointments,
  COALESCE(ai.total_inquiries, 0) AS total_inquiries,
  COALESCE(ai.monthly_inquiries, 0) AS monthly_inquiries,
  COALESCE(p.monthly_revenue_goal, 60000) AS monthly_revenue_goal
FROM public.profiles p
  LEFT JOIN agent_properties ap ON ap.agent_id = p.id
  LEFT JOIN agent_clients ac ON ac.agent_id = p.id
  LEFT JOIN agent_appointments aa ON aa.agent_id = p.id
  LEFT JOIN agent_inquiries ai ON ai.agent_id = p.id
WHERE p.role = 'agent';

COMMIT;

