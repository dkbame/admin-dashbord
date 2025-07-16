-- Fix RLS policies to allow authenticated users to insert apps
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow public insert access for apps" ON apps;
DROP POLICY IF EXISTS "Allow public update access for apps" ON apps;
DROP POLICY IF EXISTS "Allow public delete access for apps" ON apps;

-- Create new policies for authenticated users
CREATE POLICY "Allow authenticated users to insert apps"
  ON apps FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update apps"
  ON apps FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete apps"
  ON apps FOR DELETE
  TO authenticated
  USING (true);

-- Also fix screenshots policies
DROP POLICY IF EXISTS "Allow public access for screenshots" ON screenshots;

CREATE POLICY "Allow authenticated users to insert screenshots"
  ON screenshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update screenshots"
  ON screenshots FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete screenshots"
  ON screenshots FOR DELETE
  TO authenticated
  USING (true);

-- Keep the public read policies
-- (These should already exist and work fine) 