-- Fix ios_apps_view to include MacUpdate apps (not just MAS apps)
-- The iOS app needs to see all active apps, not just Mac App Store apps

-- Drop and recreate the ios_apps_view to include all active apps
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
WHERE a.status = 'ACTIVE'  -- Include all active apps, not just MAS apps
ORDER BY a.created_at DESC;

-- Add comment to explain the view
COMMENT ON VIEW ios_apps_view IS 'View for iOS app to fetch all active apps (both MAS and MacUpdate apps)'; 