-- =====================================================
-- 키워드 관리 모듈 통합 데이터베이스 스키마
-- =====================================================

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS keyword_management_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE keyword_management_db;

-- =====================================================
-- 공통 테이블
-- =====================================================

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_email (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 스마트플레이스 키워드 관리 테이블
-- =====================================================

-- 스마트플레이스 프로젝트
CREATE TABLE IF NOT EXISTS tracking_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  place_name VARCHAR(255) NOT NULL,
  place_id VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_place (user_id, place_id),
  INDEX idx_user (user_id),
  INDEX idx_place (place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스마트플레이스 키워드
CREATE TABLE IF NOT EXISTS tracking_keywords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  added_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES tracking_projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_keyword (project_id, keyword),
  INDEX idx_project (project_id),
  INDEX idx_keyword (keyword),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스마트플레이스 순위 결과
CREATE TABLE IF NOT EXISTS tracking_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  rank INT,
  overall_rank INT,
  check_date DATE NOT NULL,
  ranking_type ENUM('organic', 'ad', 'both') DEFAULT 'organic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES tracking_keywords(id) ON DELETE CASCADE,
  INDEX idx_check_date (check_date),
  INDEX idx_keyword_date (keyword_id, check_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스마트플레이스 순위 (신규 테이블)
CREATE TABLE IF NOT EXISTS tracking_rankings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  `rank` INT,
  overall_rank INT,
  check_date DATE NOT NULL,
  ranking_type VARCHAR(50) DEFAULT 'organic',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES tracking_keywords(id) ON DELETE CASCADE,
  UNIQUE KEY unique_keyword_date_type (keyword_id, check_date, ranking_type),
  INDEX idx_keyword (keyword_id),
  INDEX idx_date (check_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 스마트플레이스 스케줄
CREATE TABLE IF NOT EXISTS tracking_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  schedule_name VARCHAR(100),
  schedule_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES tracking_projects(id) ON DELETE CASCADE,
  INDEX idx_project (project_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 추적 세션
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  total_keywords INT NOT NULL,
  completed_keywords INT DEFAULT 0,
  status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 블로그 키워드 관리 테이블
-- =====================================================

-- 블로그 프로젝트
CREATE TABLE IF NOT EXISTS blog_tracking_projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  blog_url VARCHAR(500) NOT NULL,
  blog_name VARCHAR(255) NOT NULL,
  blog_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_tracked_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_blog_id (blog_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 블로그 키워드
CREATE TABLE IF NOT EXISTS blog_tracking_keywords (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  added_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES blog_tracking_projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_keyword (project_id, keyword),
  INDEX idx_project (project_id),
  INDEX idx_keyword (keyword),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 블로그 순위 결과
CREATE TABLE IF NOT EXISTS blog_tracking_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  keyword_id INT NOT NULL,
  main_tab_exposed BOOLEAN DEFAULT FALSE,
  main_tab_rank INT,
  blog_tab_rank INT,
  view_tab_rank INT,
  ad_rank INT,
  ranking_type VARCHAR(50) DEFAULT 'organic',
  tracking_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (keyword_id) REFERENCES blog_tracking_keywords(id) ON DELETE CASCADE,
  INDEX idx_tracking_date (tracking_date),
  INDEX idx_keyword_date (keyword_id, tracking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 블로그 스케줄
CREATE TABLE IF NOT EXISTS blog_tracking_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  schedule_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES blog_tracking_projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_project_schedule (project_id, schedule_time),
  INDEX idx_project (project_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 뷰 생성 (통합 조회용)
-- =====================================================

-- 중점키워드 통합 뷰
CREATE OR REPLACE VIEW unified_keywords AS
SELECT 
  'smartplace' as source,
  tk.keyword,
  tp.user_id,
  tk.added_date,
  tp.place_name as project_name,
  tp.place_id as project_id
FROM tracking_keywords tk
JOIN tracking_projects tp ON tk.project_id = tp.id
WHERE tk.is_active = TRUE

UNION ALL

SELECT 
  'blog' as source,
  bk.keyword,
  bp.user_id,
  bk.added_date,
  bp.blog_name as project_name,
  bp.blog_url as project_id
FROM blog_tracking_keywords bk
JOIN blog_tracking_projects bp ON bk.project_id = bp.id
WHERE bk.is_active = TRUE;

-- 최근 순위 통합 뷰
CREATE OR REPLACE VIEW recent_rankings AS
SELECT 
  'smartplace' as source,
  tk.keyword,
  tp.user_id,
  COALESCE(tr.rank, tr.overall_rank) as current_rank,
  tr.check_date as last_checked,
  tr.ranking_type
FROM tracking_keywords tk
JOIN tracking_projects tp ON tk.project_id = tp.id
LEFT JOIN tracking_rankings tr ON tk.id = tr.keyword_id
WHERE tk.is_active = TRUE
  AND tr.check_date = (
    SELECT MAX(check_date) 
    FROM tracking_rankings 
    WHERE keyword_id = tk.id
  )

UNION ALL

SELECT 
  'blog' as source,
  bk.keyword,
  bp.user_id,
  COALESCE(br.main_tab_rank, br.blog_tab_rank) as current_rank,
  br.tracking_date as last_checked,
  br.ranking_type
FROM blog_tracking_keywords bk
JOIN blog_tracking_projects bp ON bk.project_id = bp.id
LEFT JOIN blog_tracking_results br ON bk.id = br.keyword_id
WHERE bk.is_active = TRUE
  AND br.tracking_date = (
    SELECT MAX(tracking_date) 
    FROM blog_tracking_results 
    WHERE keyword_id = bk.id
  );

-- =====================================================
-- 초기 데이터 및 권한 설정
-- =====================================================

-- 기본 관리자 계정 생성 (비밀번호: admin123 - bcrypt 해시)
INSERT INTO users (email, password, name, role) VALUES 
('admin@example.com', '$2b$10$YourHashedPasswordHere', 'Admin', 'admin')
ON DUPLICATE KEY UPDATE id=id;

-- 테스트 사용자 생성 (비밀번호: test123)
INSERT INTO users (email, password, name, role) VALUES 
('test@example.com', '$2b$10$YourHashedPasswordHere', 'Test User', 'user')
ON DUPLICATE KEY UPDATE id=id;

-- =====================================================
-- 인덱스 최적화
-- =====================================================

-- 성능 향상을 위한 추가 인덱스
ALTER TABLE tracking_rankings ADD INDEX idx_check_date_rank (check_date, `rank`);
ALTER TABLE blog_tracking_results ADD INDEX idx_tracking_date_rank (tracking_date, main_tab_rank);

-- =====================================================
-- 프로시저 생성 (선택사항)
-- =====================================================

DELIMITER //

-- 오래된 데이터 정리 프로시저
CREATE PROCEDURE CleanupOldData(IN days_to_keep INT)
BEGIN
  -- 스마트플레이스 오래된 순위 삭제
  DELETE FROM tracking_rankings 
  WHERE check_date < DATE_SUB(CURDATE(), INTERVAL days_to_keep DAY);
  
  -- 블로그 오래된 순위 삭제
  DELETE FROM blog_tracking_results 
  WHERE tracking_date < DATE_SUB(CURDATE(), INTERVAL days_to_keep DAY);
  
  -- 오래된 세션 삭제
  DELETE FROM tracking_sessions 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
END//

-- 사용자별 키워드 통계
CREATE PROCEDURE GetUserKeywordStats(IN user_id INT)
BEGIN
  SELECT 
    (SELECT COUNT(*) FROM tracking_keywords tk 
     JOIN tracking_projects tp ON tk.project_id = tp.id 
     WHERE tp.user_id = user_id AND tk.is_active = TRUE) as smartplace_keywords,
    (SELECT COUNT(*) FROM blog_tracking_keywords bk 
     JOIN blog_tracking_projects bp ON bk.project_id = bp.id 
     WHERE bp.user_id = user_id AND bk.is_active = TRUE) as blog_keywords,
    (SELECT COUNT(*) FROM unified_keywords WHERE user_id = user_id) as total_keywords;
END//

DELIMITER ;

-- =====================================================
-- 권한 설정 (프로덕션용)
-- =====================================================

-- 애플리케이션 전용 사용자 생성
-- CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON keyword_management_db.* TO 'app_user'@'localhost';
-- FLUSH PRIVILEGES;