-- First, check if plans exist and insert if they don't
INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, stripe_product_id, stripe_price_id, is_active)
SELECT 'Free', 0, 0, '["Basic property search", "Up to 5 saved properties", "Standard support", "Email alerts"]'::jsonb, NULL, NULL, true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Free');

INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, stripe_product_id, stripe_price_id, is_active)
SELECT 'Basic', 9.99, 99.99, '["Advanced property search", "Up to 25 saved properties", "Priority support", "SMS alerts", "Market insights"]'::jsonb, 'prod_basic123', 'price_basic123', true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Basic');

INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, stripe_product_id, stripe_price_id, is_active)
SELECT 'Premium', 19.99, 199.99, '["Unlimited property search", "Unlimited saved properties", "24/7 premium support", "Real-time alerts", "Exclusive listings", "Agent priority contact", "Market analytics"]'::jsonb, 'prod_premium123', 'price_premium123', true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Premium');