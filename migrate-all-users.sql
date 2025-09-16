-- Migrate all remaining users from SQLite
-- These are the users found in SQLite

-- Insert remaining users
INSERT INTO users (id, email, password, name, role, created_at, updated_at)
VALUES
  (2, 'academy@marketingplat.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'academy', 'USER', NOW(), NOW()),
  (3, 'user@test.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'Test User', 'USER', NOW(), NOW()),
  (8, 'shin@shin.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'shin', 'USER', NOW(), NOW()),
  (11, 'ai@test.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'AI Test', 'USER', NOW(), NOW()),
  (12, 'kakao@example.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'Kakao User', 'USER', NOW(), NOW()),
  (14, 'kakao@me.com', '$2a$10$Q5.GMZFH2Egh5dN6zr8x5.uOLhQ0jgxXZNy5C9MKqEqh1dPjGKzRa', 'kakao', 'USER', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert remaining blog projects
INSERT INTO blog_tracking_projects (id, user_id, blog_url, blog_name, created_at, updated_at)
VALUES
  (2, 8, 'https://blog.naver.com/test1', 'Test Blog 1', NOW(), NOW()),
  (3, 8, 'https://blog.naver.com/test2', 'Test Blog 2', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert remaining smartplaces
INSERT INTO smartplaces (id, user_id, place_id, place_name, created_at)
VALUES
  ('clk8888001', 8, 'place_8_1', 'Test Place 1', NOW()),
  ('clk8888002', 8, 'place_8_2', 'Test Place 2', NOW())
ON CONFLICT (id) DO NOTHING;

-- Update sequences
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval(pg_get_serial_sequence('blog_tracking_projects', 'id'), (SELECT COALESCE(MAX(id), 1) FROM blog_tracking_projects));

-- Final verification
SELECT 'Total Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Total Blog Projects:', COUNT(*) FROM blog_tracking_projects
UNION ALL
SELECT 'Total SmartPlaces:', COUNT(*) FROM smartplaces
UNION ALL
SELECT 'Nokyang Data Check:', COUNT(*) FROM blog_tracking_projects WHERE user_id = 16;