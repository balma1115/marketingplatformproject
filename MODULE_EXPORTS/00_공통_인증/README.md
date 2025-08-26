# 00_공통_인증 모듈

## 개요
사용자 인증, 권한 관리, 세션 관리를 담당하는 공통 모듈입니다.

## 주요 기능
- JWT 기반 사용자 인증
- 회원가입 및 로그인
- 계층형 권한 시스템 (관리자/사용자/프리미엄)
- 세션 관리 및 자동 로그아웃
- 비밀번호 재설정
- 2FA (Two-Factor Authentication)
- 조직별 권한 관리

## 기술 스택

### Frontend
- React 18 with TypeScript
- React Context for authentication state
- Protected routes with React Router
- Secure token storage (httpOnly cookies)

### Backend
- Node.js with Express
- JWT (JSON Web Tokens)
- bcrypt for password hashing
- Express middleware for authentication
- Rate limiting for security

## 프로젝트 구조

```
00_공통_인증/
├── frontend/
│   ├── components/
│   │   ├── ProtectedRoute.tsx
│   │   ├── LoginForm.tsx
│   │   └── AuthGuard.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── ForgotPasswordPage.tsx
│   └── contexts/
│       └── AuthContext.tsx
├── backend/
│   ├── routes/
│   │   └── auth.routes.ts
│   ├── services/
│   │   ├── authService.ts
│   │   ├── tokenService.ts
│   │   └── passwordResetService.ts
│   └── middleware/
│       ├── authMiddleware.ts
│       ├── adminMiddleware.ts
│       └── hierarchicalAuthMiddleware.ts
└── database/
    └── auth_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom react-router-dom

# Backend 의존성
npm install jsonwebtoken bcryptjs express-rate-limit cookie-parser
```

### 환경 변수
```env
# JWT 설정
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# 보안 설정
BCRYPT_SALT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_TIME=1800
SESSION_TIMEOUT=3600

# 비밀번호 정책
MIN_PASSWORD_LENGTH=8
REQUIRE_SPECIAL_CHARS=true
REQUIRE_NUMBERS=true
REQUIRE_UPPERCASE=true

# Rate Limiting
LOGIN_RATE_LIMIT=10
LOGIN_RATE_WINDOW=900000
```

## API 엔드포인트

### 인증
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "홍길동",
  "phone": "010-1234-5678",
  "inviteCode": "12345678"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

```http
POST /api/auth/logout
```

```http
GET /api/auth/me
```

```http
POST /api/auth/refresh
```

### 비밀번호 관리
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token",
  "newPassword": "NewSecurePass123!"
}
```

```http
PUT /api/auth/change-password
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

## 데이터베이스 스키마

### users 테이블 (확장)
```sql
-- 인증 관련 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

### refresh_tokens 테이블
```sql
CREATE TABLE refresh_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE,
    device_info JSON,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_token (token),
    INDEX idx_user_expires (user_id, expires_at)
);
```

### login_history 테이블
```sql
CREATE TABLE login_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    login_success BOOLEAN DEFAULT TRUE,
    failure_reason VARCHAR(255),
    session_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_time (user_id, login_time),
    INDEX idx_ip_time (ip_address, login_time)
);
```

### role_permissions 테이블
```sql
CREATE TABLE role_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    allowed_actions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_permission (role_name, permission_name, resource_type),
    INDEX idx_role (role_name)
);

-- 기본 권한 데이터
INSERT INTO role_permissions (role_name, permission_name, resource_type, allowed_actions) VALUES
('admin', 'all', '*', '["create", "read", "update", "delete"]'),
('user', 'ai_writing', 'service', '["read", "create"]'),
('user', 'image_generation', 'service', '["read", "create"]'),
('user', 'keyword_analysis', 'service', '["read", "create"]'),
('user', 'smart_place', 'service', '["read", "create"]'),
('premium', 'ai_writing', 'service', '["read", "create"]'),
('premium', 'image_generation', 'service', '["read", "create"]'),
('premium', 'keyword_analysis', 'service', '["read", "create"]'),
('premium', 'smart_place', 'service', '["read", "create"]'),
('premium', 'advanced_analytics', 'service', '["read", "create"]');
```

## 인증 서비스

### JWT 인증 서비스
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

class AuthService {
  async register(userData: RegisterData): Promise<AuthResult> {
    // 이메일 중복 확인
    const existingUser = await this.findUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('이미 존재하는 이메일입니다.');
    }

    // 비밀번호 정책 검증
    this.validatePassword(userData.password);

    // 가입 코드 검증 (있는 경우)
    let organizationInfo = null;
    if (userData.inviteCode) {
      organizationInfo = await this.validateInviteCode(userData.inviteCode);
    }

    // 비밀번호 해싱
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // 사용자 생성
    const userId = await this.createUser({
      ...userData,
      passwordHash,
      emailVerified: false
    });

    // 조직 배정 (가입 코드가 있는 경우)
    if (organizationInfo) {
      await this.assignUserToOrganization(userId, organizationInfo.academyId);
      await this.useInviteCode(userData.inviteCode, userId);
    }

    // 이메일 인증 토큰 생성 및 발송
    await this.sendEmailVerification(userData.email);

    // JWT 토큰 생성
    const tokens = await this.generateTokens(userId);
    
    return {
      user: await this.findUserById(userId),
      ...tokens
    };
  }

  async login(email: string, password: string, deviceInfo?: DeviceInfo): Promise<AuthResult> {
    const user = await this.findUserByEmail(email);
    
    if (!user) {
      await this.logFailedLogin(email, 'user_not_found', deviceInfo);
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 계정 잠금 확인
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      throw new Error('계정이 일시적으로 잠금되었습니다. 나중에 다시 시도하세요.');
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, deviceInfo);
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // 계정 상태 확인
    if (!user.is_active) {
      throw new Error('비활성화된 계정입니다.');
    }

    // 로그인 성공 처리
    await this.handleSuccessfulLogin(user.id, deviceInfo);

    // JWT 토큰 생성
    const tokens = await this.generateTokens(user.id);

    return {
      user: this.sanitizeUser(user),
      ...tokens
    };
  }

  async generateTokens(userId: number): Promise<TokenPair> {
    const user = await this.findUserById(userId);
    
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      academyId: user.academy_id
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: 'marketingplat',
      audience: 'marketingplat-users'
    });

    const refreshToken = jwt.sign(
      { id: user.id, tokenType: 'refresh' }, 
      process.env.JWT_SECRET!, 
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    );

    // 리프레시 토큰 DB 저장
    await this.storeRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  private async handleFailedLogin(userId: number, deviceInfo?: DeviceInfo): Promise<void> {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
    const lockoutTime = parseInt(process.env.ACCOUNT_LOCKOUT_TIME || '1800');

    await this.db.transaction(async (trx) => {
      // 로그인 시도 횟수 증가
      const result = await trx.query(
        'UPDATE users SET login_attempts = login_attempts + 1 WHERE id = ?',
        [userId]
      );

      const user = await trx.query('SELECT login_attempts FROM users WHERE id = ?', [userId]);
      const attempts = user[0].login_attempts;

      // 최대 시도 횟수 초과 시 계정 잠금
      if (attempts >= maxAttempts) {
        const lockUntil = new Date(Date.now() + lockoutTime * 1000);
        await trx.query(
          'UPDATE users SET locked_until = ? WHERE id = ?',
          [lockUntil, userId]
        );
      }

      // 실패 로그 기록
      await this.logFailedLogin(userId, 'invalid_password', deviceInfo);
    });
  }

  private async handleSuccessfulLogin(userId: number, deviceInfo?: DeviceInfo): Promise<void> {
    await this.db.transaction(async (trx) => {
      // 로그인 시도 횟수 초기화
      await trx.query(`
        UPDATE users 
        SET login_attempts = 0, locked_until = NULL, last_login = NOW()
        WHERE id = ?
      `, [userId]);

      // 성공 로그 기록
      await trx.query(`
        INSERT INTO login_history (
          user_id, login_success, ip_address, user_agent, device_fingerprint
        ) VALUES (?, TRUE, ?, ?, ?)
      `, [
        userId,
        deviceInfo?.ipAddress,
        deviceInfo?.userAgent,
        deviceInfo?.fingerprint
      ]);
    });
  }

  private validatePassword(password: string): void {
    const minLength = parseInt(process.env.MIN_PASSWORD_LENGTH || '8');
    
    if (password.length < minLength) {
      throw new Error(`비밀번호는 최소 ${minLength}자 이상이어야 합니다.`);
    }

    if (process.env.REQUIRE_UPPERCASE === 'true' && !/[A-Z]/.test(password)) {
      throw new Error('비밀번호는 대문자를 포함해야 합니다.');
    }

    if (process.env.REQUIRE_NUMBERS === 'true' && !/\d/.test(password)) {
      throw new Error('비밀번호는 숫자를 포함해야 합니다.');
    }

    if (process.env.REQUIRE_SPECIAL_CHARS === 'true' && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('비밀번호는 특수문자를 포함해야 합니다.');
    }
  }
}
```

### 권한 관리 서비스
```typescript
class PermissionService {
  async checkPermission(
    userId: number, 
    resource: string, 
    action: string,
    resourceId?: number
  ): Promise<boolean> {
    const user = await this.findUserById(userId);
    
    // 관리자는 모든 권한
    if (user.role === 'admin') return true;

    // 역할 기반 권한 확인
    const rolePermissions = await this.getRolePermissions(user.role);
    const hasRolePermission = this.checkRolePermission(rolePermissions, resource, action);
    
    if (!hasRolePermission) return false;

    // 조직 기반 권한 확인 (필요한 경우)
    if (resourceId && this.requiresOrganizationCheck(resource)) {
      return await this.checkOrganizationPermission(userId, resource, resourceId);
    }

    return true;
  }

  private async checkOrganizationPermission(
    userId: number, 
    resource: string, 
    resourceId: number
  ): Promise<boolean> {
    const userOrganization = await this.getUserOrganization(userId);
    const resourceOrganization = await this.getResourceOrganization(resource, resourceId);

    // 같은 조직 내에서만 접근 허용
    return userOrganization?.academy_id === resourceOrganization?.academy_id;
  }

  async hasAnyPermission(userId: number, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      const [resource, action] = permission.split(':');
      if (await this.checkPermission(userId, resource, action)) {
        return true;
      }
    }
    return false;
  }

  async getUserPermissions(userId: number): Promise<UserPermissions> {
    const user = await this.findUserById(userId);
    const rolePermissions = await this.getRolePermissions(user.role);
    const organizationInfo = await this.getUserOrganization(userId);

    return {
      userId: user.id,
      role: user.role,
      rolePermissions,
      organizationPermissions: organizationInfo ? {
        academyId: organizationInfo.academy_id,
        branchId: organizationInfo.branch_id,
        subjectId: organizationInfo.subject_id,
        assignmentType: organizationInfo.assignment_type
      } : null,
      effectivePermissions: this.calculateEffectivePermissions(rolePermissions, organizationInfo)
    };
  }
}
```

## 미들웨어

### 인증 미들웨어
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 기본 인증 미들웨어
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ error: '유효하지 않은 사용자입니다.' });
    }

    // 세션 타임아웃 확인
    const lastActivity = req.session?.lastActivity;
    const timeout = parseInt(process.env.SESSION_TIMEOUT || '3600');
    
    if (lastActivity && Date.now() - lastActivity > timeout * 1000) {
      return res.status(401).json({ error: '세션이 만료되었습니다.' });
    }

    req.user = user;
    req.session = { ...req.session, lastActivity: Date.now() };
    next();
  } catch (error) {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
};

// 관리자 권한 미들웨어
export const adminMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
};

// 권한 확인 미들웨어
export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다.' });
    }

    const hasPermission = await permissionService.checkPermission(
      req.user.id, 
      resource, 
      action,
      parseInt(req.params.id) || undefined
    );

    if (!hasPermission) {
      return res.status(403).json({ error: '권한이 부족합니다.' });
    }

    next();
  };
};

// Rate limiting 미들웨어
export const loginRateLimit = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_WINDOW || '900000'), // 15분
  max: parseInt(process.env.LOGIN_RATE_LIMIT || '10'), // 최대 10회
  message: '너무 많은 로그인 시도입니다. 나중에 다시 시도하세요.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) => req.user?.role === 'admin' // 관리자는 제외
});
```

## 프론트엔드 인증 컨텍스트

### Auth Context
```typescript
import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState, action: any): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await api.post('/auth/login', { email, password });
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.response?.data?.error || '로그인 실패' });
    }
  };

  const register = async (userData: RegisterData) => {
    dispatch({ type: 'AUTH_START' });
    
    try {
      const response = await api.post('/auth/register', userData);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE', payload: error.response?.data?.error || '회원가입 실패' });
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const refreshAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
    } catch (error) {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // 초기 인증 상태 확인
  useEffect(() => {
    refreshAuth();
  }, []);

  // 토큰 자동 갱신
  useEffect(() => {
    if (state.isAuthenticated) {
      const interval = setInterval(() => {
        api.post('/auth/refresh').catch(() => {
          dispatch({ type: 'AUTH_LOGOUT' });
        });
      }, 50 * 60 * 1000); // 50분마다

      return () => clearInterval(interval);
    }
  }, [state.isAuthenticated]);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      logout,
      refreshAuth,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Protected Route 컴포넌트
```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requiredPermission 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="loading">인증 확인 중...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !hasPermission(user, requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  
  // 권한 확인 로직 구현
  const [resource, action] = permission.split(':');
  return user.permissions?.includes(permission) || false;
};

export default ProtectedRoute;
```

## 보안 기능

### 비밀번호 재설정
```typescript
class PasswordResetService {
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      // 보안상 사용자 존재 여부를 알리지 않음
      return;
    }

    // 재설정 토큰 생성
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1시간 후 만료

    await this.db.query(`
      UPDATE users 
      SET password_reset_token = ?, password_reset_expires = ?
      WHERE id = ?
    `, [resetToken, resetExpires, user.id]);

    // 이메일 발송
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.db.query(`
      SELECT * FROM users 
      WHERE password_reset_token = ? 
        AND password_reset_expires > NOW()
    `);

    if (!user.length) {
      throw new Error('유효하지 않거나 만료된 토큰입니다.');
    }

    // 비밀번호 정책 검증
    this.validatePassword(newPassword);

    // 비밀번호 변경
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    await this.db.query(`
      UPDATE users 
      SET password_hash = ?, 
          password_reset_token = NULL, 
          password_reset_expires = NULL,
          last_password_change = NOW()
      WHERE id = ?
    `, [passwordHash, user[0].id]);

    // 모든 세션 무효화
    await this.invalidateAllUserSessions(user[0].id);
  }
}
```

## 트러블슈팅

### 일반적인 문제
1. **토큰 만료**: 자동 토큰 갱신 로직 확인
2. **세션 충돌**: 다중 디바이스 로그인 처리
3. **권한 오류**: 역할별 권한 매트릭스 점검

### 보안 모니터링
```typescript
class SecurityMonitor {
  async detectSuspiciousActivity(userId: number): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // 다중 지역 로그인 감지
    const recentLogins = await this.getRecentLogins(userId, 24);
    const uniqueLocations = new Set(recentLogins.map(l => l.ip_address));
    
    if (uniqueLocations.size > 3) {
      alerts.push({
        type: 'multiple_locations',
        severity: 'medium',
        description: '24시간 내 여러 지역에서 로그인'
      });
    }

    // 무차별 대입 공격 감지
    const failedAttempts = await this.getFailedLoginAttempts(userId, 60);
    if (failedAttempts.length > 10) {
      alerts.push({
        type: 'brute_force',
        severity: 'high',
        description: '짧은 시간 내 다수 로그인 실패'
      });
    }

    return alerts;
  }
}
```

## 업데이트 로그

### v1.3.0 (2025-08-25)
- 2FA (Two-Factor Authentication) 추가
- 계층형 권한 시스템 구현
- 보안 모니터링 강화

### v1.2.0 (2025-08-10)
- 리프레시 토큰 시스템 도입
- 세션 관리 개선
- 비밀번호 정책 강화

### v1.1.0 (2025-07-25)
- 조직별 권한 관리 추가
- 로그인 히스토리 추적
- Rate limiting 구현

### v1.0.0 (2025-07-10)
- 기본 JWT 인증 시스템
- 회원가입/로그인 기능
- 권한 기반 라우팅