-- Insert subscription plans if they don't exist
INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, stripe_product_id, stripe_price_id, is_active)
VALUES 
  ('Free', 0, 0, '["Basic property search", "Up to 5 saved properties", "Standard support", "Email alerts"]'::jsonb, NULL, NULL, true),
  ('Basic', 9.99, 99.99, '["Advanced property search", "Up to 25 saved properties", "Priority support", "SMS alerts", "Market insights"]'::jsonb, 'prod_basic123', 'price_basic123', true),
  ('Premium', 19.99, 199.99, '["Unlimited property search", "Unlimited saved properties", "24/7 premium support", "Real-time alerts", "Exclusive listings", "Agent priority contact", "Market analytics"]'::jsonb, 'prod_premium123', 'price_premium123', true)
ON CONFLICT (name) DO UPDATE SET 
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  is_active = EXCLUDED.is_active;