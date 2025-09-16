-- Update passwords for test accounts according to CLAUDE.md

-- admin@marketingplat.com / admin123
UPDATE users SET password = '$2b$10$eJ9.xzZvM2K8A7HVKF/GNuHtpT5bY4k8wIxgKqYVYQzxYsBhxn2Im'
WHERE email = 'admin@marketingplat.com';

-- academy@marketingplat.com / academy123
UPDATE users SET password = '$2b$10$KqEhCQOJYvVnPWs1cZrMXe3vD0zpHxSxoYTZvLnY8qT5BbJ8OxYDe'
WHERE email = 'academy@marketingplat.com';

-- nokyang@marketingplat.com / nokyang123 (already updated)
-- Already done

-- user@test.com / test1234
UPDATE users SET password = '$2b$10$5k.YpKVB4EKQx6nLz.c6JeHkqGHCCKxZOZhYXJbQMWvIdqRqGPIX6'
WHERE email = 'user@test.com';