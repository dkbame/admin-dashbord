-- Fix category_id values for apps that have invalid or missing category relationships
-- This migration will update apps that have category_id but the category might not exist

-- First, let's see what categories we have and what apps need fixing
DO $$
DECLARE
    app_record RECORD;
    category_record RECORD;
    category_id uuid;
    category_name text;
BEGIN
    -- Loop through apps that have category_id but the category might be invalid
    FOR app_record IN 
        SELECT a.id, a.name, a.category_id, c.name as category_name
        FROM apps a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.category_id IS NOT NULL 
        AND c.id IS NULL  -- This means the category_id references a non-existent category
    LOOP
        RAISE NOTICE 'Found app "%" with invalid category_id: %', app_record.name, app_record.category_id;
        
        -- Try to find a matching category by app name or set to default
        -- For now, set to 'utilities' as default
        SELECT id INTO category_id 
        FROM categories 
        WHERE slug = 'utilities' 
        LIMIT 1;
        
        -- Update the app with the default category_id
        IF category_id IS NOT NULL THEN
            UPDATE apps 
            SET category_id = category_id
            WHERE id = app_record.id;
            
            RAISE NOTICE 'Updated app "%" with default category_id: %', 
                app_record.name, category_id;
        ELSE
            RAISE NOTICE 'Could not find default category for app "%"', 
                app_record.name;
        END IF;
    END LOOP;
    
    -- Also check for apps with NULL category_id and set them to default
    FOR app_record IN 
        SELECT id, name
        FROM apps 
        WHERE category_id IS NULL
    LOOP
        -- Set to 'utilities' as default
        SELECT id INTO category_id 
        FROM categories 
        WHERE slug = 'utilities' 
        LIMIT 1;
        
        -- Update the app with the default category_id
        IF category_id IS NOT NULL THEN
            UPDATE apps 
            SET category_id = category_id
            WHERE id = app_record.id;
            
            RAISE NOTICE 'Updated app "%" with default category_id: %', 
                app_record.name, category_id;
        ELSE
            RAISE NOTICE 'Could not find default category for app "%"', 
                app_record.name;
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
