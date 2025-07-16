-- Debug script to check app update issue

-- Check the current app data
SELECT id, name, category_id FROM apps WHERE id = '8b02689e-3672-4c18-bf48-154bf3f3364c';

-- Check if the category exists
SELECT id, name FROM categories WHERE id = '9f5985ad-9128-4cbc-9491-6f534e271194';

-- Check the data type of category_id column
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'apps' AND column_name = 'category_id';

-- Try a manual update to see if it works
UPDATE apps 
SET category_id = '9f5985ad-9128-4cbc-9491-6f534e271194'
WHERE id = '8b02689e-3672-4c18-bf48-154bf3f3364c';

-- Check if the update worked
SELECT id, name, category_id FROM apps WHERE id = '8b02689e-3672-4c18-bf48-154bf3f3364c';

-- Check foreign key constraints
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