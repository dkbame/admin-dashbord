-- Add real screenshots to existing apps in the database
-- Run this in the Supabase SQL Editor

-- First, let's see what apps we have
SELECT id, name, developer, is_featured, status FROM apps WHERE status = 'ACTIVE' ORDER BY is_featured DESC, name;

-- Add screenshots for popular apps (adjust app names based on what's in your database)
-- You can run these individually for each app you want to add screenshots to

-- Example: Add screenshots for a productivity app (replace 'App Name' with actual app name)
INSERT INTO screenshots (app_id, url, caption, display_order) 
SELECT 
    a.id,
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    'Main Dashboard',
    1
FROM apps a 
WHERE a.name ILIKE '%notion%' OR a.name ILIKE '%productivity%' OR a.name ILIKE '%workspace%'
AND a.status = 'ACTIVE'
AND NOT EXISTS (SELECT 1 FROM screenshots s WHERE s.app_id = a.id);

INSERT INTO screenshots (app_id, url, caption, display_order) 
SELECT 
    a.id,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'Editor View',
    2
FROM apps a 
WHERE a.name ILIKE '%notion%' OR a.name ILIKE '%productivity%' OR a.name ILIKE '%workspace%'
AND a.status = 'ACTIVE'
AND NOT EXISTS (SELECT 1 FROM screenshots s WHERE s.app_id = a.id AND s.display_order = 2);

-- Example: Add screenshots for a design app
INSERT INTO screenshots (app_id, url, caption, display_order) 
SELECT 
    a.id,
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=600&fit=crop',
    'Design Canvas',
    1
FROM apps a 
WHERE a.name ILIKE '%figma%' OR a.name ILIKE '%design%' OR a.name ILIKE '%sketch%'
AND a.status = 'ACTIVE'
AND NOT EXISTS (SELECT 1 FROM screenshots s WHERE s.app_id = a.id);

-- Example: Add screenshots for a music/entertainment app
INSERT INTO screenshots (app_id, url, caption, display_order) 
SELECT 
    a.id,
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
    'Music Player',
    1
FROM apps a 
WHERE a.name ILIKE '%spotify%' OR a.name ILIKE '%music%' OR a.name ILIKE '%audio%'
AND a.status = 'ACTIVE'
AND NOT EXISTS (SELECT 1 FROM screenshots s WHERE s.app_id = a.id);

-- Example: Add screenshots for a development app
INSERT INTO screenshots (app_id, url, caption, display_order) 
SELECT 
    a.id,
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop',
    'Code Editor',
    1
FROM apps a 
WHERE a.name ILIKE '%code%' OR a.name ILIKE '%developer%' OR a.name ILIKE '%programming%'
AND a.status = 'ACTIVE'
AND NOT EXISTS (SELECT 1 FROM screenshots s WHERE s.app_id = a.id);

-- Example: Add screenshots for a utility app
INSERT INTO screenshots (app_id, url, caption, display_order) 
SELECT 
    a.id,
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    'Main Interface',
    1
FROM apps a 
WHERE a.name ILIKE '%utility%' OR a.name ILIKE '%tool%' OR a.name ILIKE '%helper%'
AND a.status = 'ACTIVE'
AND NOT EXISTS (SELECT 1 FROM screenshots s WHERE s.app_id = a.id);

-- Check results
SELECT 
    a.name,
    a.developer,
    a.is_featured,
    COUNT(s.id) as screenshot_count
FROM apps a
LEFT JOIN screenshots s ON a.id = s.app_id
WHERE a.status = 'ACTIVE'
GROUP BY a.id, a.name, a.developer, a.is_featured
ORDER BY a.is_featured DESC, screenshot_count DESC, a.name; 