-- Test script to verify DELETE operations work
-- Run this in Supabase SQL editor to test

-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('apps', 'screenshots', 'custom_metadata', 'ratings');

-- 2. Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('apps', 'screenshots', 'custom_metadata', 'ratings')
ORDER BY tablename, policyname;

-- 3. Test a simple delete (replace with actual app ID)
-- DELETE FROM apps WHERE id = 'your-app-id-here';

-- 4. Check if there are any triggers that might interfere
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('apps', 'screenshots', 'custom_metadata', 'ratings'); 