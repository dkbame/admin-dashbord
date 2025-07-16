-- Fix RLS policies for categories table
-- This script ensures that all operations (SELECT, INSERT, UPDATE, DELETE) work properly

-- First, drop all existing policies for categories
DROP POLICY IF EXISTS "Allow public read access for categories" ON categories;
DROP POLICY IF EXISTS "Allow public insert access for categories" ON categories;
DROP POLICY IF EXISTS "Allow public update access for categories" ON categories;
DROP POLICY IF EXISTS "Allow public delete access for categories" ON categories;
DROP POLICY IF EXISTS "Allow public all access for categories" ON categories;
DROP POLICY IF EXISTS "Allow public access for categories" ON categories;

-- Create comprehensive policies for all operations
CREATE POLICY "Allow public select access for categories"
  ON categories FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access for categories"
  ON categories FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access for categories"
  ON categories FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access for categories"
  ON categories FOR DELETE
  TO anon
  USING (true);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'categories'; 