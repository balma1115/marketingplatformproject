# 09_관리자_사용자관리 모듈

## 개요
사용자 계정 관리, 권한 설정, 사용자 활동 모니터링을 담당하는 관리자 전용 모듈입니다.

## 주요 기능
- 사용자 계정 생성/수정/삭제
- 사용자 권한 및 역할 관리
- 코인 충전 및 사용내역 관리
- 사용자 활동 로그 조회
- 계정 상태 관리 (활성/비활성/정지)
- 대량 사용자 관리 기능

## 기술 스택

### Frontend
- React 18 with TypeScript
- Advanced data tables with sorting/filtering
- Bulk operation components
- User activity timeline
- Role-based access control UI

### Backend
- Node.js with Express
- User management services
- Activity logging system
- Bulk operations engine

## 프로젝트 구조

```
09_관리자_사용자관리/
├── frontend/
│   ├── components/
│   │   ├── UserTable.tsx
│   │   ├── UserEditModal.tsx
│   │   ├── BulkActionPanel.tsx
│   │   ├── ActivityTimeline.tsx
│   │   ├── CoinManagement.tsx
│   │   └── RolePermissionMatrix.tsx
│   ├── pages/
│   │   └── UserManagement.tsx
│   └── styles/
│       ├── UserManagement.css
│       ├── UserTable.css
│       └── ActivityTimeline.css
├── backend/
│   ├── routes/
│   │   ├── user-management.routes.ts
│   │   ├── user-activity.routes.ts
│   │   └── bulk-operations.routes.ts
│   ├── services/
│   │   ├── userManagementService.ts
│   │   ├── coinManagementService.ts
│   │   ├── activityLoggingService.ts
│   │   └── bulkOperationService.ts
│   └── config/
│       ├── user-roles.json
│       └── permissions-matrix.json
└── database/
    └── user_management_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom react-table @tanstack/react-table date-fns

# Backend 의존성
npm install bcrypt jsonwebtoken csv-parser multer
```

### 환경 변수
```env
# 사용자 관리 설정
MAX_USERS_PER_PAGE=50
BULK_OPERATION_LIMIT=1000
USER_SESSION_TIMEOUT=3600

# 보안 설정
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL_CHARS=true
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=1800

# 코인 관리 설정
DEFAULT_COIN_AMOUNT=100
MAX_COIN_AMOUNT=10000
COIN_TRANSACTION_LIMIT=1000
```

## API 엔드포인트

### 사용자 관리
```http
GET /api/admin/users
?page=1&limit=50&search=keyword&status=active&role=user
POST /api/admin/users
PUT /api/admin/users/:userId
DELETE /api/admin/users/:userId
POST /api/admin/users/:userId/reset-password
POST /api/admin/users/:userId/toggle-status
```

### 코인 관리
```http
GET /api/admin/users/:userId/coins
POST /api/admin/users/:userId/coins/add
POST /api/admin/users/:userId/coins/deduct
GET /api/admin/users/:userId/coin-transactions
POST /api/admin/coins/bulk-adjustment
```

### 사용자 활동
```http
GET /api/admin/users/:userId/activity
?startDate=2025-01-01&endDate=2025-01-31&type=login
GET /api/admin/users/activity/summary
POST /api/admin/users/:userId/activity/export
```

### 대량 작업
```http
POST /api/admin/users/bulk/create
POST /api/admin/users/bulk/update
POST /api/admin/users/bulk/delete
POST /api/admin/users/bulk/coin-adjustment
GET /api/admin/users/bulk/operations/:operationId/status
```

## 데이터베이스 스키마

### users 테이블 (확장)
```sql
-- 기존 users 테이블에 추가 필드
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status ENUM('active', 'inactive', 'suspended', 'deleted') DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
```

### user_roles 테이블
```sql
CREATE TABLE user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 기본 역할 데이터
INSERT INTO user_roles (role_name, display_name, description, permissions) VALUES
('admin', '관리자', '시스템 전체 관리 권한', '["all"]'),
('user', '일반 사용자', '기본 서비스 이용 권한', '["ai_writing", "image_generation", "keyword_analysis", "smart_place"]'),
('premium', '프리미엄 사용자', '고급 기능 이용 권한', '["ai_writing", "image_generation", "keyword_analysis", "smart_place", "advanced_analytics"]');
```

### coin_transactions 테이블
```sql
CREATE TABLE coin_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    transaction_type ENUM('purchase', 'usage', 'refund', 'admin_adjustment') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    service_type VARCHAR(50),
    description TEXT,
    admin_user_id INT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (admin_user_id) REFERENCES users(id),
    INDEX idx_user_date (user_id, transaction_date),
    INDEX idx_type (transaction_type, transaction_date)
);
```

### user_sessions 테이블
```sql
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    logout_time TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_session (user_id, is_active),
    INDEX idx_token (session_token)
);
```

### bulk_operations 테이블
```sql
CREATE TABLE bulk_operations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation_type ENUM('create', 'update', 'delete', 'coin_adjustment') NOT NULL,
    initiated_by INT NOT NULL,
    total_records INT NOT NULL,
    processed_records INT DEFAULT 0,
    successful_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    operation_data JSON,
    error_log JSON,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (initiated_by) REFERENCES users(id),
    INDEX idx_status (status, started_at)
);
```

## 사용자 관리 서비스

### 사용자 생성 및 관리
```typescript
class UserManagementService {
  async createUser(userData: CreateUserData, adminId: number): Promise<User> {
    // 이메일 중복 확인
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('이미 존재하는 이메일입니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // 사용자 생성
    const newUser = await this.db.query(`
      INSERT INTO users (
        email, password, name, phone, branch_name, role,
        coin, account_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())
    `, [
      userData.email,
      hashedPassword,
      userData.name,
      userData.phone,
      userData.branchName,
      userData.role || 'user',
      userData.initialCoin || 100
    ]);

    // 활동 로그 기록
    await this.logActivity(newUser.insertId, 'account_created', {
      createdBy: adminId,
      initialCoin: userData.initialCoin || 100
    });

    return await this.findById(newUser.insertId);
  }

  async updateUser(userId: number, updateData: UpdateUserData, adminId: number): Promise<User> {
    const currentUser = await this.findById(userId);
    if (!currentUser) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 비밀번호 변경 시 해싱
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updateFields = Object.keys(updateData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    const updateValues = Object.values(updateData);

    await this.db.query(`
      UPDATE users SET ${updateFields}, updated_at = NOW()
      WHERE id = ?
    `, [...updateValues, userId]);

    // 변경 사항 로그 기록
    await this.logActivity(userId, 'account_updated', {
      updatedBy: adminId,
      changes: this.getChanges(currentUser, updateData),
      previousData: this.sanitizeUserData(currentUser)
    });

    return await this.findById(userId);
  }

  async toggleUserStatus(userId: number, adminId: number): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const newStatus = user.account_status === 'active' ? 'inactive' : 'active';

    await this.db.query(`
      UPDATE users SET account_status = ?, updated_at = NOW()
      WHERE id = ?
    `, [newStatus, userId]);

    // 상태 변경 시 모든 세션 무효화
    if (newStatus === 'inactive' || newStatus === 'suspended') {
      await this.invalidateAllUserSessions(userId);
    }

    await this.logActivity(userId, 'status_changed', {
      changedBy: adminId,
      oldStatus: user.account_status,
      newStatus: newStatus
    });

    return await this.findById(userId);
  }

  private async invalidateAllUserSessions(userId: number): Promise<void> {
    await this.db.query(`
      UPDATE user_sessions 
      SET is_active = FALSE, logout_time = NOW()
      WHERE user_id = ? AND is_active = TRUE
    `, [userId]);
  }
}
```

### 코인 관리 서비스
```typescript
class CoinManagementService {
  async adjustUserCoin(
    userId: number, 
    amount: number, 
    type: 'add' | 'deduct', 
    reason: string,
    adminId: number
  ): Promise<CoinTransaction> {
    return await this.db.transaction(async (trx) => {
      // 현재 잔액 조회 (FOR UPDATE로 락)
      const user = await trx.query(
        'SELECT coin FROM users WHERE id = ? FOR UPDATE', 
        [userId]
      );
      
      if (!user.length) {
        throw new Error('사용자를 찾을 수 없습니다.');
      }

      const currentBalance = parseFloat(user[0].coin);
      const adjustmentAmount = type === 'deduct' ? -Math.abs(amount) : Math.abs(amount);
      const newBalance = currentBalance + adjustmentAmount;

      // 잔액 부족 체크
      if (newBalance < 0) {
        throw new Error('코인 잔액이 부족합니다.');
      }

      // 잔액 업데이트
      await trx.query(
        'UPDATE users SET coin = ?, updated_at = NOW() WHERE id = ?',
        [newBalance, userId]
      );

      // 거래 내역 기록
      const transactionResult = await trx.query(`
        INSERT INTO coin_transactions (
          user_id, transaction_type, amount, balance_before, 
          balance_after, description, admin_user_id, transaction_date
        ) VALUES (?, 'admin_adjustment', ?, ?, ?, ?, ?, NOW())
      `, [userId, adjustmentAmount, currentBalance, newBalance, reason, adminId]);

      // 활동 로그 기록
      await this.logActivity(userId, 'coin_adjusted', {
        adjustedBy: adminId,
        amount: adjustmentAmount,
        previousBalance: currentBalance,
        newBalance: newBalance,
        reason: reason
      });

      return {
        id: transactionResult.insertId,
        userId,
        amount: adjustmentAmount,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        reason,
        adminId,
        createdAt: new Date()
      };
    });
  }

  async bulkCoinAdjustment(
    adjustments: BulkCoinAdjustment[],
    adminId: number
  ): Promise<BulkOperationResult> {
    const operationId = await this.createBulkOperation('coin_adjustment', adminId, adjustments.length);
    
    // 비동기로 처리
    this.processBulkCoinAdjustment(operationId, adjustments, adminId);
    
    return { operationId, status: 'pending', totalRecords: adjustments.length };
  }

  private async processBulkCoinAdjustment(
    operationId: number,
    adjustments: BulkCoinAdjustment[],
    adminId: number
  ): Promise<void> {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    await this.updateBulkOperationStatus(operationId, 'processing');

    for (const adjustment of adjustments) {
      try {
        await this.adjustUserCoin(
          adjustment.userId,
          adjustment.amount,
          adjustment.type,
          adjustment.reason,
          adminId
        );
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          userId: adjustment.userId,
          error: error.message
        });
      }
      
      processed++;
      
      // 진행률 업데이트 (100개마다)
      if (processed % 100 === 0) {
        await this.updateBulkOperationProgress(operationId, processed, successful, failed);
      }
    }

    // 최종 상태 업데이트
    await this.completeBulkOperation(operationId, processed, successful, failed, errors);
  }

  async getCoinTransactionHistory(
    userId: number,
    page: number = 1,
    limit: number = 50,
    type?: string
  ): Promise<PaginatedCoinTransactions> {
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (type) {
      whereClause += ' AND transaction_type = ?';
      params.push(type);
    }

    const [transactions, countResult] = await Promise.all([
      this.db.query(`
        SELECT 
          ct.*,
          u.name as admin_name
        FROM coin_transactions ct
        LEFT JOIN users u ON ct.admin_user_id = u.id
        ${whereClause}
        ORDER BY transaction_date DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]),
      
      this.db.query(`
        SELECT COUNT(*) as total 
        FROM coin_transactions 
        ${whereClause}
      `, params)
    ]);

    return {
      transactions,
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

### 활동 로깅 서비스
```typescript
class ActivityLoggingService {
  async logUserActivity(
    userId: number,
    activityType: string,
    details: any = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO user_activity_logs (
        user_id, activity_type, activity_detail, 
        ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      activityType,
      JSON.stringify(details),
      ipAddress,
      userAgent
    ]);
  }

  async getUserActivitySummary(userId: number, days: number = 30): Promise<ActivitySummary> {
    const query = `
      SELECT 
        activity_type,
        COUNT(*) as count,
        DATE(created_at) as activity_date
      FROM user_activity_logs 
      WHERE user_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY activity_type, DATE(created_at)
      ORDER BY activity_date DESC, activity_type
    `;

    const activities = await this.db.query(query, [userId, days]);
    
    return this.processActivitySummary(activities);
  }

  async getActivityTimeline(
    userId: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<ActivityTimelineItem[]> {
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(endDate);
    }

    const activities = await this.db.query(`
      SELECT 
        activity_type,
        activity_detail,
        ip_address,
        user_agent,
        created_at
      FROM user_activity_logs 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `, [...params, limit]);

    return activities.map(activity => ({
      ...activity,
      activityDetail: JSON.parse(activity.activity_detail || '{}'),
      formattedTime: new Date(activity.created_at).toLocaleString('ko-KR')
    }));
  }

  private processActivitySummary(activities: any[]): ActivitySummary {
    const summary: ActivitySummary = {
      totalActivities: 0,
      byType: {},
      byDate: {},
      mostActiveDay: null,
      mostCommonActivity: null
    };

    const typeCounts = new Map<string, number>();
    const dateCounts = new Map<string, number>();

    activities.forEach(activity => {
      summary.totalActivities += activity.count;
      
      // 활동 유형별 집계
      const currentTypeCount = typeCounts.get(activity.activity_type) || 0;
      typeCounts.set(activity.activity_type, currentTypeCount + activity.count);
      
      // 날짜별 집계
      const currentDateCount = dateCounts.get(activity.activity_date) || 0;
      dateCounts.set(activity.activity_date, currentDateCount + activity.count);
    });

    summary.byType = Object.fromEntries(typeCounts);
    summary.byDate = Object.fromEntries(dateCounts);

    // 가장 활발한 날과 가장 많은 활동 찾기
    summary.mostActiveDay = [...dateCounts.entries()]
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
    
    summary.mostCommonActivity = [...typeCounts.entries()]
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    return summary;
  }
}
```

## 대량 작업 처리

### 대량 사용자 생성
```typescript
class BulkOperationService {
  async bulkCreateUsers(
    userData: CreateUserData[],
    adminId: number
  ): Promise<BulkOperationResult> {
    // CSV 파일 검증
    const validationErrors = await this.validateUserData(userData);
    if (validationErrors.length > 0) {
      throw new Error(`데이터 검증 오류: ${validationErrors.join(', ')}`);
    }

    const operationId = await this.createBulkOperation('create', adminId, userData.length);
    
    // 비동기로 처리
    this.processBulkUserCreation(operationId, userData, adminId);
    
    return { operationId, status: 'pending', totalRecords: userData.length };
  }

  private async processBulkUserCreation(
    operationId: number,
    userData: CreateUserData[],
    adminId: number
  ): Promise<void> {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    await this.updateBulkOperationStatus(operationId, 'processing');

    for (const user of userData) {
      try {
        await this.userService.createUser(user, adminId);
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          email: user.email,
          error: error.message
        });
      }
      
      processed++;
      
      // 진행률 업데이트
      if (processed % 10 === 0) {
        await this.updateBulkOperationProgress(operationId, processed, successful, failed);
      }
    }

    await this.completeBulkOperation(operationId, processed, successful, failed, errors);
  }

  private async validateUserData(userData: CreateUserData[]): Promise<string[]> {
    const errors: string[] = [];
    const emailSet = new Set<string>();

    for (let i = 0; i < userData.length; i++) {
      const user = userData[i];
      const rowNum = i + 1;

      // 필수 필드 검증
      if (!user.email) errors.push(`${rowNum}행: 이메일 필수`);
      if (!user.name) errors.push(`${rowNum}행: 이름 필수`);
      if (!user.password) errors.push(`${rowNum}행: 비밀번호 필수`);

      // 이메일 형식 검증
      if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
        errors.push(`${rowNum}행: 잘못된 이메일 형식`);
      }

      // 이메일 중복 검증 (파일 내)
      if (user.email) {
        if (emailSet.has(user.email)) {
          errors.push(`${rowNum}행: 파일 내 중복 이메일`);
        } else {
          emailSet.add(user.email);
        }
      }

      // 비밀번호 강도 검증
      if (user.password && user.password.length < 8) {
        errors.push(`${rowNum}행: 비밀번호 8자 이상`);
      }

      // 역할 검증
      if (user.role && !['user', 'admin', 'premium'].includes(user.role)) {
        errors.push(`${rowNum}행: 잘못된 역할`);
      }
    }

    // 데이터베이스 중복 검증 (기존 사용자와)
    if (emailSet.size > 0) {
      const existingEmails = await this.checkExistingEmails(Array.from(emailSet));
      existingEmails.forEach(email => {
        errors.push(`데이터베이스 중복 이메일: ${email}`);
      });
    }

    return errors;
  }

  async getBulkOperationStatus(operationId: number): Promise<BulkOperationStatus> {
    const operation = await this.db.query(
      'SELECT * FROM bulk_operations WHERE id = ?',
      [operationId]
    );

    if (!operation.length) {
      throw new Error('작업을 찾을 수 없습니다.');
    }

    const op = operation[0];
    
    return {
      id: op.id,
      type: op.operation_type,
      status: op.status,
      totalRecords: op.total_records,
      processedRecords: op.processed_records,
      successfulRecords: op.successful_records,
      failedRecords: op.failed_records,
      progress: op.total_records > 0 ? (op.processed_records / op.total_records) * 100 : 0,
      startedAt: op.started_at,
      completedAt: op.completed_at,
      errors: op.error_log ? JSON.parse(op.error_log) : [],
      estimatedTimeRemaining: this.calculateEstimatedTime(op)
    };
  }
}
```

## 프론트엔드 컴포넌트

### 사용자 관리 테이블
```typescript
import React, { useState, useEffect } from 'react';
import { useTable, usePagination, useSortBy, useFilters } from 'react-table';

const UserManagementTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  const columns = React.useMemo(() => [
    {
      Header: '선택',
      id: 'selection',
      Cell: ({ row }: any) => (
        <input
          type="checkbox"
          checked={selectedUsers.includes(row.original.id)}
          onChange={() => toggleUserSelection(row.original.id)}
        />
      )
    },
    {
      Header: '이메일',
      accessor: 'email',
      Filter: TextFilter
    },
    {
      Header: '이름',
      accessor: 'name',
      Filter: TextFilter
    },
    {
      Header: '역할',
      accessor: 'role',
      Filter: SelectFilter,
      filter: 'equals'
    },
    {
      Header: '상태',
      accessor: 'account_status',
      Cell: ({ value }: any) => (
        <span className={`status-badge ${value}`}>
          {getStatusLabel(value)}
        </span>
      ),
      Filter: SelectFilter
    },
    {
      Header: '코인',
      accessor: 'coin',
      Cell: ({ value }: any) => `${value}냥`
    },
    {
      Header: '가입일',
      accessor: 'created_at',
      Cell: ({ value }: any) => new Date(value).toLocaleDateString()
    },
    {
      Header: '마지막 로그인',
      accessor: 'last_login',
      Cell: ({ value }: any) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      Header: '작업',
      id: 'actions',
      Cell: ({ row }: any) => (
        <div className="action-buttons">
          <button onClick={() => editUser(row.original)} className="edit-btn">
            수정
          </button>
          <button 
            onClick={() => toggleUserStatus(row.original.id)} 
            className={`status-btn ${row.original.account_status}`}
          >
            {row.original.account_status === 'active' ? '비활성화' : '활성화'}
          </button>
          <button onClick={() => manageCoin(row.original)} className="coin-btn">
            코인관리
          </button>
        </div>
      )
    }
  ], [selectedUsers]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data: users,
      initialState: { pageIndex: 0 }
    },
    useFilters,
    useSortBy,
    usePagination
  );

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users', {
        params: {
          page: pageIndex + 1,
          limit: pageSize
        }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-management-table">
      <div className="table-header">
        <h2>사용자 관리</h2>
        <div className="bulk-actions">
          {selectedUsers.length > 0 && (
            <>
              <button onClick={handleBulkDelete} className="bulk-delete">
                선택 삭제 ({selectedUsers.length})
              </button>
              <button onClick={handleBulkCoinAdjustment} className="bulk-coin">
                코인 일괄 조정
              </button>
            </>
          )}
          <button onClick={() => setShowCreateModal(true)} className="create-user">
            사용자 생성
          </button>
        </div>
      </div>

      <table {...getTableProps()} className="users-table">
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                  <div>{column.canFilter ? column.render('Filter') : null}</div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="pagination">
        <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
          {'<<'}
        </button>
        <button onClick={() => previousPage()} disabled={!canPreviousPage}>
          {'<'}
        </button>
        <button onClick={() => nextPage()} disabled={!canNextPage}>
          {'>'}
        </button>
        <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
          {'>>'}
        </button>
        <span>
          페이지{' '}
          <strong>
            {pageIndex + 1} / {pageOptions.length}
          </strong>
        </span>
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              {pageSize}개씩 보기
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
```

## 보안 및 감사

### 감사 로그 시스템
```typescript
class AuditLogService {
  async logAdminAction(
    adminId: number,
    action: string,
    targetUserId?: number,
    details: any = {},
    ipAddress?: string
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO admin_audit_logs (
        admin_id, action, target_user_id, action_details,
        ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      adminId,
      action,
      targetUserId,
      JSON.stringify(details),
      ipAddress
    ]);
  }

  async getAuditTrail(
    targetUserId?: number,
    adminId?: number,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    let whereConditions = [];
    let params = [];

    if (targetUserId) {
      whereConditions.push('target_user_id = ?');
      params.push(targetUserId);
    }

    if (adminId) {
      whereConditions.push('admin_id = ?');
      params.push(adminId);
    }

    if (startDate) {
      whereConditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereConditions.push('created_at <= ?');
      params.push(endDate);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const logs = await this.db.query(`
      SELECT 
        aal.*,
        admin_user.name as admin_name,
        target_user.name as target_user_name
      FROM admin_audit_logs aal
      LEFT JOIN users admin_user ON aal.admin_id = admin_user.id
      LEFT JOIN users target_user ON aal.target_user_id = target_user.id
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `, [...params, limit]);

    return logs.map(log => ({
      ...log,
      actionDetails: JSON.parse(log.action_details || '{}'),
      formattedDate: new Date(log.created_at).toLocaleString('ko-KR')
    }));
  }
}
```

## 트러블슈팅

### 성능 최적화
```typescript
class UserManagementOptimizer {
  // 사용자 목록 조회 최적화
  async getOptimizedUserList(params: UserListParams): Promise<PaginatedUsers> {
    const { page = 1, limit = 50, search, status, role } = params;
    const offset = (page - 1) * limit;

    // 인덱스 활용을 위한 쿼리 최적화
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (search) {
      whereClause += ' AND (email LIKE ? OR name LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND account_status = ?';
      queryParams.push(status);
    }

    if (role) {
      whereClause += ' AND role = ?';
      queryParams.push(role);
    }

    // COUNT 쿼리 최적화 (covering index 활용)
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users 
      ${whereClause}
    `;

    // 메인 쿼리 (필요한 컬럼만 선택)
    const mainQuery = `
      SELECT 
        id, email, name, role, account_status, coin,
        created_at, updated_at, last_login
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [users, countResult] = await Promise.all([
      this.db.query(mainQuery, [...queryParams, limit, offset]),
      this.db.query(countQuery, queryParams)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  // 메모리 캐싱 최적화
  private userCache = new Map<number, { user: User, timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5분

  async getCachedUser(userId: number): Promise<User | null> {
    const cached = this.userCache.get(userId);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.user;
    }

    const user = await this.findById(userId);
    if (user) {
      this.userCache.set(userId, { user, timestamp: Date.now() });
    }

    return user;
  }
}
```

## 업데이트 로그

### v1.3.0 (2025-08-20)
- 대량 작업 처리 성능 최적화
- 감사 로그 시스템 고도화
- 사용자 활동 타임라인 추가

### v1.2.0 (2025-08-05)
- 코인 거래 내역 상세 조회 기능
- 사용자 세션 관리 강화
- 계정 보안 설정 개선

### v1.1.0 (2025-07-20)
- 대량 사용자 생성 기능
- 활동 로그 분석 도구
- 사용자 권한 매트릭스 구현

### v1.0.0 (2025-07-01)
- 기본 사용자 관리 기능
- 코인 관리 시스템
- 사용자 활동 모니터링