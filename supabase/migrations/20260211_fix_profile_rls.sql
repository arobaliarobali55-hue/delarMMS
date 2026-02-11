-- Fix RLS Policies for Profiles table
-- Goal: Allow all authenticated users to see other profiles (name, avatar, role) 
-- while keeping sensitive data or updates restricted.

-- 1. Drop old restrictive policies
DROP POLICY IF EXISTS "Admins can see all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can see their own profile" ON profiles;

-- 2. Create new policies
-- Allow everyone authenticated to see profiles (necessary for chat and identifying users)
CREATE POLICY "Authenticated users can see all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- Allow users to update only their own profile
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can do everything
CREATE POLICY "Admins have full access to profiles" 
ON profiles FOR ALL 
TO authenticated 
USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
