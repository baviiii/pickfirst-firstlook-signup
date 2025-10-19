-- Update subscription plans with Stripe product and price IDs
UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_TG1uIOJw0rfnj9',
  stripe_price_id = 'price_1SJVr9FAaefcAWjpLcRWDwPD'
WHERE name = 'Basic';

UPDATE subscription_plans 
SET 
  stripe_product_id = 'prod_TG1vaTmOfIFMC6',
  stripe_price_id = 'price_1SJVriFAaefcAWjpPMSk0Osw'
WHERE name = 'Premium';

-- Ensure Free plan has NULL Stripe IDs
UPDATE subscription_plans 
SET 
  stripe_product_id = NULL,
  stripe_price_id = NULL
WHERE name = 'Free';