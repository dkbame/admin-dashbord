-- Fix size field to support human-readable formats (MB, GB) instead of bytes
-- This allows storing formats like "165.3 MB", "2.1 GB" which are more user-friendly

-- First, create a backup of existing size data (if any)
CREATE TABLE IF NOT EXISTS apps_size_backup AS 
SELECT id, size FROM apps WHERE size IS NOT NULL;

-- Drop all views that might depend on the size column
DROP VIEW IF EXISTS macupdate_apps_view;
DROP VIEW IF EXISTS apps_with_iap_summary;
DROP VIEW IF EXISTS ios_apps_view;
DROP VIEW IF EXISTS featured_apps_view;
DROP VIEW IF EXISTS free_apps_view;
DROP VIEW IF EXISTS category_stats_view;
DROP VIEW IF EXISTS dashboard_analytics;
DROP VIEW IF EXISTS performance_metrics;
DROP VIEW IF EXISTS apps_with_price_display;

-- Change the size column from INTEGER to TEXT
ALTER TABLE apps ALTER COLUMN size TYPE TEXT;

-- Update the comment to reflect the new format
COMMENT ON COLUMN apps.size IS 'App file size in human-readable format (e.g., "165.3 MB", "2.1 GB")';

-- Clean up existing size data to match the new format
-- Convert any existing integer values to NULL (they will be updated by future imports)
UPDATE apps SET size = NULL WHERE size IS NOT NULL AND size ~ '^\d+$';

-- Note: We'll add a constraint later once all data is in the correct format
-- For now, we'll rely on application-level validation

-- Recreate the macupdate_apps_view with the updated size column
CREATE OR REPLACE VIEW macupdate_apps_view AS
SELECT 
    a.id,
    a.name,
    a.developer,
    a.description,
    a.category_id,
    c.name as category_name,
    c.slug as category_slug,
    a.price,
    a.currency,
    a.rating,
    a.rating_count,
    a.version,
    a.is_on_mas,
    a.mas_id,
    a.mas_url,
    a.app_store_url,
    a.website_url,
    a.download_url,
    a.icon_url,
    a.minimum_os_version,
    a.size,
    a.release_date,
    a.is_free,
    a.is_featured,
    a.features,
    a.source,
    a.status,
    a.created_at,
    a.updated_at,
    a.last_updated,
    cm.system_requirements
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN custom_metadata cm ON a.id = cm.app_id
WHERE a.source = 'CUSTOM';

-- Recreate other views that might reference the size column
CREATE OR REPLACE VIEW ios_apps_view AS
SELECT 
    a.id,
    a.name,
    a.developer,
    a.description,
    a.category_id,
    c.name as category_name,
    c.slug as category_slug,
    a.price,
    a.currency,
    a.rating,
    a.rating_count,
    a.version,
    a.is_on_mas,
    a.mas_id,
    a.mas_url,
    a.app_store_url,
    a.website_url,
    a.download_url,
    a.icon_url,
    a.minimum_os_version,
    a.size,
    a.release_date,
    a.is_free,
    a.is_featured,
    a.features,
    a.source,
    a.status,
    a.created_at,
    a.updated_at,
    a.last_updated
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
WHERE a.is_on_mas = true AND a.status = 'ACTIVE';

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