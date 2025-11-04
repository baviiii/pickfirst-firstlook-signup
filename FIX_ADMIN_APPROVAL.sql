-- ========================================
-- 🔧 FIX ADMIN APPROVAL ISSUE
-- ========================================
-- Run this SQL in Supabase Dashboard to fix property approval

-- First, let's drop the existing problematic policies
DROP POLICY IF EXISTS "Super admins update listings" ON public.property_listings;
DROP POLICY IF EXISTS "Super admins delete listings" ON public.property_listings;
DROP POLICY IF EXISTS "Super admins can update any listing" ON public.property_listings;
DROP POLICY IF EXISTS "Super admins can delete any listing" ON public.property_listings;

-- Create comprehensive super admin policies for property_listings
-- These policies allow super admins to do everything with properties

-- Super admin can UPDATE any property (including status changes)
CREATE POLICY "super_admin_update_all_properties" ON public.property_listings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Super admin can DELETE any property
CREATE POLICY "super_admin_delete_all_properties" ON public.property_listings 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Super admin can SELECT all properties (including pending ones)
CREATE POLICY "super_admin_select_all_properties" ON public.property_listings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Super admin can INSERT properties (if needed)
CREATE POLICY "super_admin_insert_all_properties" ON public.property_listings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'property_listings' 
AND policyname LIKE '%super_admin%'
ORDER BY policyname;
