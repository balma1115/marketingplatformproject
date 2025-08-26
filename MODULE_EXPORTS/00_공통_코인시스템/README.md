# 00_공통_코인시스템 모듈

## 개요
서비스 이용에 필요한 가상화폐(냥) 시스템을 관리하는 공통 모듈입니다.

## 주요 기능
- 코인 잔액 관리 및 추적
- 서비스별 코인 차감 시스템
- 코인 충전 및 환불 처리
- 사용 내역 로깅 및 분석
- 자동 충전 및 알림 기능
- 코인 사용량 통계 및 예측

## 기술 스택

### Backend
- Node.js with Express
- Database transactions for coin safety
- Real-time balance tracking
- Usage analytics engine

### Frontend Integration
- React components for coin display
- Real-time balance updates
- Transaction history views

## 프로젝트 구조

```
00_공통_코인시스템/
├── backend/
│   ├── services/
│   │   ├── coinService.ts
│   │   ├── transactionService.ts
│   │   ├── usageTrackingService.ts
│   │   └── coinAnalyticsService.ts
│   └── config/
│       ├── coin-rates.json
│       └── service-costs.json
└── database/
    └── coin_system_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Backend 의존성
npm install decimal.js node-cron
```

### 환경 변수
```env
# 코인 시스템 설정
DEFAULT_COIN_AMOUNT=100
MAX_COIN_AMOUNT=100000
MIN_PURCHASE_AMOUNT=1000

# 서비스 요금 (냥 단위)
AI_WRITING_COST=3
IMAGE_GENERATION_DEV_COST=1
IMAGE_GENERATION_PRO_COST=1.3
IMAGE_GENERATION_MAX_COST=2.1

# 자동 충전 설정
AUTO_CHARGE_ENABLED=false
AUTO_CHARGE_THRESHOLD=10
AUTO_CHARGE_AMOUNT=100

# 알림 설정
LOW_BALANCE_THRESHOLD=20
USAGE_ALERT_THRESHOLD=100
```

## 데이터베이스 스키마

### users 테이블 (코인 관련 필드)
```sql
-- 기존 users 테이블에 코인 관련 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS coin DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS used_coin DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS purchased_coin DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_coin_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

### coin_transactions 테이블
```sql
CREATE TABLE coin_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    transaction_type ENUM('purchase', 'usage', 'refund', 'admin_adjustment', 'auto_charge') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    service_type VARCHAR(50),
    service_details JSON,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    admin_user_id INT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (admin_user_id) REFERENCES users(id),
    INDEX idx_user_date (user_id, transaction_date),
    INDEX idx_type_status (transaction_type, status),
    INDEX idx_service_type (service_type, transaction_date)
);
```

### service_usage_logs 테이블
```sql
CREATE TABLE service_usage_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    service_action VARCHAR(100) NOT NULL,
    coin_cost DECIMAL(10,2) NOT NULL,
    usage_details JSON,
    transaction_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (transaction_id) REFERENCES coin_transactions(id),
    INDEX idx_user_service (user_id, service_type),
    INDEX idx_service_date (service_type, created_at)
);
```

### coin_packages 테이블
```sql
CREATE TABLE coin_packages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    package_name VARCHAR(100) NOT NULL,
    coin_amount DECIMAL(10,2) NOT NULL,
    price_krw DECIMAL(10,2) NOT NULL,
    bonus_coin DECIMAL(10,2) DEFAULT 0.00,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 기본 코인 패키지
INSERT INTO coin_packages (package_name, coin_amount, price_krw, bonus_coin, is_popular, sort_order) VALUES
('기본팩', 1000, 10000, 0, FALSE, 1),
('알뜰팩', 3000, 27000, 300, FALSE, 2),
('인기팩', 5000, 40000, 1000, TRUE, 3),
('프리미엄팩', 10000, 70000, 3000, FALSE, 4),
('VIP팩', 20000, 120000, 8000, FALSE, 5);
```

### coin_alerts 테이블
```sql
CREATE TABLE coin_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    alert_type ENUM('low_balance', 'high_usage', 'auto_charge', 'unusual_activity') NOT NULL,
    alert_message TEXT NOT NULL,
    threshold_value DECIMAL(10,2),
    current_value DECIMAL(10,2),
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_alert_type (alert_type, created_at)
);
```

## 코인 서비스

### 코인 관리 서비스
```typescript
import Decimal from 'decimal.js';

class CoinService {
  private serviceCosts = {
    'ai_writing': new Decimal('3'),
    'image_generation_dev': new Decimal('1'),
    'image_generation_pro': new Decimal('1.3'),
    'image_generation_max': new Decimal('2.1'),
    'keyword_analysis': new Decimal('2'),
    'smart_place_ranking': new Decimal('1.5')
  };

  async getUserBalance(userId: number): Promise<CoinBalance> {
    const user = await this.db.query('SELECT coin, used_coin, purchased_coin FROM users WHERE id = ?', [userId]);
    
    if (!user.length) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    return {
      current: new Decimal(user[0].coin),
      used: new Decimal(user[0].used_coin),
      purchased: new Decimal(user[0].purchased_coin),
      available: new Decimal(user[0].coin)
    };
  }

  async chargeCoins(
    userId: number, 
    amount: Decimal, 
    paymentInfo: PaymentInfo,
    adminUserId?: number
  ): Promise<CoinTransaction> {
    return await this.db.transaction(async (trx) => {
      // 현재 잔액 조회 (락 걸기)
      const currentBalance = await this.getCurrentBalance(userId, trx);
      const newBalance = currentBalance.add(amount);

      // 최대 보유 한도 확인
      const maxAmount = new Decimal(process.env.MAX_COIN_AMOUNT || '100000');
      if (newBalance.gt(maxAmount)) {
        throw new Error(`최대 보유 가능한 코인은 ${maxAmount.toString()}냥입니다.`);
      }

      // 사용자 코인 잔액 업데이트
      await trx.query(`
        UPDATE users 
        SET coin = ?, purchased_coin = purchased_coin + ?, last_coin_update = NOW()
        WHERE id = ?
      `, [newBalance.toString(), amount.toString(), userId]);

      // 거래 내역 생성
      const transactionResult = await trx.query(`
        INSERT INTO coin_transactions (
          user_id, transaction_type, amount, balance_before, balance_after,
          payment_method, payment_reference, admin_user_id, transaction_date, status
        ) VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?, NOW(), 'completed')
      `, [
        userId,
        amount.toString(),
        currentBalance.toString(),
        newBalance.toString(),
        paymentInfo.method,
        paymentInfo.reference,
        adminUserId
      ]);

      // 활동 로그
      await this.logActivity(userId, 'coin_charged', {
        amount: amount.toString(),
        paymentMethod: paymentInfo.method,
        paymentReference: paymentInfo.reference,
        newBalance: newBalance.toString()
      });

      return {
        id: transactionResult.insertId,
        userId,
        amount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        type: 'purchase',
        createdAt: new Date()
      };
    });
  }

  async useCoins(
    userId: number, 
    serviceType: string, 
    serviceDetails: any = {},
    customAmount?: Decimal
  ): Promise<CoinTransaction> {
    const cost = customAmount || this.getServiceCost(serviceType);
    
    return await this.db.transaction(async (trx) => {
      // 현재 잔액 조회 (락 걸기)
      const currentBalance = await this.getCurrentBalance(userId, trx);

      // 잔액 충분성 확인
      if (currentBalance.lt(cost)) {
        throw new Error(`코인이 부족합니다. 현재 ${currentBalance.toString()}냥, 필요 ${cost.toString()}냥`);
      }

      const newBalance = currentBalance.sub(cost);

      // 사용자 코인 잔액 및 사용량 업데이트
      await trx.query(`
        UPDATE users 
        SET coin = ?, used_coin = used_coin + ?, last_coin_update = NOW()
        WHERE id = ?
      `, [newBalance.toString(), cost.toString(), userId]);

      // 거래 내역 생성
      const transactionResult = await trx.query(`
        INSERT INTO coin_transactions (
          user_id, transaction_type, amount, balance_before, balance_after,
          service_type, service_details, transaction_date
        ) VALUES (?, 'usage', ?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        cost.neg().toString(), // 음수로 저장
        currentBalance.toString(),
        newBalance.toString(),
        serviceType,
        JSON.stringify(serviceDetails)
      ]);

      // 서비스 사용 로그
      await trx.query(`
        INSERT INTO service_usage_logs (
          user_id, service_type, service_action, coin_cost,
          usage_details, transaction_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        serviceType,
        serviceDetails.action || 'usage',
        cost.toString(),
        JSON.stringify(serviceDetails),
        transactionResult.insertId
      ]);

      // 저잔액 알림 확인
      await this.checkLowBalanceAlert(userId, newBalance);

      return {
        id: transactionResult.insertId,
        userId,
        amount: cost.neg(),
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        type: 'usage',
        serviceType,
        createdAt: new Date()
      };
    });
  }

  private getServiceCost(serviceType: string): Decimal {
    const cost = this.serviceCosts[serviceType];
    if (!cost) {
      throw new Error(`알 수 없는 서비스 타입: ${serviceType}`);
    }
    return cost;
  }

  private async getCurrentBalance(userId: number, trx: any): Promise<Decimal> {
    const result = await trx.query(
      'SELECT coin FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );
    
    if (!result.length) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    return new Decimal(result[0].coin);
  }

  private async checkLowBalanceAlert(userId: number, currentBalance: Decimal): Promise<void> {
    const threshold = new Decimal(process.env.LOW_BALANCE_THRESHOLD || '20');
    
    if (currentBalance.lte(threshold)) {
      await this.createAlert({
        userId,
        alertType: 'low_balance',
        message: `코인 잔액이 ${currentBalance.toString()}냥으로 부족합니다. 충전을 권장합니다.`,
        thresholdValue: threshold,
        currentValue: currentBalance
      });

      // 자동 충전이 활성화되어 있다면
      if (process.env.AUTO_CHARGE_ENABLED === 'true') {
        await this.handleAutoCharge(userId, currentBalance);
      }
    }
  }

  async getCoinTransactionHistory(
    userId: number,
    page: number = 1,
    limit: number = 50,
    type?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PaginatedTransactions> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (type) {
      whereClause += ' AND transaction_type = ?';
      params.push(type);
    }

    if (startDate) {
      whereClause += ' AND transaction_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND transaction_date <= ?';
      params.push(endDate);
    }

    const [transactions, countResult] = await Promise.all([
      this.db.query(`
        SELECT * FROM coin_transactions 
        ${whereClause}
        ORDER BY transaction_date DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      
      this.db.query(`
        SELECT COUNT(*) as total FROM coin_transactions 
        ${whereClause}
      `, params)
    ]);

    return {
      transactions: transactions.map(tx => ({
        ...tx,
        amount: new Decimal(tx.amount),
        balanceBefore: new Decimal(tx.balance_before),
        balanceAfter: new Decimal(tx.balance_after),
        serviceDetails: tx.service_details ? JSON.parse(tx.service_details) : null
      })),
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  }
}
```

### 사용량 추적 서비스
```typescript
class UsageTrackingService {
  async trackServiceUsage(
    userId: number, 
    serviceType: string, 
    action: string,
    cost: Decimal,
    details: any = {}
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO service_usage_logs (
        user_id, service_type, service_action, coin_cost,
        usage_details, ip_address, user_agent, session_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      serviceType,
      action,
      cost.toString(),
      JSON.stringify(details),
      details.ipAddress,
      details.userAgent,
      details.sessionId
    ]);
  }

  async getDailyUsageStats(userId: number, days: number = 30): Promise<UsageStats[]> {
    const stats = await this.db.query(`
      SELECT 
        DATE(created_at) as usage_date,
        service_type,
        COUNT(*) as usage_count,
        SUM(coin_cost) as total_cost
      FROM service_usage_logs 
      WHERE user_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at), service_type
      ORDER BY usage_date DESC, service_type
    `, [userId, days]);

    return stats.map(stat => ({
      date: stat.usage_date,
      serviceType: stat.service_type,
      usageCount: stat.usage_count,
      totalCost: new Decimal(stat.total_cost)
    }));
  }

  async getTopUsers(period: string = '30days'): Promise<TopUser[]> {
    const periodDays = this.getPeriodDays(period);
    
    const topUsers = await this.db.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        SUM(sul.coin_cost) as total_usage,
        COUNT(sul.id) as usage_count,
        COUNT(DISTINCT sul.service_type) as service_variety
      FROM service_usage_logs sul
      JOIN users u ON sul.user_id = u.id
      WHERE sul.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY u.id, u.email, u.name
      ORDER BY total_usage DESC
      LIMIT 50
    `, [periodDays]);

    return topUsers.map(user => ({
      userId: user.id,
      email: user.email,
      name: user.name,
      totalUsage: new Decimal(user.total_usage),
      usageCount: user.usage_count,
      serviceVariety: user.service_variety
    }));
  }

  async predictNextMonthUsage(userId: number): Promise<UsagePrediction> {
    // 과거 3개월 사용 패턴 분석
    const historicalData = await this.db.query(`
      SELECT 
        YEAR(created_at) as year,
        MONTH(created_at) as month,
        service_type,
        SUM(coin_cost) as monthly_cost,
        COUNT(*) as monthly_count
      FROM service_usage_logs 
      WHERE user_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at), service_type
      ORDER BY year, month, service_type
    `, [userId]);

    const prediction = this.calculateUsagePrediction(historicalData);
    
    return {
      userId,
      predictedTotalCost: prediction.totalCost,
      predictedUsageCount: prediction.usageCount,
      serviceBreakdown: prediction.serviceBreakdown,
      confidence: prediction.confidence,
      basedOnMonths: 3
    };
  }

  private calculateUsagePrediction(historicalData: any[]): UsagePredictionData {
    // 서비스별 월평균 계산
    const serviceAverages = new Map<string, { cost: Decimal, count: number }>();
    
    historicalData.forEach(data => {
      const existing = serviceAverages.get(data.service_type) || 
        { cost: new Decimal(0), count: 0 };
      
      serviceAverages.set(data.service_type, {
        cost: existing.cost.add(new Decimal(data.monthly_cost)),
        count: existing.count + data.monthly_count
      });
    });

    // 평균값 계산 (3개월 평균)
    const monthCount = 3;
    let totalCost = new Decimal(0);
    let totalCount = 0;
    const serviceBreakdown: ServicePrediction[] = [];

    serviceAverages.forEach((data, serviceType) => {
      const avgCost = data.cost.div(monthCount);
      const avgCount = Math.round(data.count / monthCount);
      
      totalCost = totalCost.add(avgCost);
      totalCount += avgCount;
      
      serviceBreakdown.push({
        serviceType,
        predictedCost: avgCost,
        predictedCount: avgCount
      });
    });

    // 신뢰도 계산 (데이터 포인트가 많을수록 높음)
    const confidence = Math.min(historicalData.length / 30, 1); // 최대 100%

    return {
      totalCost,
      usageCount: totalCount,
      serviceBreakdown,
      confidence
    };
  }
}
```

### 코인 분석 서비스
```typescript
class CoinAnalyticsService {
  async getRevenueAnalytics(period: string = '30days'): Promise<RevenueAnalytics> {
    const periodDays = this.getPeriodDays(period);
    
    const [revenueData, usageData, topServices] = await Promise.all([
      this.getRevenueData(periodDays),
      this.getUsageData(periodDays),
      this.getTopServices(periodDays)
    ]);

    return {
      totalRevenue: revenueData.total,
      totalUsage: usageData.total,
      netRevenue: revenueData.total.sub(usageData.total),
      purchaseCount: revenueData.purchaseCount,
      activeUsers: usageData.activeUsers,
      averageRevenuePerUser: revenueData.total.div(Math.max(usageData.activeUsers, 1)),
      topServices,
      trend: await this.calculateRevenueTrend(periodDays)
    };
  }

  async getUserCoinAnalytics(userId: number): Promise<UserCoinAnalytics> {
    const [balance, monthlyUsage, predictions, alerts] = await Promise.all([
      this.coinService.getUserBalance(userId),
      this.getMonthlyUsage(userId),
      this.usageTrackingService.predictNextMonthUsage(userId),
      this.getRecentAlerts(userId)
    ]);

    const efficiency = this.calculateUsageEfficiency(monthlyUsage);
    
    return {
      currentBalance: balance.current,
      monthlyUsage,
      usageEfficiency: efficiency,
      nextMonthPrediction: predictions,
      recentAlerts: alerts,
      recommendations: this.generateRecommendations(balance, monthlyUsage, predictions)
    };
  }

  private async getRevenueData(days: number): Promise<RevenueData> {
    const result = await this.db.query(`
      SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as purchase_count
      FROM coin_transactions 
      WHERE transaction_type = 'purchase' 
        AND status = 'completed'
        AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    return {
      total: new Decimal(result[0].total_revenue || 0),
      purchaseCount: result[0].purchase_count || 0
    };
  }

  private async getUsageData(days: number): Promise<UsageData> {
    const result = await this.db.query(`
      SELECT 
        SUM(ABS(amount)) as total_usage,
        COUNT(DISTINCT user_id) as active_users
      FROM coin_transactions 
      WHERE transaction_type = 'usage'
        AND transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    return {
      total: new Decimal(result[0].total_usage || 0),
      activeUsers: result[0].active_users || 0
    };
  }

  private async calculateRevenueTrend(days: number): Promise<TrendData[]> {
    const trendData = await this.db.query(`
      SELECT 
        DATE(transaction_date) as date,
        SUM(CASE WHEN transaction_type = 'purchase' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN transaction_type = 'usage' THEN ABS(amount) ELSE 0 END) as usage
      FROM coin_transactions 
      WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(transaction_date)
      ORDER BY date
    `, [days]);

    return trendData.map(data => ({
      date: data.date,
      revenue: new Decimal(data.revenue || 0),
      usage: new Decimal(data.usage || 0),
      net: new Decimal(data.revenue || 0).sub(new Decimal(data.usage || 0))
    }));
  }

  private generateRecommendations(
    balance: CoinBalance, 
    usage: MonthlyUsage[], 
    prediction: UsagePrediction
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // 잔액 부족 예상
    if (balance.current.lt(prediction.predictedTotalCost)) {
      const shortage = prediction.predictedTotalCost.sub(balance.current);
      recommendations.push({
        type: 'low_balance',
        priority: 'high',
        title: '코인 충전 권장',
        description: `다음 달 예상 사용량(${prediction.predictedTotalCost.toString()}냥)에 비해 잔액이 부족합니다.`,
        actionText: `${shortage.toString()}냥 이상 충전`,
        actionUrl: '/coin/charge'
      });
    }

    // 사용 패턴 분석
    const highUsageServices = prediction.serviceBreakdown
      .filter(s => s.predictedCost.gt(new Decimal(50)))
      .sort((a, b) => b.predictedCost.cmp(a.predictedCost));

    if (highUsageServices.length > 0) {
      recommendations.push({
        type: 'usage_optimization',
        priority: 'medium',
        title: '서비스 사용량 최적화',
        description: `${highUsageServices[0].serviceType} 서비스의 사용량이 높습니다. 효율적인 사용 방법을 확인해보세요.`,
        actionText: '사용 팁 보기',
        actionUrl: `/help/${highUsageServices[0].serviceType}`
      });
    }

    // 프리미엄 추천
    if (balance.current.gt(new Decimal(1000))) {
      recommendations.push({
        type: 'upgrade',
        priority: 'low',
        title: '프리미엄 계정 업그레이드',
        description: '프리미엄 계정으로 업그레이드하여 추가 혜택을 받아보세요.',
        actionText: '프리미엄 보기',
        actionUrl: '/premium'
      });
    }

    return recommendations;
  }
}
```

### 자동 충전 서비스
```typescript
class AutoChargeService {
  async setupAutoCharge(
    userId: number,
    settings: AutoChargeSettings
  ): Promise<void> {
    // 기존 설정 비활성화
    await this.db.query(`
      UPDATE user_auto_charge_settings 
      SET is_active = FALSE 
      WHERE user_id = ?
    `, [userId]);

    // 새 설정 생성
    await this.db.query(`
      INSERT INTO user_auto_charge_settings (
        user_id, threshold_amount, charge_amount, 
        payment_method, is_active, created_at
      ) VALUES (?, ?, ?, ?, TRUE, NOW())
    `, [
      userId,
      settings.thresholdAmount.toString(),
      settings.chargeAmount.toString(),
      settings.paymentMethod
    ]);
  }

  async checkAndExecuteAutoCharges(): Promise<void> {
    // 자동 충전 대상 사용자 조회
    const usersNeedingCharge = await this.db.query(`
      SELECT 
        u.id as user_id,
        u.coin as current_balance,
        acs.threshold_amount,
        acs.charge_amount,
        acs.payment_method
      FROM users u
      JOIN user_auto_charge_settings acs ON u.id = acs.user_id
      WHERE acs.is_active = TRUE
        AND u.coin <= acs.threshold_amount
        AND u.is_active = TRUE
    `);

    for (const user of usersNeedingCharge) {
      try {
        await this.executeAutoCharge(user);
      } catch (error) {
        console.error(`자동 충전 실패 (사용자 ${user.user_id}):`, error);
        
        // 실패 알림 생성
        await this.createAlert({
          userId: user.user_id,
          alertType: 'auto_charge',
          message: '자동 충전에 실패했습니다. 결제 정보를 확인해주세요.',
          thresholdValue: new Decimal(user.threshold_amount),
          currentValue: new Decimal(user.current_balance)
        });
      }
    }
  }

  private async executeAutoCharge(userChargeInfo: any): Promise<void> {
    const { user_id, charge_amount, payment_method } = userChargeInfo;
    const amount = new Decimal(charge_amount);

    // 결제 처리 (실제 결제 시스템과 연동)
    const paymentResult = await this.processPayment({
      userId: user_id,
      amount,
      method: payment_method,
      type: 'auto_charge'
    });

    if (paymentResult.success) {
      // 코인 충전
      await this.coinService.chargeCoins(user_id, amount, {
        method: payment_method,
        reference: paymentResult.transactionId,
        type: 'auto_charge'
      });

      // 성공 알림
      await this.createAlert({
        userId: user_id,
        alertType: 'auto_charge',
        message: `자동 충전이 완료되었습니다. ${amount.toString()}냥이 충전되었습니다.`,
        currentValue: amount
      });
    } else {
      throw new Error(paymentResult.error);
    }
  }

  // 매일 자정에 실행하는 스케줄러
  startAutoChargeScheduler(): void {
    const cron = require('node-cron');
    
    // 매일 오전 9시에 자동 충전 확인
    cron.schedule('0 9 * * *', async () => {
      console.log('자동 충전 확인 시작...');
      await this.checkAndExecuteAutoCharges();
      console.log('자동 충전 확인 완료');
    });

    // 매시간마다 급한 경우 체크 (임계치 매우 낮은 경우)
    cron.schedule('0 * * * *', async () => {
      await this.checkEmergencyAutoCharges();
    });
  }
}
```

## API 통합 가이드

### 서비스에서 코인 사용
```typescript
// AI 글쓰기 서비스에서 코인 차감
export const useAIWritingService = async (userId: number, prompt: string) => {
  try {
    // 코인 차감
    await coinService.useCoins(userId, 'ai_writing', {
      action: 'generate_content',
      prompt_length: prompt.length,
      model: 'gemini-pro'
    });

    // 실제 서비스 실행
    const content = await geminiService.generateContent(prompt);
    
    return { success: true, content };
  } catch (error) {
    if (error.message.includes('코인이 부족')) {
      return { 
        success: false, 
        error: 'insufficient_coins',
        message: error.message 
      };
    }
    throw error;
  }
};

// 이미지 생성 서비스에서 코인 차감
export const useImageGenerationService = async (
  userId: number, 
  model: 'dev' | 'pro' | 'max'
) => {
  const serviceType = `image_generation_${model}`;
  
  try {
    const transaction = await coinService.useCoins(userId, serviceType, {
      action: 'generate_image',
      model,
      timestamp: new Date().toISOString()
    });

    // 실제 서비스 실행
    const image = await fluxService.generateImage(model);
    
    return { 
      success: true, 
      image, 
      coinUsed: transaction.amount.abs(),
      transactionId: transaction.id 
    };
  } catch (error) {
    if (error.message.includes('코인이 부족')) {
      return { 
        success: false, 
        error: 'insufficient_coins',
        message: error.message,
        requiredCoins: coinService.getServiceCost(serviceType)
      };
    }
    throw error;
  }
};
```

### 프론트엔드 코인 표시 컴포넌트
```typescript
// 실시간 코인 잔액 표시
export const CoinBalance: React.FC = () => {
  const [balance, setBalance] = useState<Decimal>(new Decimal(0));
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadBalance();
      
      // 실시간 업데이트를 위한 WebSocket 연결
      const ws = new WebSocket(`ws://localhost:3021/coin-updates/${user.id}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'balance_update') {
          setBalance(new Decimal(data.newBalance));
        }
      };
      
      return () => ws.close();
    }
  }, [user]);

  const loadBalance = async () => {
    try {
      const response = await api.get('/user/coin/balance');
      setBalance(new Decimal(response.data.current));
    } catch (error) {
      console.error('잔액 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <span className="coin-balance loading">로딩중...</span>;

  return (
    <div className="coin-balance">
      <span className="coin-icon">🪙</span>
      <span className="balance-amount">{balance.toString()}</span>
      <span className="coin-unit">냥</span>
      {balance.lt(20) && (
        <button 
          className="charge-button urgent"
          onClick={() => window.location.href = '/coin/charge'}
        >
          충전
        </button>
      )}
    </div>
  );
};
```

## 트러블슈팅

### 일반적인 문제
1. **동시성 문제**: 트랜잭션과 FOR UPDATE 락 사용
2. **소수점 정확도**: Decimal.js 라이브러리 사용
3. **잔액 불일치**: 정기적인 잔액 검증 배치 작업

### 모니터링 및 알림
```typescript
class CoinSystemMonitor {
  async runHealthCheck(): Promise<SystemHealth> {
    const issues: HealthIssue[] = [];
    
    // 잔액 불일치 검사
    const balanceIssues = await this.checkBalanceConsistency();
    issues.push(...balanceIssues);
    
    // 거래 무결성 검사
    const transactionIssues = await this.checkTransactionIntegrity();
    issues.push(...transactionIssues);
    
    // 의심스러운 활동 검사
    const suspiciousActivity = await this.detectSuspiciousActivity();
    issues.push(...suspiciousActivity);
    
    return {
      isHealthy: issues.length === 0,
      issues,
      checkedAt: new Date()
    };
  }

  async checkBalanceConsistency(): Promise<HealthIssue[]> {
    const inconsistencies = await this.db.query(`
      SELECT 
        u.id,
        u.coin as current_balance,
        COALESCE(SUM(CASE 
          WHEN ct.transaction_type = 'purchase' THEN ct.amount
          WHEN ct.transaction_type = 'usage' THEN ct.amount
          ELSE 0 
        END), 0) + 100 as calculated_balance
      FROM users u
      LEFT JOIN coin_transactions ct ON u.id = ct.user_id
      WHERE u.is_active = TRUE
      GROUP BY u.id, u.coin
      HAVING ABS(u.coin - calculated_balance) > 0.01
    `);

    return inconsistencies.map(user => ({
      type: 'balance_inconsistency',
      severity: 'high',
      message: `사용자 ${user.id}의 잔액 불일치 (실제: ${user.current_balance}, 계산값: ${user.calculated_balance})`,
      userId: user.id
    }));
  }
}
```

## 업데이트 로그

### v1.3.0 (2025-08-25)
- 자동 충전 시스템 구현
- 사용량 예측 알고리즘 추가
- 코인 분석 대시보드 고도화

### v1.2.0 (2025-08-10)
- 실시간 잔액 업데이트 (WebSocket)
- 사용량 추적 및 분석 기능
- 저잔액 알림 시스템

### v1.1.0 (2025-07-25)
- 트랜잭션 무결성 강화
- 서비스별 차등 요금제 구현
- 코인 충전 패키지 시스템

### v1.0.0 (2025-07-10)
- 기본 코인 시스템 구현
- 서비스별 코인 차감 기능
- 거래 내역 추적 시스템