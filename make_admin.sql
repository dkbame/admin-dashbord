-- Script to make the current user an admin
-- This will add admin role for the first registered user

INSERT INTO admin_roles (user_id, role)
SELECT 
    au.id as user_id,
    'admin' as role
FROM auth.users au
WHERE au.id = (
    SELECT id FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1
)
AND NOT EXISTS (
    SELECT 1 FROM admin_roles ar 
    WHERE ar.user_id = au.id
);

-- Show the result
SELECT 
    au.email,
    ar.role,
    au.created_at
FROM auth.users au
LEFT JOIN admin_roles ar ON au.id = ar.user_id
ORDER BY au.created_at ASC; 