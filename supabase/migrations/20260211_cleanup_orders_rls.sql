-- Clean up duplicate RLS policies on orders table
-- Date: 2026-02-11

-- Drop duplicate/redundant policies
DROP POLICY IF EXISTS "Admins see all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- Ensure we have a clean, single Admin policy using the new secure is_admin() function
DROP POLICY IF EXISTS "Admins can see all orders" ON public.orders;

-- Re-create single Admin ALL policy
CREATE POLICY "Admins have full access to orders"
ON public.orders FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
