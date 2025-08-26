-- 블로그 제목 저장 테이블
CREATE TABLE IF NOT EXISTS blog_titles (
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
    INDEX idx_generated_at (generated_at),
    INDEX idx_topic_id (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 키워드 분석 통계 테이블
CREATE TABLE IF NOT EXISTS keyword_analytics (
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
    INDEX idx_trend_score (trend_score DESC),
    INDEX idx_last_seen (last_seen DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 토픽 모델링 결과 테이블
CREATE TABLE IF NOT EXISTS topics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    topic_name VARCHAR(100),
    topic_words JSON COMMENT 'Top words for this topic',
    topic_weight DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자별 키워드 사용 이력
CREATE TABLE IF NOT EXISTS user_keyword_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    keyword VARCHAR(100),
    usage_count INT DEFAULT 1,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_keyword (user_id, keyword),
    INDEX idx_last_used (last_used DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 키워드 트렌드 시계열 데이터
CREATE TABLE IF NOT EXISTS keyword_trends (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword VARCHAR(100),
    trend_date DATE,
    daily_frequency INT DEFAULT 0,
    weekly_avg DECIMAL(10,2),
    monthly_avg DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_keyword_date (keyword, trend_date),
    INDEX idx_trend_date (trend_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
