-- Add import session tracking to prevent duplicate imports
-- This migration adds tables and columns to track import sessions and history

-- Create import_sessions table to track each import session
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL,
  category_url TEXT,
  source_type TEXT CHECK (source_type IN ('MANUAL', 'BULK_CATEGORY', 'BULK_PAGE')),
  apps_imported INTEGER DEFAULT 0,
  apps_skipped INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add import tracking columns to apps table
ALTER TABLE apps ADD COLUMN IF NOT EXISTS import_session_id UUID REFERENCES import_sessions(id);
ALTER TABLE apps ADD COLUMN IF NOT EXISTS import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient session lookups
CREATE INDEX IF NOT EXISTS idx_apps_import_session ON apps(import_session_id);
CREATE INDEX IF NOT EXISTS idx_apps_import_date ON apps(import_date);
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_at ON import_sessions(created_at);

-- Create view for recent import sessions
CREATE OR REPLACE VIEW recent_import_sessions AS
SELECT 
  import_sessions.id,
  import_sessions.session_name,
  import_sessions.category_url,
  import_sessions.source_type,
  import_sessions.apps_imported,
  import_sessions.apps_skipped,
  import_sessions.created_at,
  import_sessions.completed_at,
  COUNT(a.id) as actual_apps_imported
FROM import_sessions
LEFT JOIN apps a ON a.import_session_id = import_sessions.id
GROUP BY import_sessions.id, import_sessions.session_name, import_sessions.category_url, import_sessions.source_type, import_sessions.apps_imported, import_sessions.apps_skipped, import_sessions.created_at, import_sessions.completed_at
ORDER BY import_sessions.created_at DESC;

-- Create function to get next category for rotation
CREATE OR REPLACE FUNCTION get_next_category_for_import()
RETURNS TEXT AS $$
DECLARE
  next_category TEXT;
  recent_categories TEXT[];
BEGIN
  -- Get categories used in the last 3 days
  SELECT ARRAY_AGG(DISTINCT category_url) INTO recent_categories
  FROM import_sessions 
  WHERE created_at > NOW() - INTERVAL '3 days'
    AND category_url IS NOT NULL;
  
  -- Define available categories in rotation order
  -- Find first category not used recently
  next_category := CASE 
    WHEN NOT ('https://www.macupdate.com/explore/categories/developer-tools' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/developer-tools'
    WHEN NOT ('https://www.macupdate.com/explore/categories/graphic-design' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/graphic-design'
    WHEN NOT ('https://www.macupdate.com/explore/categories/productivity' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/productivity'
    WHEN NOT ('https://www.macupdate.com/explore/categories/utilities' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/utilities'
    WHEN NOT ('https://www.macupdate.com/explore/categories/security' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/security'
    WHEN NOT ('https://www.macupdate.com/explore/categories/business' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/business'
    WHEN NOT ('https://www.macupdate.com/explore/categories/education' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/education'
    WHEN NOT ('https://www.macupdate.com/explore/categories/games' = ANY(recent_categories)) 
      THEN 'https://www.macupdate.com/explore/categories/games'
    ELSE 'https://www.macupdate.com/explore/categories/developer-tools' -- Fallback
  END;
  
  RETURN next_category;
END;
$$ LANGUAGE plpgsql;

-- Create function to check if app exists
CREATE OR REPLACE FUNCTION check_app_exists(app_url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM apps 
    WHERE macupdate_url = app_url 
       OR (name = (SELECT name FROM apps WHERE macupdate_url = app_url LIMIT 1))
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE import_sessions IS 'Tracks import sessions to prevent duplicate imports';
COMMENT ON FUNCTION get_next_category_for_import() IS 'Returns the next category URL for smart rotation';
COMMENT ON FUNCTION check_app_exists(app_url TEXT) IS 'Checks if an app already exists in the database'; 