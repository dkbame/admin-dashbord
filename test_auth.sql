-- Test to verify authentication and permissions
-- Check current user
SELECT current_user, session_user;

-- Check if we can insert a test app (this should work for authenticated users)
INSERT INTO apps (name, developer, description, price, is_on_mas, status, source)
VALUES ('Test App', 'Test Developer', 'Test Description', 0.00, false, 'ACTIVE', 'CUSTOM')
ON CONFLICT DO NOTHING;

-- Show the test app
SELECT id, name, developer, status FROM apps WHERE name = 'Test App';

-- Clean up test data
DELETE FROM apps WHERE name = 'Test App'; 