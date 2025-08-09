-- Fix category_id values for apps imported from MacUpdate
-- This migration will update apps that have category names but no category_id

-- First, let's see what categories we have and what apps need fixing
DO $$
DECLARE
    app_record RECORD;
    category_record RECORD;
    category_id uuid;
    category_name text;
BEGIN
    -- Loop through apps that don't have category_id set
    FOR app_record IN 
        SELECT id, name, category 
        FROM apps 
        WHERE category_id IS NULL 
        AND category IS NOT NULL 
        AND category != ''
    LOOP
        -- Try to find a matching category by name
        SELECT id, name INTO category_record
        FROM categories 
        WHERE LOWER(name) = LOWER(app_record.category)
        LIMIT 1;
        
        -- If no exact match, try partial matching
        IF category_record.id IS NULL THEN
            SELECT id, name INTO category_record
            FROM categories 
            WHERE LOWER(name) LIKE '%' || LOWER(app_record.category) || '%'
            OR LOWER(app_record.category) LIKE '%' || LOWER(name) || '%'
            LIMIT 1;
        END IF;
        
        -- If still no match, try some common mappings
        IF category_record.id IS NULL THEN
            CASE LOWER(app_record.category)
                WHEN 'music & audio' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'music' LIMIT 1;
                WHEN 'video & audio' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'video & audio' LIMIT 1;
                WHEN 'graphics & design' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'graphics & design' LIMIT 1;
                WHEN 'developer tools' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'development' LIMIT 1;
                WHEN 'system utilities' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'utilities' LIMIT 1;
                WHEN 'productivity' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'productivity' LIMIT 1;
                WHEN 'games' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'games' LIMIT 1;
                WHEN 'education' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'education' LIMIT 1;
                WHEN 'business' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'business' LIMIT 1;
                WHEN 'entertainment' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'entertainment' LIMIT 1;
                WHEN 'lifestyle' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'lifestyle' LIMIT 1;
                WHEN 'health & fitness' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'health & fitness' LIMIT 1;
                WHEN 'social networking' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'social networking' LIMIT 1;
                WHEN 'sports' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'sports' LIMIT 1;
                WHEN 'finance' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'finance' LIMIT 1;
                WHEN 'reference' THEN
                    SELECT id INTO category_id FROM categories WHERE LOWER(name) = 'reference' LIMIT 1;
                ELSE
                    category_id := NULL;
            END CASE;
            
            IF category_id IS NOT NULL THEN
                category_record.id := category_id;
            END IF;
        ELSE
            category_id := category_record.id;
        END IF;
        
        -- Update the app with the found category_id
        IF category_record.id IS NOT NULL THEN
            UPDATE apps 
            SET category_id = category_record.id
            WHERE id = app_record.id;
            
            RAISE NOTICE 'Updated app "%" with category "%" (ID: %)', 
                app_record.name, category_record.name, category_record.id;
        ELSE
            RAISE NOTICE 'Could not find category for app "%" with category "%"', 
                app_record.name, app_record.category;
        END IF;
    END LOOP;
END $$;

-- Create a view to show category distribution
CREATE OR REPLACE VIEW app_category_distribution AS
SELECT 
    c.name as category_name,
    COUNT(a.id) as app_count
FROM categories c
LEFT JOIN apps a ON c.id = a.category_id
WHERE a.status = 'ACTIVE'
GROUP BY c.id, c.name
ORDER BY app_count DESC;

COMMENT ON VIEW app_category_distribution IS 'Shows how many apps are in each category';
