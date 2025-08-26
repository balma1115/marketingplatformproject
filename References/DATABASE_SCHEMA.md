# MarketingPlat 데이터베이스 스키마

## 데이터베이스 개요
- **DBMS**: MySQL 8.0
- **Character Set**: utf8mb4
- **Collation**: utf8mb4_unicode_ci
- **Engine**: InnoDB (Foreign Key 지원)

## 전체 테이블 구조 및 관계

### 1. 사용자 및 인증 관련 테이블

#### users (사용자)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    branch_name VARCHAR(255),
    role ENUM('user', 'admin', 'agency', 'branch') DEFAULT 'user',
    coin DECIMAL(10,2) DEFAULT 100.00,        -- 냥 코인 잔액
    used_coin DECIMAL(10,2) DEFAULT 0.00,     -- 사용한 냥
    purchased_coin DECIMAL(10,2) DEFAULT 0.00, -- 구매한 냥
    subject VARCHAR(50),                       -- 허용 과목
    branch_id INT,                            -- 지사 ID
    academy_id INT,                           -- 학원 ID
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_branch_academy (branch_id, academy_id)
);
```

#### user_sessions (사용자 세션)
```sql
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id)
);
```

### 2. 조직 구조 관련 테이블

#### subjects (과목)
```sql
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,    -- 미래엔영어, 미래엔수학, 미래엔독서
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### branches (지사)
```sql
CREATE TABLE branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);
```

#### academies (학원)
```sql
CREATE TABLE academies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    join_code VARCHAR(8) UNIQUE NOT NULL,  -- 8자리 가입 코드
    address TEXT,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

### 3. AI 및 콘텐츠 관련 테이블

#### blog_titles (블로그 제목)
```sql
CREATE TABLE blog_titles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(500) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    keywords JSON,
    tf_idf_scores JSON,
    topic_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_generated_at (generated_at)
);
```

#### keyword_analytics (키워드 분석 통계)
```sql
CREATE TABLE keyword_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword VARCHAR(100) NOT NULL,
    frequency INT DEFAULT 0,
    tf_idf_avg DECIMAL(5,4),
    first_seen DATE,
    last_seen DATE,
    trend_score DECIMAL(5,2),
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_keyword (keyword),
    INDEX idx_keyword (keyword),
    INDEX idx_frequency (frequency DESC),
    INDEX idx_trend_score (trend_score DESC)
);
```

#### focus_keywords (중점 키워드)
```sql
CREATE TABLE focus_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_keyword (user_id, keyword),
    INDEX idx_focus_keywords_user_id (user_id)
);
```

### 4. 블로그 추적 관련 테이블

#### blog_tracking_projects (블로그 추적 프로젝트)
```sql
CREATE TABLE blog_tracking_projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    target_blog_url VARCHAR(500),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);
```

#### blog_tracking_keywords (블로그 추적 키워드)
```sql
CREATE TABLE blog_tracking_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    location VARCHAR(100) DEFAULT '전국',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES blog_tracking_projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id)
);
```

#### blog_tracking_results (블로그 추적 결과)
```sql
CREATE TABLE blog_tracking_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword_id INT NOT NULL,
    check_date DATE NOT NULL,
    ranking_position INT,
    blog_url VARCHAR(500),
    blog_title VARCHAR(500),
    found_in_results BOOLEAN DEFAULT FALSE,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (keyword_id) REFERENCES blog_tracking_keywords(id) ON DELETE CASCADE,
    INDEX idx_keyword_date (keyword_id, check_date),
    INDEX idx_ranking_position (ranking_position)
);
```

### 5. 스마트플레이스 관련 테이블

#### smartplace_tracking_projects (스마트플레이스 추적 프로젝트)
```sql
CREATE TABLE smartplace_tracking_projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    place_id VARCHAR(100),
    place_name VARCHAR(255),
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### smartplace_tracking_keywords (스마트플레이스 키워드)
```sql
CREATE TABLE smartplace_tracking_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    location VARCHAR(100) DEFAULT '전국',
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (project_id) REFERENCES smartplace_tracking_projects(id) ON DELETE CASCADE
);
```

#### smartplace_ranking_results (순위 결과)
```sql
CREATE TABLE smartplace_ranking_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword_id INT NOT NULL,
    check_date DATE NOT NULL,
    ranking_position INT,
    found_in_results BOOLEAN DEFAULT FALSE,
    ranking_type ENUM('organic', 'ad', 'both') DEFAULT 'organic',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (keyword_id) REFERENCES smartplace_tracking_keywords(id) ON DELETE CASCADE,
    INDEX idx_keyword_date (keyword_id, check_date)
);
```

### 6. 광고 관리 관련 테이블

#### advertisers (광고주)
```sql
CREATE TABLE advertisers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT,
    branch_id INT,
    advertiser_type ENUM('academy', 'branch') NOT NULL,
    name VARCHAR(255) NOT NULL,
    business_number VARCHAR(20),
    naver_customer_id VARCHAR(50),
    naver_api_key VARCHAR(255),
    naver_secret_key VARCHAR(255),
    status ENUM('active', 'paused', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);
```

#### campaigns (캠페인)
```sql
CREATE TABLE campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    advertiser_id INT NOT NULL,
    naver_campaign_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    campaign_type ENUM('power_link', 'shopping', 'place', 'power_contents', 'brand_search') NOT NULL,
    daily_budget DECIMAL(12,2) DEFAULT 0,
    bid_strategy ENUM('manual_cpc', 'auto_bid', 'maximize_clicks', 'target_cpa') DEFAULT 'manual_cpc',
    status ENUM('enabled', 'paused', 'deleted', 'pending') DEFAULT 'pending',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (advertiser_id) REFERENCES advertisers(id) ON DELETE CASCADE
);
```

#### ad_groups (광고그룹)
```sql
CREATE TABLE ad_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    campaign_id INT NOT NULL,
    naver_adgroup_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    device_type ENUM('all', 'pc', 'mobile') DEFAULT 'all',
    bid_amount DECIMAL(10,2) DEFAULT 70,
    status ENUM('enabled', 'paused', 'deleted') DEFAULT 'enabled',
    
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
```

#### ad_keywords (광고 키워드)
```sql
CREATE TABLE ad_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ad_group_id INT NOT NULL,
    naver_keyword_id VARCHAR(50),
    keyword VARCHAR(255) NOT NULL,
    match_type ENUM('exact', 'phrase', 'broad') DEFAULT 'broad',
    bid_amount DECIMAL(10,2) DEFAULT 70,
    landing_url TEXT,
    status ENUM('enabled', 'paused', 'deleted', 'low_search_volume', 'under_review') DEFAULT 'enabled',
    quality_score INT DEFAULT 5,
    
    FOREIGN KEY (ad_group_id) REFERENCES ad_groups(id) ON DELETE CASCADE
);
```

#### ad_performance_daily (일별 성과)
```sql
CREATE TABLE ad_performance_daily (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity_type ENUM('campaign', 'adgroup', 'keyword', 'ad') NOT NULL,
    entity_id INT NOT NULL,
    date DATE NOT NULL,
    impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    cost DECIMAL(12,2) DEFAULT 0,
    conversions INT DEFAULT 0,
    conversion_value DECIMAL(12,2) DEFAULT 0,
    ctr DECIMAL(5,4) DEFAULT 0,
    cpc DECIMAL(10,2) DEFAULT 0,
    cpa DECIMAL(10,2) DEFAULT 0,
    roas DECIMAL(5,2) DEFAULT 0,
    position DECIMAL(3,1) DEFAULT 0,
    quality_score INT DEFAULT 0,
    
    UNIQUE KEY unique_entity_date (entity_type, entity_id, date),
    INDEX idx_date (date),
    INDEX idx_entity (entity_type, entity_id)
);
```

### 7. 콘텐츠 관리 테이블

#### magazine_articles (매거진 기사)
```sql
CREATE TABLE magazine_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content LONGTEXT NOT NULL,
    thumbnail_url VARCHAR(500),
    author_id INT,
    author_name VARCHAR(100),
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    view_count INT DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_status_published (status, published_at)
);
```

#### banners (배너)
```sql
CREATE TABLE banners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255),
    description TEXT,
    image_url VARCHAR(500),
    link VARCHAR(500),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_banners_active_order (is_active, display_order)
);
```

### 8. 사용량 추적 테이블

#### api_usage_logs (API 사용 로그)
```sql
CREATE TABLE api_usage_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    service_type ENUM('ai_writing', 'image_generation', 'keyword_analysis', 'blog_tracking') NOT NULL,
    api_endpoint VARCHAR(255),
    tokens_used INT DEFAULT 0,
    cost_in_nyang DECIMAL(10,2) DEFAULT 0,
    request_data JSON,
    response_status INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_service (user_id, service_type),
    INDEX idx_created_at (created_at)
);
```

#### attendance_logs (출석 로그)
```sql
CREATE TABLE attendance_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    total_hours DECIMAL(4,2),
    status ENUM('present', 'absent', 'late', 'half_day') DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, attendance_date)
);
```

## 주요 관계 및 제약조건

### Foreign Key 관계
1. **users → academy/branch**: 계층적 조직 구조
2. **blog_tracking_projects → users**: 사용자별 프로젝트 관리
3. **keywords → projects**: 프로젝트별 키워드 관리
4. **results → keywords**: 키워드별 결과 추적
5. **advertisers → academies/branches**: 광고주와 조직 연결
6. **campaigns → advertisers**: 캠페인과 광고주 연결
7. **ad_groups → campaigns**: 광고그룹과 캠페인 연결
8. **ad_keywords → ad_groups**: 키워드와 광고그룹 연결

### 인덱스 전략
- **복합 인덱스**: 자주 함께 조회되는 컬럼들 (user_id, created_at)
- **단일 인덱스**: 검색 조건으로 자주 사용되는 컬럼들
- **UNIQUE 제약**: 중복 방지가 필요한 컬럼들

### 데이터 무결성
- **CASCADE DELETE**: 상위 엔티티 삭제 시 하위 데이터도 함께 삭제
- **SET NULL**: 참조하는 데이터가 삭제되면 NULL로 설정
- **ENUM 제약**: 허용된 값만 입력 가능

## 성능 최적화 고려사항

### 1. 파티셔닝
```sql
-- 날짜 기반 파티셔닝 (대량 로그 테이블용)
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### 2. 정기적 데이터 정리
- 90일 이상 된 로그 데이터 아카이빙
- 삭제된 사용자 데이터 정리
- 비활성 프로젝트 데이터 정리

### 3. 쿼리 최적화
- SELECT 시 필요한 컬럼만 조회
- JOIN 대신 EXISTS 사용 고려
- 복합 인덱스 활용

### 4. 연결 풀 관리
```javascript
const dbConfig = {
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};
```

## 백업 및 복구 전략

### 1. 정기 백업
- 매일 전체 데이터베이스 백업
- 시간별 트랜잭션 로그 백업
- 주요 테이블별 별도 백업

### 2. 복구 시나리오
- Point-in-time Recovery
- 테이블 단위 복구
- 사용자별 데이터 복구

### 3. 데이터 검증
```sql
-- 데이터 무결성 검증 쿼리 예시
SELECT COUNT(*) FROM users WHERE academy_id NOT IN (SELECT id FROM academies);
SELECT COUNT(*) FROM blog_tracking_results WHERE keyword_id NOT IN (SELECT id FROM blog_tracking_keywords);
```

이 스키마는 마케팅플랫의 모든 기능을 지원하며, 확장 가능하고 유지보수하기 쉬운 구조로 설계되었습니다.