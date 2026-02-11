-- Fix RLS Recursion (Infinite Loop) on Profiles table
-- The previous "Admins have full access" policy caused infinite recursion because it queried the table it was protecting.
-- Solution: Use a SECURITY DEFINER function to check admin status (bypassing RLS) and clean up duplicate policies.

-- 1. Create/Replace the is_admin function ensuring it is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_role user_role;
BEGIN
  -- Check if the user is authenticated first
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO current_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN current_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop ALL existing policies on profiles to start fresh (and remove duplicates/recursion)
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin view all" ON public.profiles;


-- 3. Re-create Clean Policies

-- SELECT: Allow any authenticated user to view ALL profiles (needed for contacts, searching)
CREATE POLICY "Allow all authenticated users to select profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- INSERT: Users can insert their own profile (trigger usually handles this, but good for safety)
CREATE POLICY "Date Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ALL (Admin): Admins can do everything (Select, Insert, Update, Delete)
-- Using is_admin() which is SECURITY DEFINER prevents recursion
CREATE POLICY "Admins have full access"
ON public.profiles FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
