-- AWS RDS PostgreSQL 계정 조회 SQL 쿼리

-- ================================
-- 1. 전체 계정 목록 조회
-- ================================
SELECT
    id,
    email,
    name,
    role,
    plan,
    academy_name,
    coin,
    is_active,
    is_approved,
    kt_pass_verified,
    created_at
FROM users
ORDER BY role, created_at DESC;

-- ================================
-- 2. 역할별 계정 수 통계
-- ================================
SELECT
    role,
    COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- ================================
-- 3. 플랜별 계정 수 통계
-- ================================
SELECT
    plan,
    COUNT(*) as count
FROM users
GROUP BY plan
ORDER BY plan;

-- ================================
-- 4. 테스트 계정만 조회
-- ================================
SELECT
    id,
    email,
    name,
    role,
    plan,
    coin
FROM users
WHERE email LIKE '%@test.aws.com'
ORDER BY role;

-- ================================
-- 5. 관리자 계정 조회
-- ================================
SELECT
    id,
    email,
    name,
    created_at
FROM users
WHERE role = 'admin'
ORDER BY created_at;

-- ================================
-- 6. 학원 계정 조회 (승인된 계정)
-- ================================
SELECT
    id,
    email,
    name,
    academy_name,
    academy_address,
    is_approved,
    kt_pass_verified,
    coin
FROM users
WHERE role = 'academy' AND is_approved = true
ORDER BY academy_name;

-- ================================
-- 7. 최근 7일 내 가입한 계정
-- ================================
SELECT
    id,
    email,
    name,
    role,
    created_at
FROM users
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ================================
-- 8. 활성/비활성 계정 통계
-- ================================
SELECT
    is_active,
    COUNT(*) as count
FROM users
GROUP BY is_active;

-- ================================
-- 9. 승인 상태별 통계
-- ================================
SELECT
    is_approved,
    COUNT(*) as count
FROM users
GROUP BY is_approved;

-- ================================
-- 10. 코인 보유량 TOP 10
-- ================================
SELECT
    id,
    email,
    name,
    role,
    coin
FROM users
ORDER BY coin DESC
LIMIT 10;

-- ================================
-- 11. 대행사/지사 계정 조회
-- ================================
SELECT
    id,
    email,
    name,
    role,
    coin,
    is_approved
FROM users
WHERE role IN ('agency', 'branch')
ORDER BY role, name;

-- ================================
-- 12. 전체 계정 요약 통계
-- ================================
SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN role = 'agency' THEN 1 END) as agency_count,
    COUNT(CASE WHEN role = 'branch' THEN 1 END) as branch_count,
    COUNT(CASE WHEN role = 'academy' THEN 1 END) as academy_count,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as user_count,
    COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_count,
    COUNT(CASE WHEN kt_pass_verified = true THEN 1 END) as kt_verified_count,
    SUM(coin) as total_coins
FROM users;