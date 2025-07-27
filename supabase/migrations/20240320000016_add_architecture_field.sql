-- =====================================================
-- ADD ARCHITECTURE FIELD MIGRATION
-- =====================================================
-- This migration adds architecture support for MacUpdate apps
-- Created: 2024-03-20
-- Purpose: Add architecture field to store Intel 64, Apple Silicon info

-- =====================================================
-- 1. ADD ARCHITECTURE COLUMN TO APPS TABLE
-- =====================================================

-- Add architecture column to store processor architecture info
ALTER TABLE apps ADD COLUMN IF NOT EXISTS architecture TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN apps.architecture IS 'Processor architecture (e.g., Intel 64, Apple Silicon)';

-- =====================================================
-- 2. ADD INDEX FOR ARCHITECTURE QUERIES
-- =====================================================

-- Add index for architecture-based queries
CREATE INDEX IF NOT EXISTS idx_apps_architecture ON apps(architecture);

-- =====================================================
-- 3. UPDATE VIEWS TO INCLUDE ARCHITECTURE
-- =====================================================

-- Update macupdate_apps_view to include architecture
DROP VIEW IF EXISTS macupdate_apps_view;
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
    a.architecture,
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
WHERE a.source = 'CUSTOM'
ORDER BY a.created_at DESC;

-- Update ios_apps_view to include architecture
DROP VIEW IF EXISTS ios_apps_view;
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
    a.architecture,
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
WHERE a.status = 'ACTIVE'
ORDER BY a.created_at DESC;

-- =====================================================
-- 4. ADD COMMENTS
-- =====================================================

COMMENT ON VIEW macupdate_apps_view IS 'View for MacUpdate apps with architecture support';
COMMENT ON VIEW ios_apps_view IS 'View for iOS app to fetch all active apps with architecture support'; 