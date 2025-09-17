-- MarketingPlat AWS RDS 테스트 계정 생성 SQL
-- 비밀번호는 bcrypt로 해시된 값 사용 (원본: test1234)
-- $2a$10$... 형식의 bcrypt 해시

-- 1. 관리자 계정 (Admin)
INSERT INTO users (
    email,
    password,
    name,
    phone,
    role,
    plan,
    is_active,
    academy_name,
    coin,
    is_approved,
    kt_pass_verified,
    created_at,
    updated_at
) VALUES (
    'admin@test.aws.com',
    '$2a$10$YKvIT5v2Y2FKb3ht1KFkT.DyWvtHF4HZ2wz.u7VQw3s.QrRZYHtae', -- test1234
    '테스트 관리자',
    '010-1111-1111',
    'admin',
    'enterprise',
    true,
    'MarketingPlat 관리',
    10000.00,
    true,
    true,
    NOW(),
    NOW()
);

-- 2. 대행사 계정 (Agency)
INSERT INTO users (
    email,
    password,
    name,
    phone,
    role,
    plan,
    is_active,
    academy_name,
    coin,
    is_approved,
    kt_pass_verified,
    created_at,
    updated_at
) VALUES (
    'agency@test.aws.com',
    '$2a$10$YKvIT5v2Y2FKb3ht1KFkT.DyWvtHF4HZ2wz.u7VQw3s.QrRZYHtae', -- test1234
    '테스트 대행사',
    '010-2222-2222',
    'agency',
    'enterprise',
    true,
    '마케팅프로 대행사',
    5000.00,
    true,
    true,
    NOW(),
    NOW()
);

-- 3. 지사 계정 (Branch)
INSERT INTO users (
    email,
    password,
    name,
    phone,
    role,
    plan,
    is_active,
    academy_name,
    coin,
    is_approved,
    kt_pass_verified,
    created_at,
    updated_at
) VALUES (
    'branch@test.aws.com',
    '$2a$10$YKvIT5v2Y2FKb3ht1KFkT.DyWvtHF4HZ2wz.u7VQw3s.QrRZYHtae', -- test1234
    '테스트 지사',
    '010-3333-3333',
    'branch',
    'professional',
    true,
    '서울 강남지사',
    3000.00,
    true,
    true,
    NOW(),
    NOW()
);

-- 4. 학원 계정 (Academy)
INSERT INTO users (
    email,
    password,
    name,
    phone,
    role,
    plan,
    is_active,
    academy_name,
    academy_address,
    coin,
    is_approved,
    kt_pass_verified,
    created_at,
    updated_at
) VALUES (
    'academy@test.aws.com',
    '$2a$10$YKvIT5v2Y2FKb3ht1KFkT.DyWvtHF4HZ2wz.u7VQw3s.QrRZYHtae', -- test1234
    '테스트 학원장',
    '010-4444-4444',
    'academy',
    'professional',
    true,
    '테스트 영어학원',
    '서울시 강남구 테헤란로 123',
    1000.00,
    true,
    false,
    NOW(),
    NOW()
);

-- 5. 일반회원 계정 (User)
INSERT INTO users (
    email,
    password,
    name,
    phone,
    role,
    plan,
    is_active,
    coin,
    is_approved,
    kt_pass_verified,
    created_at,
    updated_at
) VALUES (
    'user@test.aws.com',
    '$2a$10$YKvIT5v2Y2FKb3ht1KFkT.DyWvtHF4HZ2wz.u7VQw3s.QrRZYHtae', -- test1234
    '테스트 사용자',
    '010-5555-5555',
    'user',
    'basic',
    true,
    100.00,
    false,
    false,
    NOW(),
    NOW()
);

-- 생성된 계정 확인
SELECT id, email, name, role, plan, coin, is_approved, kt_pass_verified
FROM users
WHERE email LIKE '%@test.aws.com'
ORDER BY id;