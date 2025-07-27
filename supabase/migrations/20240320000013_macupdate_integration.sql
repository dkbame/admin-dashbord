-- =====================================================
-- MACUPDATE INTEGRATION MIGRATION
-- =====================================================
-- This migration ensures all necessary columns exist for MacUpdate scraper
-- Created: 2024-03-20
-- Purpose: Add any missing columns needed for MacUpdate app imports

-- =====================================================
-- 1. ENSURE APPS TABLE HAS ALL NECESSARY COLUMNS
-- =====================================================

-- Add any missing columns that might be needed for MacUpdate apps
ALTER TABLE apps ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS minimum_os_version TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS size INTEGER;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS app_store_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE apps ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE apps ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- =====================================================
-- 2. ENSURE CUSTOM_METADATA TABLE EXISTS
-- =====================================================

-- Create custom_metadata table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_metadata (
  id uuid DEFAULT gen_random_uuid() primary key,
  app_id uuid references apps(id) on delete cascade,
  license text,
  release_notes text,
  system_requirements text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- =====================================================
-- 3. ADD INDEXES FOR MACUPDATE APPS
-- =====================================================

-- Add indexes for MacUpdate-specific queries
CREATE INDEX IF NOT EXISTS idx_apps_source ON apps(source);
CREATE INDEX IF NOT EXISTS idx_apps_website_url ON apps(website_url);
CREATE INDEX IF NOT EXISTS idx_apps_created_at_recent ON apps(created_at DESC);

-- =====================================================
-- 4. UPDATE EXISTING APPS TO SET DEFAULT VALUES
-- =====================================================

-- Update existing apps to set is_free based on price
UPDATE apps SET is_free = (CAST(price AS NUMERIC) = 0 OR price IS NULL) WHERE is_free IS NULL;

-- Update existing apps to set source if not set
UPDATE apps SET source = 'CUSTOM' WHERE source IS NULL;

-- =====================================================
-- 5. ADD RLS POLICIES FOR CUSTOM_METADATA
-- =====================================================

-- Enable RLS on custom_metadata table
ALTER TABLE custom_metadata ENABLE ROW LEVEL SECURITY;

-- Public read access for custom_metadata
DROP POLICY IF EXISTS "Public read access for custom_metadata" ON custom_metadata;
CREATE POLICY "Public read access for custom_metadata" ON custom_metadata
  FOR SELECT USING (true);

-- Authenticated users can insert custom_metadata
DROP POLICY IF EXISTS "Authenticated users can insert custom_metadata" ON custom_metadata;
CREATE POLICY "Authenticated users can insert custom_metadata" ON custom_metadata
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update custom_metadata
DROP POLICY IF EXISTS "Authenticated users can update custom_metadata" ON custom_metadata;
CREATE POLICY "Authenticated users can update custom_metadata" ON custom_metadata
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated users can delete custom_metadata
DROP POLICY IF EXISTS "Authenticated users can delete custom_metadata" ON custom_metadata;
CREATE POLICY "Authenticated users can delete custom_metadata" ON custom_metadata
  FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 6. CREATE FUNCTION TO UPDATE LAST_UPDATED
-- =====================================================

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update last_updated
DROP TRIGGER IF EXISTS update_apps_last_updated ON apps;
CREATE TRIGGER update_apps_last_updated
  BEFORE UPDATE ON apps
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated_column();

-- =====================================================
-- 7. CREATE VIEW FOR MACUPDATE APPS
-- =====================================================

-- View for MacUpdate apps specifically
CREATE OR REPLACE VIEW macupdate_apps_view AS
SELECT 
  a.*,
  c.name as category_name,
  c.slug as category_slug
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.source = 'CUSTOM' 
  AND (a.website_url ILIKE '%macupdate%' OR a.website_url ILIKE '%macupdate.com%')
ORDER BY a.created_at DESC;

-- =====================================================
-- 8. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE custom_metadata IS 'Additional metadata for apps, including system requirements and release notes';
COMMENT ON COLUMN apps.website_url IS 'Official website URL for the app';
COMMENT ON COLUMN apps.download_url IS 'Direct download URL for the app';
COMMENT ON COLUMN apps.icon_url IS 'URL to the app icon image';
COMMENT ON COLUMN apps.source IS 'Source of the app data: MAS (Mac App Store) or CUSTOM (manual/MacUpdate)';
COMMENT ON VIEW macupdate_apps_view IS 'View of all apps imported from MacUpdate'; 