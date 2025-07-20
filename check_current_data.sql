-- Check current apps and their screenshot status
-- Run this in the Supabase SQL Editor

-- Check all apps
SELECT 
    a.id,
    a.name,
    a.developer,
    a.is_featured,
    a.status,
    COUNT(s.id) as screenshot_count
FROM apps a
LEFT JOIN screenshots s ON a.id = s.app_id
GROUP BY a.id, a.name, a.developer, a.is_featured, a.status
ORDER BY a.is_featured DESC, a.name;

-- Check featured apps specifically
SELECT 
    a.id,
    a.name,
    a.developer,
    a.description,
    a.icon_url,
    COUNT(s.id) as screenshot_count
FROM apps a
LEFT JOIN screenshots s ON a.id = s.app_id
WHERE a.is_featured = true AND a.status = 'ACTIVE'
GROUP BY a.id, a.name, a.developer, a.description, a.icon_url
ORDER BY a.name;

-- Check if there are any screenshots at all
SELECT COUNT(*) as total_screenshots FROM screenshots;

-- Check screenshots for a specific app (replace with actual app name)
SELECT 
    s.id,
    s.url,
    s.caption,
    s.display_order,
    a.name as app_name
FROM screenshots s
JOIN apps a ON s.app_id = a.id
WHERE a.name = 'Notion'  -- Change this to any app name you want to check
ORDER BY s.display_order; 