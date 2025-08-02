-- Enhanced Category Tracking for Admin Dashboard
-- This adds better tracking of page status and category progress

-- Add page status tracking to existing import_sessions table
ALTER TABLE import_sessions ADD COLUMN page_status TEXT DEFAULT 'scraped' CHECK (page_status IN ('scraped', 'imported', 'failed'));

-- Create category progress table for better tracking
CREATE TABLE category_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_url TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  total_pages INTEGER DEFAULT 0,
  pages_scraped INTEGER DEFAULT 0,
  pages_imported INTEGER DEFAULT 0,
  last_scraped_page INTEGER DEFAULT 0,
  last_imported_page INTEGER DEFAULT 0,
  total_apps_found INTEGER DEFAULT 0,
  total_apps_imported INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_category_progress_url ON category_progress(category_url);
CREATE INDEX idx_import_sessions_status ON import_sessions(page_status);

-- Create function to update category progress
CREATE OR REPLACE FUNCTION update_category_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update category_progress when import_sessions changes
  INSERT INTO category_progress (category_url, category_name, pages_scraped, last_scraped_page, updated_at)
  VALUES (
    NEW.category_url,
    COALESCE(
      (SELECT category_name FROM category_progress WHERE category_url = NEW.category_url),
      'Unknown Category'
    ),
    1,
    CASE 
      WHEN NEW.session_name ~ 'Page (\d+)' THEN 
        (regexp_match(NEW.session_name, 'Page (\d+)'))[1]::integer
      ELSE 0
    END,
    NOW()
  )
  ON CONFLICT (category_url) DO UPDATE SET
    pages_scraped = category_progress.pages_scraped + 1,
    last_scraped_page = GREATEST(
      category_progress.last_scraped_page,
      CASE 
        WHEN NEW.session_name ~ 'Page (\d+)' THEN 
          (regexp_match(NEW.session_name, 'Page (\d+)'))[1]::integer
        ELSE 0
      END
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update category progress
CREATE TRIGGER trigger_update_category_progress
  AFTER INSERT ON import_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_category_progress();

-- Create view for easy category status queries
CREATE VIEW category_status AS
SELECT 
  cp.category_url,
  cp.category_name,
  cp.total_pages,
  cp.pages_scraped,
  cp.pages_imported,
  cp.last_scraped_page,
  cp.last_imported_page,
  cp.total_apps_found,
  cp.total_apps_imported,
  cp.pages_scraped - cp.pages_imported as pages_pending_import,
  CASE 
    WHEN cp.total_pages > 0 THEN 
      ROUND((cp.pages_scraped::float / cp.total_pages) * 100, 1)
    ELSE 0 
  END as scrape_progress_percent,
  CASE 
    WHEN cp.pages_scraped > 0 THEN 
      ROUND((cp.pages_imported::float / cp.pages_scraped) * 100, 1)
    ELSE 0 
  END as import_progress_percent,
  cp.created_at,
  cp.updated_at
FROM category_progress cp; 