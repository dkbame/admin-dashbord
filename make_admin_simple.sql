-- Make the most recent user an admin
INSERT INTO admin_roles (user_id, role)
SELECT 
    au.id as user_id,
    'admin' as role
FROM auth.users au
WHERE au.id = (
    SELECT id FROM auth.users 
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Show all users and their admin status
SELECT 
    au.email,
    CASE WHEN ar.role IS NOT NULL THEN ar.role ELSE 'user' END as role,
    au.created_at
FROM auth.users au
LEFT JOIN admin_roles ar ON au.id = ar.user_id
ORDER BY au.created_at DESC; 