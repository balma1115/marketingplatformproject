# 08_관리자_대시보드 모듈

## 개요
시스템 전반의 운영 현황을 모니터링하고 관리하는 관리자 전용 대시보드 모듈입니다.

## 주요 기능
- 전체 시스템 현황 대시보드
- 사용자 활동 모니터링
- API 사용량 및 성능 분석
- 수익 분석 및 리포트
- 시스템 알림 관리
- 실시간 통계 및 지표

## 기술 스택

### Frontend
- React 18 with TypeScript
- Chart.js for comprehensive analytics
- Real-time data visualization
- Advanced dashboard components
- WebSocket for live updates

### Backend
- Node.js with Express
- Advanced analytics engine
- System monitoring services
- Report generation engine

## 프로젝트 구조

```
08_관리자_대시보드/
├── frontend/
│   ├── components/
│   │   ├── SystemHealthMonitor.tsx
│   │   ├── UserActivityChart.tsx
│   │   ├── RevenueAnalytics.tsx
│   │   ├── APIUsageMonitor.tsx
│   │   └── AlertsPanel.tsx
│   ├── pages/
│   │   └── AdminDashboard.tsx
│   └── styles/
│       └── AdminDashboard.css
├── backend/
│   ├── routes/
│   │   ├── admin.routes.ts
│   │   └── admin.tracking.routes.ts
│   ├── services/
│   │   ├── adminAnalyticsService.ts
│   │   ├── systemMonitoringService.ts
│   │   ├── revenueAnalysisService.ts
│   │   └── alertManagementService.ts
│   └── config/
│       ├── admin-config.ts
│       └── monitoring-thresholds.json
└── database/
    └── admin_dashboard_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom chart.js react-chartjs-2 socket.io-client date-fns

# Backend 의존성
npm install socket.io node-cron os-utils systeminformation
```

### 환경 변수
```env
# 관리자 대시보드 설정
ADMIN_DASHBOARD_PORT=3030
SYSTEM_MONITORING_ENABLED=true
REAL_TIME_UPDATES=true

# 알림 설정
ALERT_EMAIL_ENABLED=true
ALERT_SLACK_WEBHOOK=your-slack-webhook
CRITICAL_THRESHOLD_CPU=80
CRITICAL_THRESHOLD_MEMORY=85

# 리포트 설정
DAILY_REPORT_TIME=09:00
WEEKLY_REPORT_DAY=monday
MONTHLY_REPORT_DATE=1
```

## API 엔드포인트

### 시스템 현황
```http
GET /api/admin/dashboard/overview
GET /api/admin/dashboard/stats
GET /api/admin/system/health
GET /api/admin/system/performance
```

### 사용자 분석
```http
GET /api/admin/users/active
GET /api/admin/users/activity
?period=7days&metric=login,usage,revenue
GET /api/admin/users/demographics
GET /api/admin/users/cohort-analysis
```

### 수익 분석
```http
GET /api/admin/revenue/summary
?startDate=2025-01-01&endDate=2025-01-31
GET /api/admin/revenue/chart-data
GET /api/admin/revenue/projections
GET /api/admin/revenue/by-service
```

### API 사용량
```http
GET /api/admin/api-usage/summary
GET /api/admin/api-usage/by-endpoint
GET /api/admin/api-usage/by-user
GET /api/admin/api-usage/error-rates
```

## 데이터베이스 스키마

### system_metrics 테이블
```sql
CREATE TABLE system_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_type ENUM('cpu', 'memory', 'disk', 'network', 'database') NOT NULL,
    metric_value DECIMAL(5,2) NOT NULL,
    threshold_value DECIMAL(5,2),
    is_critical BOOLEAN DEFAULT FALSE,
    server_name VARCHAR(100),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_time (metric_type, recorded_at),
    INDEX idx_critical (is_critical, recorded_at)
);
```

### user_activity_logs 테이블
```sql
CREATE TABLE user_activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_type ENUM('login', 'logout', 'api_call', 'service_usage') NOT NULL,
    activity_detail JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_time (user_id, created_at),
    INDEX idx_activity_type (activity_type, created_at)
);
```

### revenue_tracking 테이블
```sql
CREATE TABLE revenue_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    service_type ENUM('ai_writing', 'image_generation', 'keyword_analysis', 'smart_place') NOT NULL,
    transaction_type ENUM('coin_purchase', 'service_usage', 'refund') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    coin_amount DECIMAL(10,2),
    transaction_details JSON,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_service_date (service_type, transaction_date),
    INDEX idx_user_date (user_id, transaction_date)
);
```

### system_alerts 테이블
```sql
CREATE TABLE system_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alert_type ENUM('critical', 'warning', 'info') NOT NULL,
    alert_category ENUM('system', 'security', 'performance', 'business') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    affected_component VARCHAR(100),
    severity_level INT DEFAULT 1,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    INDEX idx_type_status (alert_type, is_resolved),
    INDEX idx_created (created_at)
);
```

## 대시보드 구현

### 실시간 시스템 모니터링
```typescript
class SystemMonitoringService {
  private io: Server;
  private monitoringInterval: NodeJS.Timeout;

  constructor(io: Server) {
    this.io = io;
    this.startMonitoring();
  }

  private startMonitoring() {
    // 매 30초마다 시스템 지표 수집
    this.monitoringInterval = setInterval(async () => {
      const metrics = await this.collectSystemMetrics();
      await this.checkThresholds(metrics);
      
      // 관리자에게 실시간 업데이트 전송
      this.io.to('admin').emit('system-metrics-update', metrics);
    }, 30000);
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const si = await import('systeminformation');
    
    const [cpu, memory, disk, network] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats()
    ]);

    const metrics: SystemMetrics = {
      cpu: {
        usage: cpu.currentload,
        temperature: cpu.temperature || 0
      },
      memory: {
        usage: (memory.used / memory.total) * 100,
        available: memory.available,
        total: memory.total
      },
      disk: {
        usage: disk.length > 0 ? (disk[0].used / disk[0].size) * 100 : 0,
        free: disk.length > 0 ? disk[0].available : 0
      },
      network: {
        rx: network[0]?.rx_sec || 0,
        tx: network[0]?.tx_sec || 0
      },
      timestamp: new Date()
    };

    // 데이터베이스에 저장
    await this.saveMetrics(metrics);
    
    return metrics;
  }

  private async checkThresholds(metrics: SystemMetrics): Promise<void> {
    const alerts: SystemAlert[] = [];

    // CPU 사용률 체크
    if (metrics.cpu.usage > 80) {
      alerts.push({
        type: 'critical',
        category: 'performance',
        title: 'CPU 사용률 위험',
        message: `CPU 사용률이 ${metrics.cpu.usage.toFixed(1)}%입니다.`,
        component: 'cpu'
      });
    }

    // 메모리 사용률 체크
    if (metrics.memory.usage > 85) {
      alerts.push({
        type: 'critical',
        category: 'performance',
        title: '메모리 사용률 위험',
        message: `메모리 사용률이 ${metrics.memory.usage.toFixed(1)}%입니다.`,
        component: 'memory'
      });
    }

    // 디스크 사용률 체크
    if (metrics.disk.usage > 90) {
      alerts.push({
        type: 'warning',
        category: 'system',
        title: '디스크 공간 부족',
        message: `디스크 사용률이 ${metrics.disk.usage.toFixed(1)}%입니다.`,
        component: 'disk'
      });
    }

    // 알림 생성 및 전송
    for (const alert of alerts) {
      await this.createAlert(alert);
      await this.sendAlert(alert);
    }
  }
}
```

### 사용자 분석 서비스
```typescript
class UserAnalyticsService {
  async getUserActivitySummary(period: string): Promise<UserActivitySummary> {
    const dateFilter = this.getDateFilter(period);
    
    const [totalUsers, activeUsers, newUsers, sessionData] = await Promise.all([
      this.getTotalUsers(),
      this.getActiveUsers(dateFilter),
      this.getNewUsers(dateFilter),
      this.getSessionData(dateFilter)
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsers,
      averageSessionDuration: sessionData.avgDuration,
      totalSessions: sessionData.totalSessions,
      bounceRate: sessionData.bounceRate,
      topServices: await this.getTopServices(dateFilter),
      userGrowth: await this.calculateUserGrowth(period)
    };
  }

  async getCohortAnalysis(): Promise<CohortData[]> {
    const query = `
      SELECT 
        DATE(u.created_at) as cohort_date,
        TIMESTAMPDIFF(WEEK, u.created_at, ual.created_at) as week_number,
        COUNT(DISTINCT ual.user_id) as active_users,
        COUNT(DISTINCT CASE WHEN DATE(u.created_at) = ? THEN u.id END) as cohort_size
      FROM users u
      LEFT JOIN user_activity_logs ual ON u.id = ual.user_id
      WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
      GROUP BY cohort_date, week_number
      ORDER BY cohort_date, week_number
    `;

    const results = await this.db.query(query);
    return this.processCohortData(results);
  }

  private processCohortData(rawData: any[]): CohortData[] {
    const cohortMap = new Map<string, CohortData>();

    rawData.forEach(row => {
      const cohortKey = row.cohort_date;
      
      if (!cohortMap.has(cohortKey)) {
        cohortMap.set(cohortKey, {
          cohortDate: row.cohort_date,
          cohortSize: row.cohort_size,
          retentionRates: []
        });
      }

      const cohort = cohortMap.get(cohortKey)!;
      if (row.week_number !== null) {
        cohort.retentionRates[row.week_number] = 
          (row.active_users / cohort.cohortSize) * 100;
      }
    });

    return Array.from(cohortMap.values());
  }
}
```

### 수익 분석 서비스
```typescript
class RevenueAnalysisService {
  async getRevenueAnalysis(dateRange: DateRange): Promise<RevenueAnalysis> {
    const [summary, breakdown, projections, trends] = await Promise.all([
      this.getRevenueSummary(dateRange),
      this.getRevenueByService(dateRange),
      this.getRevenueProjections(),
      this.getRevenueTrends(dateRange)
    ]);

    return {
      summary,
      serviceBreakdown: breakdown,
      projections,
      trends,
      topUsers: await this.getTopRevenueUsers(dateRange),
      conversionMetrics: await this.getConversionMetrics(dateRange)
    };
  }

  private async getRevenueSummary(dateRange: DateRange): Promise<RevenueSummary> {
    const query = `
      SELECT 
        SUM(CASE WHEN transaction_type = 'coin_purchase' THEN amount ELSE 0 END) as total_purchases,
        SUM(CASE WHEN transaction_type = 'service_usage' THEN amount ELSE 0 END) as total_usage,
        COUNT(DISTINCT user_id) as paying_users,
        AVG(CASE WHEN transaction_type = 'coin_purchase' THEN amount ELSE NULL END) as avg_purchase,
        COUNT(*) as total_transactions
      FROM revenue_tracking 
      WHERE transaction_date BETWEEN ? AND ?
    `;

    const results = await this.db.query(query, [dateRange.start, dateRange.end]);
    const data = results[0];

    return {
      totalRevenue: data.total_purchases,
      totalUsage: data.total_usage,
      netRevenue: data.total_purchases - data.total_usage,
      payingUsers: data.paying_users,
      averagePurchase: data.avg_purchase || 0,
      totalTransactions: data.total_transactions,
      revenueGrowth: await this.calculateRevenueGrowth(dateRange)
    };
  }

  async generateRevenueProjection(months: number): Promise<RevenueProjection[]> {
    // 과거 데이터 기반 트렌드 분석
    const historicalData = await this.getHistoricalRevenue(12); // 최근 12개월
    const growthRate = this.calculateGrowthRate(historicalData);
    
    const projections: RevenueProjection[] = [];
    let lastRevenue = historicalData[historicalData.length - 1]?.revenue || 0;

    for (let i = 1; i <= months; i++) {
      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + i);
      
      // 계절성 고려
      const seasonalFactor = this.getSeasonalFactor(projectedDate.getMonth());
      const projectedRevenue = lastRevenue * (1 + growthRate) * seasonalFactor;
      
      projections.push({
        date: projectedDate.toISOString().substring(0, 7), // YYYY-MM 형식
        projectedRevenue: Math.round(projectedRevenue),
        confidence: Math.max(0.9 - (i * 0.1), 0.3), // 미래로 갈수록 신뢰도 감소
        factors: {
          baseGrowth: growthRate,
          seasonal: seasonalFactor,
          confidence: Math.max(0.9 - (i * 0.1), 0.3)
        }
      });
      
      lastRevenue = projectedRevenue;
    }

    return projections;
  }
}
```

## 실시간 알림 시스템

### 알림 관리 서비스
```typescript
class AlertManagementService {
  private alertQueue: SystemAlert[] = [];
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.processAlertQueue();
  }

  async createAlert(alert: Partial<SystemAlert>): Promise<SystemAlert> {
    const newAlert: SystemAlert = {
      id: 0, // DB에서 자동 할당
      type: alert.type || 'info',
      category: alert.category || 'system',
      title: alert.title || '',
      message: alert.message || '',
      component: alert.component,
      severityLevel: alert.severityLevel || 1,
      isResolved: false,
      createdAt: new Date(),
      ...alert
    };

    // 데이터베이스에 저장
    const savedAlert = await this.saveAlert(newAlert);
    
    // 실시간 알림 전송
    this.io.to('admin').emit('new-alert', savedAlert);
    
    // 중요한 알림은 이메일/Slack으로도 전송
    if (savedAlert.type === 'critical') {
      await this.sendExternalNotification(savedAlert);
    }

    return savedAlert;
  }

  private async processAlertQueue(): Promise<void> {
    setInterval(async () => {
      if (this.alertQueue.length === 0) return;

      const alertsToProcess = this.alertQueue.splice(0, 10); // 한 번에 최대 10개 처리
      
      for (const alert of alertsToProcess) {
        try {
          await this.createAlert(alert);
        } catch (error) {
          console.error('알림 처리 오류:', error);
          // 실패한 알림은 다시 큐에 추가 (최대 3회 재시도)
          if (!alert.retryCount || alert.retryCount < 3) {
            alert.retryCount = (alert.retryCount || 0) + 1;
            this.alertQueue.push(alert);
          }
        }
      }
    }, 5000); // 5초마다 처리
  }

  async getActiveAlerts(): Promise<SystemAlert[]> {
    return await this.db.query(`
      SELECT * FROM system_alerts 
      WHERE is_resolved = FALSE 
      ORDER BY severity_level DESC, created_at DESC 
      LIMIT 50
    `);
  }

  async resolveAlert(alertId: number, resolvedBy: number): Promise<void> {
    await this.db.query(`
      UPDATE system_alerts 
      SET is_resolved = TRUE, resolved_at = NOW(), resolved_by = ? 
      WHERE id = ?
    `, [resolvedBy, alertId]);

    // 실시간 업데이트 전송
    this.io.to('admin').emit('alert-resolved', { alertId, resolvedBy });
  }
}
```

## 차트 및 시각화

### 종합 대시보드 차트 구성
```typescript
// 시스템 성능 차트
const createSystemPerformanceChart = (metricsData: SystemMetrics[]) => {
  return {
    type: 'line',
    data: {
      labels: metricsData.map(m => new Date(m.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: 'CPU 사용률 (%)',
          data: metricsData.map(m => m.cpu.usage),
          borderColor: '#E74C3C',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          yAxisID: 'percentage'
        },
        {
          label: '메모리 사용률 (%)',
          data: metricsData.map(m => m.memory.usage),
          borderColor: '#F39C12',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          yAxisID: 'percentage'
        },
        {
          label: '디스크 사용률 (%)',
          data: metricsData.map(m => m.disk.usage),
          borderColor: '#9B59B6',
          backgroundColor: 'rgba(155, 89, 182, 0.1)',
          yAxisID: 'percentage'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        percentage: {
          type: 'linear',
          position: 'left',
          min: 0,
          max: 100,
          title: { display: true, text: '사용률 (%)' }
        }
      }
    }
  };
};

// 사용자 활동 히트맵
const createUserActivityHeatmap = (activityData: ActivityHeatmapData[]) => {
  return {
    type: 'matrix',
    data: {
      datasets: [{
        label: '사용자 활동',
        data: activityData.map(d => ({
          x: d.hour,
          y: d.day,
          v: d.activityCount
        })),
        backgroundColor: (ctx: any) => {
          const value = ctx.parsed.v;
          const max = Math.max(...activityData.map(d => d.activityCount));
          const intensity = value / max;
          return `rgba(74, 144, 226, ${intensity})`;
        }
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: 23,
          title: { display: true, text: '시간' }
        },
        y: {
          type: 'category',
          labels: ['일', '월', '화', '수', '목', '금', '토'],
          title: { display: true, text: '요일' }
        }
      }
    }
  };
};

// 수익 분석 대시보드
const createRevenueDashboard = (revenueData: RevenueData[]) => {
  return {
    type: 'bar',
    data: {
      labels: revenueData.map(d => d.service),
      datasets: [{
        label: '월 수익 (원)',
        data: revenueData.map(d => d.revenue),
        backgroundColor: [
          '#4A90E2', '#E74C3C', '#2ECC71', '#F39C12',
          '#9B59B6', '#1ABC9C', '#34495E', '#95A5A6'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return `${context.label}: ${context.raw.toLocaleString()}원`;
            }
          }
        }
      }
    }
  };
};
```

## 보안 및 접근 제어

### 관리자 권한 확인
```typescript
// 관리자 전용 미들웨어
const adminOnlyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.id);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

// 감사 로그 기록
const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    await db.query(`
      INSERT INTO admin_audit_logs (
        admin_id, action, endpoint, method, 
        status_code, duration, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user?.id,
      `${req.method} ${req.path}`,
      req.path,
      req.method,
      res.statusCode,
      duration,
      req.ip,
      req.get('User-Agent')
    ]);
  });

  next();
};
```

## 트러블슈팅

### 성능 최적화
```typescript
class DashboardPerformanceOptimizer {
  // 대시보드 데이터 캐싱
  private dashboardCache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1분

  async getCachedDashboardData(cacheKey: string, dataFetcher: () => Promise<any>): Promise<any> {
    const cached = this.dashboardCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const data = await dataFetcher();
    this.dashboardCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }

  // 메모리 사용량 모니터링
  monitorMemoryUsage(): void {
    setInterval(() => {
      const usage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024)
      };

      if (usageInMB.heapUsed > 512) { // 512MB 초과 시 경고
        console.warn('높은 메모리 사용량 감지:', usageInMB);
      }
    }, 30000);
  }
}
```

## 업데이트 로그

### v1.3.0 (2025-08-15)
- 실시간 시스템 모니터링 고도화
- 사용자 코호트 분석 추가
- 수익 예측 모델 개선

### v1.2.0 (2025-08-01)
- 알림 시스템 구현
- 사용자 활동 히트맵 추가
- 성능 최적화 및 캐싱 도입

### v1.1.0 (2025-07-15)
- 수익 분석 대시보드 구현
- API 사용량 모니터링 추가
- 실시간 업데이트 기능

### v1.0.0 (2025-07-01)
- 기본 관리자 대시보드 구현
- 시스템 현황 모니터링
- 사용자 통계 및 분석