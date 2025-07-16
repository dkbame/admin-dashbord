-- Completely reset and recreate RLS policies for apps table
-- First, disable RLS temporarily
ALTER TABLE apps DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow public read access for apps" ON apps;
DROP POLICY IF EXISTS "Allow public insert access for apps" ON apps;
DROP POLICY IF EXISTS "Allow public update access for apps" ON apps;
DROP POLICY IF EXISTS "Allow public delete access for apps" ON apps;
DROP POLICY IF EXISTS "Allow authenticated users to insert apps" ON apps;
DROP POLICY IF EXISTS "Allow authenticated users to update apps" ON apps;
DROP POLICY IF EXISTS "Allow authenticated users to delete apps" ON apps;

-- Re-enable RLS
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies
-- Allow public read access
CREATE POLICY "Allow public read access for apps"
  ON apps FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated users full access to apps"
  ON apps FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also fix screenshots table
ALTER TABLE screenshots DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for screenshots" ON screenshots;
DROP POLICY IF EXISTS "Allow authenticated users to insert screenshots" ON screenshots;
DROP POLICY IF EXISTS "Allow authenticated users to update screenshots" ON screenshots;
DROP POLICY IF EXISTS "Allow authenticated users to delete screenshots" ON screenshots;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for screenshots"
  ON screenshots FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users full access to screenshots"
  ON screenshots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix categories table
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for categories" ON categories;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow authenticated users full access to categories"
  ON categories FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true); 