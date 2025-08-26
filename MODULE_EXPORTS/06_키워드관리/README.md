# 06_키워드관리 모듈

## 개요
핵심 키워드 관리 및 개인 블로그 키워드 추적 기능을 제공하는 모듈입니다.

## 주요 기능
- 핵심 키워드 설정 및 관리
- 개인 블로그 키워드 추적
- 키워드별 성과 분석
- 키워드 그룹 관리
- 자동 키워드 제안

## 기술 스택

### Frontend
- React 18 with TypeScript
- Drag & Drop 키워드 관리
- Real-time keyword tracking
- Custom dashboard components

### Backend
- Node.js with Express
- Automated keyword tracking
- Performance analytics
- Keyword grouping algorithms

## 프로젝트 구조

```
06_키워드관리/
├── frontend/
│   ├── components/
│   │   ├── KeywordGroupManager.tsx
│   │   ├── KeywordPerformanceChart.tsx
│   │   └── DragDropKeywordList.tsx
│   ├── pages/
│   │   ├── FocusKeywords.tsx
│   │   ├── FocusKeywordUnified.tsx
│   │   ├── MyBlogKeywordTracking.tsx
│   │   └── FocusKeywordList.tsx
│   └── styles/
│       ├── FocusKeywords.css
│       ├── KeywordManagement.css
│       └── MyBlogTracking.css
├── backend/
│   ├── routes/
│   │   ├── focus-keywords.routes.ts
│   │   ├── focus-keywords-unified.routes.ts
│   │   ├── my-blog.routes.ts
│   │   └── core-keywords.routes.ts
│   ├── services/
│   │   ├── focusKeywordService.ts
│   │   ├── keywordGroupingService.ts
│   │   ├── myBlogTrackingService.ts
│   │   └── keywordPerformanceAnalyzer.ts
│   └── config/
│       └── keyword-categories.json
└── database/
    └── keyword_management_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom @dnd-kit/core @dnd-kit/sortable react-beautiful-dnd

# Backend 의존성
npm install lodash uuid natural
```

### 환경 변수
```env
# 키워드 관리 설정
MAX_FOCUS_KEYWORDS=50
KEYWORD_TRACKING_INTERVAL=daily
AUTO_SUGGESTION_ENABLED=true

# 성능 분석 설정
PERFORMANCE_ANALYSIS_PERIOD=30
MIN_TRACKING_DAYS=7
```

## API 엔드포인트

### 핵심 키워드 관리
```http
GET /api/focus-keywords
POST /api/focus-keywords
PUT /api/focus-keywords/:id
DELETE /api/focus-keywords/:id
```

### 키워드 그룹 관리
```http
GET /api/focus-keywords/groups
POST /api/focus-keywords/groups
PUT /api/focus-keywords/groups/:id/keywords
```

### 개인 블로그 추적
```http
GET /api/my-blog/tracking
POST /api/my-blog/tracking/start
PUT /api/my-blog/tracking/:id/pause
DELETE /api/my-blog/tracking/:id
```

### 키워드 성과 분석
```http
GET /api/focus-keywords/performance
?period=30days&groupId=123&metrics=ranking,traffic
```

## 데이터베이스 스키마

### focus_keywords 테이블
```sql
CREATE TABLE focus_keywords (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    group_id INT,
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    target_ranking INT DEFAULT 10,
    current_ranking INT,
    search_volume INT,
    difficulty_score DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES keyword_groups(id),
    INDEX idx_user_keyword (user_id, keyword)
);
```

### keyword_groups 테이블
```sql
CREATE TABLE keyword_groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#4A90E2',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_user_group (user_id, group_name)
);
```

### my_blog_tracking 테이블
```sql
CREATE TABLE my_blog_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    blog_url VARCHAR(500) NOT NULL,
    keyword_id INT NOT NULL,
    current_ranking INT,
    previous_ranking INT,
    best_ranking INT,
    worst_ranking INT,
    ranking_history JSON,
    last_checked TIMESTAMP,
    tracking_status ENUM('active', 'paused', 'stopped') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (keyword_id) REFERENCES focus_keywords(id)
);
```

### keyword_performance_metrics 테이블
```sql
CREATE TABLE keyword_performance_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword_id INT NOT NULL,
    metric_date DATE NOT NULL,
    ranking_position INT,
    search_volume INT,
    click_through_rate DECIMAL(5,2),
    impressions INT,
    clicks INT,
    average_position DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (keyword_id) REFERENCES focus_keywords(id),
    UNIQUE KEY unique_keyword_date (keyword_id, metric_date)
);
```

## 사용 방법

### 1. 핵심 키워드 설정
```typescript
// 핵심 키워드 등록
const addFocusKeyword = async (keywordData: FocusKeywordData) => {
  const response = await api.post('/focus-keywords', {
    keyword: keywordData.keyword,
    groupId: keywordData.groupId,
    priority: keywordData.priority,
    targetRanking: keywordData.targetRanking,
    notes: keywordData.notes
  });
  
  return response.data;
};

// 키워드 그룹 생성
const createKeywordGroup = async (groupName: string, color: string) => {
  return await api.post('/focus-keywords/groups', {
    groupName,
    description: `${groupName} 관련 키워드`,
    color
  });
};
```

### 2. 드래그 앤 드롭 키워드 관리
```typescript
// React Beautiful DnD 구현
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const KeywordManager: React.FC = () => {
  const [keywords, setKeywords] = useState<FocusKeyword[]>([]);
  
  const handleOnDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(keywords);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setKeywords(items);
    
    // 서버에 순서 업데이트
    await api.put('/focus-keywords/reorder', {
      keywordIds: items.map(item => item.id)
    });
  };
  
  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="keywords">
        {(provided) => (
          <ul {...provided.droppableProps} ref={provided.innerRef}>
            {keywords.map((keyword, index) => (
              <Draggable key={keyword.id} draggableId={keyword.id.toString()} index={index}>
                {(provided) => (
                  <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                    <KeywordItem keyword={keyword} />
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
};
```

### 3. 개인 블로그 추적 설정
```typescript
// 블로그 키워드 추적 시작
const startBlogTracking = async (blogUrl: string, keywordIds: number[]) => {
  const trackingConfigs = keywordIds.map(keywordId => ({
    blogUrl,
    keywordId,
    trackingInterval: 'daily'
  }));
  
  const results = await Promise.all(
    trackingConfigs.map(config => 
      api.post('/my-blog/tracking/start', config)
    )
  );
  
  return results;
};
```

## 키워드 성과 분석

### 성과 지표 계산
```typescript
class KeywordPerformanceAnalyzer {
  calculatePerformanceMetrics(keywordData: KeywordMetrics[]): PerformanceAnalysis {
    const sortedData = keywordData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return {
      rankingTrend: this.calculateRankingTrend(sortedData),
      averageRanking: this.calculateAverageRanking(sortedData),
      rankingVolatility: this.calculateVolatility(sortedData),
      improvementRate: this.calculateImprovementRate(sortedData),
      bestPerformingPeriod: this.findBestPeriod(sortedData)
    };
  }
  
  private calculateRankingTrend(data: KeywordMetrics[]): TrendAnalysis {
    if (data.length < 7) return { trend: 'insufficient_data' };
    
    const recentWeek = data.slice(-7);
    const previousWeek = data.slice(-14, -7);
    
    const recentAvg = recentWeek.reduce((sum, d) => sum + d.ranking, 0) / recentWeek.length;
    const previousAvg = previousWeek.reduce((sum, d) => sum + d.ranking, 0) / previousWeek.length;
    
    const change = previousAvg - recentAvg; // 순위는 낮을수록 좋음
    
    return {
      trend: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
      changeValue: change,
      weeklyImprovement: change > 0
    };
  }
  
  private calculateVolatility(data: KeywordMetrics[]): number {
    if (data.length < 2) return 0;
    
    const rankings = data.map(d => d.ranking);
    const mean = rankings.reduce((sum, r) => sum + r, 0) / rankings.length;
    const variance = rankings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rankings.length;
    
    return Math.sqrt(variance);
  }
}
```

### 키워드 제안 알고리즘
```typescript
class KeywordSuggestionService {
  async generateKeywordSuggestions(currentKeywords: string[], category: string): Promise<KeywordSuggestion[]> {
    // 1. 기존 키워드 분석
    const keywordAnalysis = await this.analyzeCurrentKeywords(currentKeywords);
    
    // 2. 유사 키워드 생성
    const similarKeywords = await this.findSimilarKeywords(currentKeywords);
    
    // 3. 카테고리 기반 제안
    const categoryKeywords = await this.getCategoryKeywords(category);
    
    // 4. 롱테일 키워드 생성
    const longTailKeywords = await this.generateLongTailKeywords(currentKeywords);
    
    // 5. 점수 기반 정렬
    const allSuggestions = [
      ...similarKeywords,
      ...categoryKeywords,
      ...longTailKeywords
    ];
    
    return this.scoreAndSortSuggestions(allSuggestions, keywordAnalysis);
  }
  
  private async scoreAndSortSuggestions(
    suggestions: KeywordSuggestion[], 
    analysis: KeywordAnalysis
  ): Promise<KeywordSuggestion[]> {
    return suggestions
      .map(suggestion => ({
        ...suggestion,
        score: this.calculateKeywordScore(suggestion, analysis)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
  
  private calculateKeywordScore(
    suggestion: KeywordSuggestion, 
    analysis: KeywordAnalysis
  ): number {
    let score = 0;
    
    // 검색량 점수 (40%)
    score += Math.min(suggestion.searchVolume / 10000 * 40, 40);
    
    // 경쟁도 점수 (30%) - 낮을수록 좋음
    score += Math.max(30 - suggestion.competitionScore * 30, 0);
    
    // 관련성 점수 (20%)
    score += suggestion.relevanceScore * 20;
    
    // 트렌드 점수 (10%)
    score += suggestion.trendScore * 10;
    
    return score;
  }
}
```

## 실시간 업데이트

### 웹소켓 연동
```typescript
// 실시간 키워드 순위 업데이트
class KeywordTrackingWebSocket {
  private io: Server;
  
  setupKeywordTracking() {
    this.io.on('connection', (socket) => {
      socket.on('subscribe-keyword-tracking', (data) => {
        const { userId, keywordIds } = data;
        socket.join(`keywords-${userId}`);
        
        // 키워드 추적 결과 업데이트 시 실시간 전송
        this.subscribeToKeywordUpdates(userId, keywordIds);
      });
      
      socket.on('update-keyword-priority', async (data) => {
        const { keywordId, priority } = data;
        await this.updateKeywordPriority(keywordId, priority);
        
        // 다른 클라이언트에게도 업데이트 전송
        socket.broadcast.to(`keywords-${data.userId}`).emit('keyword-priority-updated', data);
      });
    });
  }
  
  broadcastKeywordUpdate(userId: number, keywordUpdate: KeywordUpdate) {
    this.io.to(`keywords-${userId}`).emit('keyword-ranking-update', keywordUpdate);
  }
}
```

### 자동 추적 스케줄러
```typescript
import * as cron from 'node-cron';

class KeywordTrackingScheduler {
  startScheduler() {
    // 매일 오전 6시에 모든 활성 키워드 추적
    cron.schedule('0 6 * * *', async () => {
      await this.runDailyKeywordTracking();
    });
    
    // 매시간 고우선순위 키워드 추적
    cron.schedule('0 * * * *', async () => {
      await this.runHighPriorityTracking();
    });
  }
  
  private async runDailyKeywordTracking() {
    const activeKeywords = await this.getActiveKeywords();
    
    for (const keyword of activeKeywords) {
      try {
        const rankingResult = await this.trackKeywordRanking(keyword);
        await this.updateKeywordMetrics(keyword.id, rankingResult);
        
        // 실시간 업데이트 전송
        this.websocket.broadcastKeywordUpdate(keyword.userId, {
          keywordId: keyword.id,
          newRanking: rankingResult.ranking,
          previousRanking: keyword.currentRanking,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error(`키워드 추적 오류 (${keyword.keyword}):`, error);
      }
    }
  }
}
```

## 데이터 시각화

### 키워드 성과 대시보드
```typescript
// Chart.js를 사용한 키워드 성과 시각화
const createPerformanceDashboard = (keywordMetrics: KeywordMetrics[]) => {
  const chartConfig = {
    type: 'line',
    data: {
      labels: keywordMetrics.map(m => m.date),
      datasets: [{
        label: '순위 변화',
        data: keywordMetrics.map(m => m.ranking),
        borderColor: '#4A90E2',
        backgroundColor: 'rgba(74, 144, 226, 0.1)',
        yAxisID: 'ranking'
      }, {
        label: '검색량',
        data: keywordMetrics.map(m => m.searchVolume),
        borderColor: '#E74C3C',
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        yAxisID: 'volume'
      }]
    },
    options: {
      scales: {
        ranking: {
          type: 'linear',
          position: 'left',
          reverse: true,
          title: { display: true, text: '검색 순위' }
        },
        volume: {
          type: 'linear',
          position: 'right',
          title: { display: true, text: '검색량' }
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  };
  
  return chartConfig;
};
```

### 히트맵 시각화
```typescript
// 키워드 성과 히트맵
const createKeywordHeatmap = (keywords: FocusKeyword[]) => {
  return {
    type: 'matrix',
    data: {
      datasets: [{
        label: '키워드 성과',
        data: keywords.map(keyword => ({
          x: keyword.keyword,
          y: keyword.group?.name || 'Default',
          v: calculatePerformanceScore(keyword)
        })),
        backgroundColor: (ctx: any) => {
          const value = ctx.parsed.v;
          return `rgba(74, 144, 226, ${value / 100})`;
        }
      }]
    },
    options: {
      scales: {
        x: { type: 'category' },
        y: { type: 'category' }
      }
    }
  };
};
```

## 트러블슈팅

### 일반적인 문제
1. **키워드 추적 지연**: 스케줄러 상태 확인 및 큐 시스템 도입
2. **성과 지표 부정확**: 데이터 수집 주기 검토 및 검증 로직 강화
3. **메모리 사용량 증가**: 대용량 키워드 데이터 배치 처리

### 성능 모니터링
```typescript
class KeywordManagementMonitor {
  async monitorKeywordTracking() {
    const metrics = await this.collectMetrics();
    
    // 추적 성공률 모니터링
    if (metrics.successRate < 0.9) {
      await this.alertLowSuccessRate(metrics);
    }
    
    // 응답 시간 모니터링
    if (metrics.avgResponseTime > 5000) {
      await this.alertSlowResponse(metrics);
    }
    
    // 키워드 수 제한 확인
    if (metrics.totalKeywords > 1000) {
      await this.alertHighKeywordCount(metrics);
    }
  }
}
```

## 업데이트 로그

### v1.2.0 (2025-08-01)
- 키워드 그룹 관리 기능 추가
- 드래그 앤 드롭 인터페이스 구현
- 자동 키워드 제안 알고리즘 개선

### v1.1.0 (2025-07-15)
- 실시간 키워드 추적 기능
- 성과 분석 대시보드 구현
- 웹소켓 기반 라이브 업데이트

### v1.0.0 (2025-07-01)
- 기본 핵심 키워드 관리
- 개인 블로그 추적 기능
- 키워드 성과 지표 개발