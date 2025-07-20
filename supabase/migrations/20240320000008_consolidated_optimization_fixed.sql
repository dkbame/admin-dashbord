-- =====================================================
-- CONSOLIDATED DATABASE OPTIMIZATION MIGRATION (FIXED)
-- =====================================================
-- This migration consolidates all scattered SQL files and adds performance optimizations
-- Created: 2024-03-20
-- Purpose: Clean up database schema, add indexes, optimize queries, and consolidate policies

-- =====================================================
-- 1. STORAGE BUCKETS SETUP
-- =====================================================

-- Create storage buckets for app icons and screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('icons', 'icons', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('screenshots', 'screenshots', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create comprehensive storage policies (removed IF NOT EXISTS)
DROP POLICY IF EXISTS "Public Access Icons" ON storage.objects;
CREATE POLICY "Public Access Icons" ON storage.objects 
  FOR SELECT USING (bucket_id = 'icons');

DROP POLICY IF EXISTS "Authenticated users can upload icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload icons" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'icons' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update icons" ON storage.objects;
CREATE POLICY "Authenticated users can update icons" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'icons' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete icons" ON storage.objects;
CREATE POLICY "Authenticated users can delete icons" ON storage.objects 
  FOR DELETE USING (bucket_id = 'icons' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public Access Screenshots" ON storage.objects;
CREATE POLICY "Public Access Screenshots" ON storage.objects 
  FOR SELECT USING (bucket_id = 'screenshots');

DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can upload screenshots" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can update screenshots" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete screenshots" ON storage.objects;
CREATE POLICY "Authenticated users can delete screenshots" ON storage.objects 
  FOR DELETE USING (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

-- =====================================================
-- 2. SCHEMA ENHANCEMENTS
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2);
ALTER TABLE apps ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS release_date DATE;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS size INTEGER; -- in bytes
ALTER TABLE apps ADD COLUMN IF NOT EXISTS version TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS app_store_url TEXT;
ALTER TABLE apps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add description column to categories if it doesn't exist
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing apps to set is_free based on price
UPDATE apps SET is_free = (CAST(price AS NUMERIC) = 0 OR price IS NULL) WHERE is_free IS NULL;

-- =====================================================
-- 3. PERFORMANCE INDEXES
-- =====================================================

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_featured ON apps(is_featured);
CREATE INDEX IF NOT EXISTS idx_apps_free ON apps(is_free);
CREATE INDEX IF NOT EXISTS idx_apps_rating ON apps(rating);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at);
CREATE INDEX IF NOT EXISTS idx_apps_release_date ON apps(release_date);
CREATE INDEX IF NOT EXISTS idx_apps_category_id ON apps(category_id);
CREATE INDEX IF NOT EXISTS idx_apps_developer ON apps(developer);
CREATE INDEX IF NOT EXISTS idx_apps_name ON apps USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_apps_description ON apps USING gin(to_tsvector('english', description));

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_apps_status_featured ON apps(status, is_featured);
CREATE INDEX IF NOT EXISTS idx_apps_status_free ON apps(status, is_free);
CREATE INDEX IF NOT EXISTS idx_apps_category_status ON apps(category_id, status);
CREATE INDEX IF NOT EXISTS idx_apps_rating_count_rating ON apps(rating_count DESC, rating DESC);

-- Screenshots indexes
CREATE INDEX IF NOT EXISTS idx_screenshots_app_id ON screenshots(app_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_display_order ON screenshots(app_id, display_order);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories USING gin(to_tsvector('english', name));

-- Ratings indexes
CREATE INDEX IF NOT EXISTS idx_ratings_app_id ON ratings(app_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rating ON ratings(rating);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);

-- =====================================================
-- 4. OPTIMIZED VIEWS
-- =====================================================

-- Enhanced iOS apps view with better performance
CREATE OR REPLACE VIEW ios_apps_view AS
SELECT 
    a.id,
    a.name,
    a.description,
    a.developer,
    a.category_id,
    a.price,
    a.currency,
    a.icon_url,
    a.app_store_url,
    a.website_url,
    a.version,
    a.size,
    a.rating,
    a.rating_count,
    a.release_date,
    a.last_updated,
    a.is_free,
    a.is_featured,
    a.status,
    a.created_at,
    a.updated_at,
    c.name as category_name,
    c.slug as category_slug,
    COALESCE(ar.average_rating, 0) as calculated_rating,
    COALESCE(ar.rating_count, 0) as calculated_rating_count
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN app_ratings ar ON a.id = ar.app_id
WHERE a.status = 'ACTIVE';

-- Featured apps view
CREATE OR REPLACE VIEW featured_apps_view AS
SELECT 
    a.id,
    a.name,
    a.description,
    a.developer,
    a.icon_url,
    a.rating,
    a.rating_count,
    a.is_free,
    a.price,
    a.category_id,
    c.name as category_name
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.is_featured = true AND a.status = 'ACTIVE'
ORDER BY a.rating_count DESC, a.rating DESC;

-- Free apps view
CREATE OR REPLACE VIEW free_apps_view AS
SELECT 
    a.id,
    a.name,
    a.description,
    a.developer,
    a.icon_url,
    a.rating,
    a.rating_count,
    a.category_id,
    c.name as category_name
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.is_free = true AND a.status = 'ACTIVE'
ORDER BY a.rating_count DESC, a.rating DESC;

-- Category stats view
CREATE OR REPLACE VIEW category_stats_view AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.description,
    COUNT(a.id) as app_count,
    AVG(a.rating) as avg_rating,
    SUM(a.rating_count) as total_ratings,
    COUNT(CASE WHEN a.is_free = true THEN 1 END) as free_app_count,
    COUNT(CASE WHEN a.is_featured = true THEN 1 END) as featured_app_count
FROM categories c
LEFT JOIN apps a ON c.id = a.category_id AND a.status = 'ACTIVE'
GROUP BY c.id, c.name, c.slug, c.description
ORDER BY app_count DESC;

-- =====================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update app ratings
CREATE OR REPLACE FUNCTION update_app_ratings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the apps table with calculated ratings
    UPDATE apps 
    SET 
        rating = ar.average_rating,
        rating_count = ar.rating_count
    FROM app_ratings ar
    WHERE apps.id = ar.app_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update ratings
DROP TRIGGER IF EXISTS trigger_update_app_ratings ON ratings;
CREATE TRIGGER trigger_update_app_ratings
    AFTER INSERT OR UPDATE OR DELETE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_ratings();

-- Function to toggle featured status
DROP FUNCTION IF EXISTS toggle_featured_app(UUID);
CREATE OR REPLACE FUNCTION toggle_featured_app(app_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE apps 
    SET is_featured = NOT is_featured 
    WHERE id = app_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending apps
DROP FUNCTION IF EXISTS get_trending_apps(INTEGER);
CREATE OR REPLACE FUNCTION get_trending_apps(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    developer TEXT,
    icon_url TEXT,
    rating NUMERIC(3,2),
    rating_count INTEGER,
    is_free BOOLEAN,
    price NUMERIC(10,2),
    category_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.developer,
        a.icon_url,
        a.rating,
        a.rating_count,
        a.is_free,
        a.price,
        c.name as category_name
    FROM apps a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'ACTIVE' AND a.rating_count > 10
    ORDER BY (a.rating * LOG(a.rating_count + 1)) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get new releases
DROP FUNCTION IF EXISTS get_new_releases(INTEGER);
CREATE OR REPLACE FUNCTION get_new_releases(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    developer TEXT,
    icon_url TEXT,
    rating NUMERIC(3,2),
    rating_count INTEGER,
    is_free BOOLEAN,
    price NUMERIC(10,2),
    category_name TEXT,
    release_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.developer,
        a.icon_url,
        a.rating,
        a.rating_count,
        a.is_free,
        a.price,
        c.name as category_name,
        a.release_date
    FROM apps a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'ACTIVE' 
        AND a.release_date IS NOT NULL
        AND a.release_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY a.release_date DESC, a.rating_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search apps
DROP FUNCTION IF EXISTS search_apps(TEXT, INTEGER);
CREATE OR REPLACE FUNCTION search_apps(search_term TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    developer TEXT,
    icon_url TEXT,
    rating NUMERIC(3,2),
    rating_count INTEGER,
    is_free BOOLEAN,
    price NUMERIC(10,2),
    category_name TEXT,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.developer,
        a.icon_url,
        a.rating,
        a.rating_count,
        a.is_free,
        a.price,
        c.name as category_name,
        ts_rank(
            setweight(to_tsvector('english', a.name), 'A') ||
            setweight(to_tsvector('english', COALESCE(a.description, '')), 'B') ||
            setweight(to_tsvector('english', a.developer), 'C'),
            plainto_tsquery('english', search_term)
        ) as search_rank
    FROM apps a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.status = 'ACTIVE'
        AND (
            to_tsvector('english', a.name) @@ plainto_tsquery('english', search_term) OR
            to_tsvector('english', COALESCE(a.description, '')) @@ plainto_tsquery('english', search_term) OR
            to_tsvector('english', a.developer) @@ plainto_tsquery('english', search_term)
        )
    ORDER BY search_rank DESC, a.rating_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_apps_updated_at ON apps;
CREATE TRIGGER update_apps_updated_at
    BEFORE UPDATE ON apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Apps policies
DROP POLICY IF EXISTS "Public read access" ON apps;
CREATE POLICY "Public read access" ON apps
    FOR SELECT USING (status = 'ACTIVE');

DROP POLICY IF EXISTS "Admin full access" ON apps;
CREATE POLICY "Admin full access" ON apps
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "Authenticated users can create" ON apps;
CREATE POLICY "Authenticated users can create" ON apps
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update" ON apps;
CREATE POLICY "Authenticated users can update" ON apps
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Categories policies
DROP POLICY IF EXISTS "Public read access" ON categories;
CREATE POLICY "Public read access" ON categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access" ON categories;
CREATE POLICY "Admin full access" ON categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Screenshots policies
DROP POLICY IF EXISTS "Public read access" ON screenshots;
CREATE POLICY "Public read access" ON screenshots
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access" ON screenshots;
CREATE POLICY "Admin full access" ON screenshots
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Ratings policies
DROP POLICY IF EXISTS "Public read access" ON ratings;
CREATE POLICY "Public read access" ON ratings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create" ON ratings;
CREATE POLICY "Authenticated users can create" ON ratings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update" ON ratings;
CREATE POLICY "Authenticated users can update" ON ratings
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete" ON ratings;
CREATE POLICY "Authenticated users can delete" ON ratings
    FOR DELETE USING (auth.role() = 'authenticated');

-- =====================================================
-- 7. ANALYTICS AND MONITORING VIEWS
-- =====================================================

-- Dashboard analytics view
CREATE OR REPLACE VIEW dashboard_analytics AS
SELECT 
    COUNT(*) as total_apps,
    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_apps,
    COUNT(CASE WHEN is_featured = true THEN 1 END) as featured_apps,
    COUNT(CASE WHEN is_free = true THEN 1 END) as free_apps,
    AVG(rating) as avg_rating,
    SUM(rating_count) as total_ratings
FROM apps;

-- Performance metrics view
CREATE OR REPLACE VIEW performance_metrics AS
SELECT 
    c.name as category_name,
    COUNT(a.id) as app_count,
    AVG(a.rating) as avg_rating,
    COUNT(CASE WHEN a.is_featured = true THEN 1 END) as featured_count,
    COUNT(CASE WHEN a.is_free = true THEN 1 END) as free_count
FROM categories c
LEFT JOIN apps a ON c.id = a.category_id AND a.status = 'ACTIVE'
GROUP BY c.id, c.name
ORDER BY app_count DESC;

-- =====================================================
-- 8. MAINTENANCE FUNCTIONS
-- =====================================================

-- Function to perform database maintenance
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Update app ratings from ratings table
    UPDATE apps 
    SET 
        rating = ar.average_rating,
        rating_count = ar.rating_count
    FROM app_ratings ar
    WHERE apps.id = ar.app_id;
    
    -- Update is_free flag based on price
    UPDATE apps 
    SET is_free = (CAST(price AS NUMERIC) = 0 OR price IS NULL)
    WHERE is_free IS NULL;
    
    -- Clean up orphaned screenshots
    DELETE FROM screenshots 
    WHERE app_id NOT IN (SELECT id FROM apps);
    
    RAISE NOTICE 'Database maintenance completed successfully';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FINAL OPTIMIZATIONS
-- =====================================================

-- Note: VACUUM commands removed as they cannot run in transaction blocks
-- Run these commands separately in the SQL editor if needed:
-- VACUUM ANALYZE apps;
-- VACUUM ANALYZE categories;
-- VACUUM ANALYZE screenshots;
-- VACUUM ANALYZE ratings;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- ===================================================== 