-- Simple data insertion for PostgreSQL
-- Insert test users (nokyang account is most important)

-- Insert nokyang user (ID 16)
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (16, 'nokyang@marketingplat.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'nokyang', 'USER', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert admin user
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES (1, 'admin@marketingplat.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'Admin', 'ADMIN', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Update sequence
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));

-- Check users
SELECT id, email, name, role FROM users;