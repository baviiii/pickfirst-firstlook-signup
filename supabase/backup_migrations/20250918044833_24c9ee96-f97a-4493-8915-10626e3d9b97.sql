-- Update subscription_plans table to include Stripe integration
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_product_id text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Update existing plans with proper data
UPDATE subscription_plans SET 
  stripe_product_id = NULL,
  stripe_price_id = NULL,
  is_active = true
WHERE name = 'Free';

UPDATE subscription_plans SET 
  stripe_product_id = 'prod_T4j8LtGi3nAjOY',
  stripe_price_id = 'price_1S8ZfnPI5an6OjqsQJdvnBzS',
  is_active = true
WHERE name = 'Premium';

-- Insert Premium plan if it doesn't exist
INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, stripe_product_id, stripe_price_id, max_listings, is_active)
SELECT 'Premium', 29.99, 299.99, 
  '["Unlimited property favorites", "Advanced search filters", "Priority agent connections", "Email property alerts", "Market insights", "Direct messaging with agents"]'::jsonb,
  'prod_T4j8LtGi3nAjOY', 'price_1S8ZfnPI5an6OjqsQJdvnBzS', NULL, true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Premium');

-- Ensure Free plan exists
INSERT INTO subscription_plans (name, price_monthly, price_yearly, features, max_listings, is_active)
SELECT 'Free', 0, 0, 
  '["Basic property search", "Up to 10 saved favorites", "Standard agent contact"]'::jsonb,
  10, true
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Free');

-- Update profiles table to track subscription information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_product_id text;