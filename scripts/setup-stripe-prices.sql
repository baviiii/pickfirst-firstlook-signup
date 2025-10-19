-- Setup Stripe Price IDs for new subscription tiers
-- Replace the placeholder values with your actual Stripe Price IDs

-- First, let's see what we currently have
SELECT name, price_monthly, stripe_product_id, stripe_price_id 
FROM subscription_plans 
WHERE name IN ('Free', 'Basic', 'Premium');

-- Update Basic plan with your actual Stripe Price ID
-- Replace 'price_YOUR_BASIC_PRICE_ID' with your actual Basic price ID from Stripe
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_BASIC_PRODUCT_ID',  -- Replace with your Basic product ID
  stripe_price_id = 'price_YOUR_BASIC_PRICE_ID'     -- Replace with your Basic price ID
WHERE name = 'Basic';

-- Update Premium plan with your actual Stripe Price ID  
-- Replace 'price_YOUR_PREMIUM_PRICE_ID' with your actual Premium price ID from Stripe
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_PREMIUM_PRODUCT_ID',  -- Replace with your Premium product ID
  stripe_price_id = 'price_YOUR_PREMIUM_PRICE_ID'       -- Replace with your Premium price ID
WHERE name = 'Premium';

-- Verify the updates
SELECT name, price_monthly, stripe_product_id, stripe_price_id 
FROM subscription_plans 
WHERE name IN ('Free', 'Basic', 'Premium');
