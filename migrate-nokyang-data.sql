-- Migrate nokyang user data to PostgreSQL

-- First update nokyang user with proper name
UPDATE users SET name = '녹양역학원' WHERE id = 16;

-- Insert SmartPlace data for nokyang
INSERT INTO smartplaces (id, user_id, place_id, place_name, address, phone, rating, review_count, category, created_at)
VALUES ('cmfc8o6b40001vi9gdjrlzaqh', 16, '1991227784', '미래엔영어수학 녹양역학원',
        '가금로34번길 23 힐스테이트녹양역 정문 왼쪽에 위치한 상가2층으로 오시면 됩니다.',
        '0507-1371-0592', NULL, NULL, '영어교육', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Blog Tracking Project for nokyang
INSERT INTO blog_tracking_projects (id, user_id, blog_url, blog_name, blog_id, created_at, updated_at)
VALUES (1, 16, 'https://blog.naver.com/dlqhfka8832',
        '가능 녹양 초중등전문 미래엔영어수학 녹양역학원', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert some sample keywords for testing
INSERT INTO blog_tracking_keywords (project_id, keyword, is_active, added_date, created_at, updated_at)
VALUES
  (1, '녹양역학원', true, NOW(), NOW(), NOW()),
  (1, '녹양역영어학원', true, NOW(), NOW(), NOW()),
  (1, '가능동영어학원', true, NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Insert some sample keywords for smartplace
INSERT INTO smartplace_keywords (id, user_id, smartplace_id, keyword, is_active, created_at)
VALUES
  ('clk001', 16, 'cmfc8o6b40001vi9gdjrlzaqh', '녹양역학원', true, NOW()),
  ('clk002', 16, 'cmfc8o6b40001vi9gdjrlzaqh', '녹양역영어학원', true, NOW()),
  ('clk003', 16, 'cmfc8o6b40001vi9gdjrlzaqh', '가능동영어학원', true, NOW())
ON CONFLICT DO NOTHING;

-- Update sequences
SELECT setval(pg_get_serial_sequence('blog_tracking_projects', 'id'), (SELECT COALESCE(MAX(id), 1) FROM blog_tracking_projects));
SELECT setval(pg_get_serial_sequence('blog_tracking_keywords', 'id'), (SELECT COALESCE(MAX(id), 1) FROM blog_tracking_keywords));

-- Verify data
SELECT 'Users:' as table_name, COUNT(*) as count FROM users WHERE id = 16
UNION ALL
SELECT 'SmartPlaces:', COUNT(*) FROM smartplaces WHERE user_id = 16
UNION ALL
SELECT 'Blog Projects:', COUNT(*) FROM blog_tracking_projects WHERE user_id = 16
UNION ALL
SELECT 'Blog Keywords:', COUNT(*) FROM blog_tracking_keywords WHERE project_id = 1
UNION ALL
SELECT 'SmartPlace Keywords:', COUNT(*) FROM smartplace_keywords WHERE user_id = 16;