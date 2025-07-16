-- Debug script to check category and app data

-- Check if the category ID exists
SELECT id, name, slug FROM categories WHERE id = '9f5985ad-9128-4cbc-9491-6f534e271194';

-- Check the current app data
SELECT id, name, category_id FROM apps WHERE id = '8b02689e-3672-4c18-bf48-154bf3f3364c';

-- List all categories to see what's available
SELECT id, name, slug FROM categories ORDER BY name;

-- Check if there are any foreign key constraints on the apps table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='apps'; 