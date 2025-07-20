-- Add minimum_os_version and features to ios_apps_view
-- These fields were missing from the view, causing iOS app to show "Unknown" for Minimum OS

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
    a.minimum_os_version,  -- Add the missing field
    a.features,            -- Add features field
    c.name as category_name,
    c.slug as category_slug,
    COALESCE(ar.average_rating, 0) as calculated_rating,
    COALESCE(ar.rating_count, 0) as calculated_rating_count
FROM apps a
LEFT JOIN categories c ON a.category_id = c.id
LEFT JOIN app_ratings ar ON a.id = ar.app_id
WHERE a.status = 'ACTIVE'; 