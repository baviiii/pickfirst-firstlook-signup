-- Add RLS policies for subscription_plans table
CREATE POLICY "Anyone can view active subscription plans" 
ON subscription_plans 
FOR SELECT 
USING (is_active = true);

-- Super admins can manage subscription plans
CREATE POLICY "Super admins can manage subscription plans" 
ON subscription_plans 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'super_admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'super_admin'
));