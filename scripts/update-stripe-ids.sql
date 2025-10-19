-- Update subscription plans with Stripe Price IDs
-- Replace the price IDs below with your actual Stripe Price IDs

-- Update Basic plan with Stripe Price ID
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_BASIC_PRODUCT_ID',  -- Replace with your Basic product ID
  stripe_price_id = 'price_YOUR_BASIC_PRICE_ID'     -- Replace with your Basic price ID
WHERE name = 'Basic';

-- Update Premium plan with Stripe Price ID  
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_YOUR_PREMIUM_PRODUCT_ID',  -- Replace with your Premium product ID
  stripe_price_id = 'price_YOUR_PREMIUM_PRICE_ID'       -- Replace with your Premium price ID
WHERE name = 'Premium';

-- Verify the updates
SELECT name, price_monthly, stripe_product_id, stripe_price_id 
FROM subscription_plans 
WHERE name IN ('Basic', 'Premium');
