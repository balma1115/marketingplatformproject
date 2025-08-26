# 10_관리자_조직구조 모듈

## 개요
조직의 계층 구조 관리 및 사용자 배정을 담당하는 관리자 전용 모듈입니다. 과목-지사-학원의 3단계 계층 구조를 관리합니다.

## 주요 기능
- 과목-지사-학원 계층 구조 관리
- 학원별 고유 가입 코드 생성 및 관리
- CSV 파일을 통한 일괄 조직 등록
- 사용자 조직 배정 및 권한 관리
- 조직 구조 시각화
- 조직별 통계 및 분석

## 기술 스택

### Frontend
- React 18 with TypeScript
- Tree view components for hierarchy
- CSV file upload handling
- Organization chart visualization
- Drag & Drop user assignment

### Backend
- Node.js with Express
- CSV parsing and validation
- Hierarchical data management
- Bulk operations processing

## 프로젝트 구조

```
10_관리자_조직구조/
├── frontend/
│   ├── components/
│   │   ├── OrganizationTree.tsx
│   │   ├── CSVUploader.tsx
│   │   ├── UserAssignment.tsx
│   │   ├── InviteCodeManager.tsx
│   │   └── OrganizationChart.tsx
│   ├── pages/
│   │   └── OrganizationManagement.tsx
│   └── styles/
│       ├── OrganizationTree.css
│       ├── OrganizationChart.css
│       └── UserAssignment.css
├── backend/
│   ├── routes/
│   │   ├── organization.routes.ts
│   │   └── organization.bulk.routes.ts
│   ├── services/
│   │   ├── organizationService.ts
│   │   ├── csvParsingService.ts
│   │   ├── inviteCodeService.ts
│   │   └── hierarchicalAuthService.ts
│   └── config/
│       ├── allowed-subjects.json
│       └── organization-templates.json
└── database/
    └── organization_schema.sql
```

## 설치 방법

### 의존성 설치
```bash
# Frontend 의존성
npm install react react-dom react-tree-view csv-parse papaparse

# Backend 의존성
npm install csv-parser multer uuid crypto
```

### 환경 변수
```env
# 조직 관리 설정
MAX_HIERARCHY_DEPTH=3
ALLOWED_SUBJECTS=미래엔영어,미래엔수학,미래엔독서
INVITE_CODE_LENGTH=8
INVITE_CODE_EXPIRY=2592000

# 업로드 설정
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.csv,.xlsx
BULK_OPERATION_BATCH_SIZE=100

# 보안 설정
REQUIRE_ADMIN_APPROVAL=true
AUTO_ASSIGN_PERMISSIONS=false
```

## API 엔드포인트

### 조직 구조 관리
```http
GET /api/organization/structure
GET /api/organization/subjects
GET /api/organization/branches/:subjectId
GET /api/organization/academies/:branchId
POST /api/organization/subject
POST /api/organization/branch
POST /api/organization/academy
PUT /api/organization/:type/:id
DELETE /api/organization/:type/:id
```

### 일괄 등록
```http
POST /api/organization/bulk/upload
Content-Type: multipart/form-data

GET /api/organization/bulk/template
GET /api/organization/bulk/status/:operationId
POST /api/organization/bulk/validate
```

### 사용자 배정
```http
GET /api/organization/users/:organizationId
POST /api/organization/users/assign
PUT /api/organization/users/:userId/reassign
DELETE /api/organization/users/:userId/unassign
GET /api/organization/users/unassigned
```

### 가입 코드 관리
```http
GET /api/organization/invite-codes
POST /api/organization/invite-codes/generate
PUT /api/organization/invite-codes/:codeId/regenerate
DELETE /api/organization/invite-codes/:codeId
GET /api/organization/invite-codes/:code/validate
```

## 데이터베이스 스키마

### subjects 테이블
```sql
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_subject_name (subject_name)
);

-- 기본 과목 데이터
INSERT INTO subjects (subject_name, display_name, description) VALUES
('미래엔영어', '미래엔 영어', '미래엔 영어 교육 프로그램'),
('미래엔수학', '미래엔 수학', '미래엔 수학 교육 프로그램'),
('미래엔독서', '미래엔 독서', '미래엔 독서 교육 프로그램');
```

### branches 테이블
```sql
CREATE TABLE branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    branch_code VARCHAR(20) UNIQUE,
    manager_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    UNIQUE KEY unique_branch_per_subject (subject_id, branch_name)
);
```

### academies 테이블
```sql
CREATE TABLE academies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NOT NULL,
    academy_name VARCHAR(100) NOT NULL,
    academy_code VARCHAR(20) UNIQUE,
    invite_code VARCHAR(8) UNIQUE NOT NULL,
    director_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    address TEXT,
    registration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    UNIQUE KEY unique_academy_per_branch (branch_id, academy_name),
    INDEX idx_invite_code (invite_code)
);
```

### user_organization_assignments 테이블
```sql
CREATE TABLE user_organization_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    subject_id INT,
    branch_id INT,
    academy_id INT NOT NULL,
    assignment_type ENUM('director', 'teacher', 'staff') DEFAULT 'staff',
    assigned_by INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_user_academy (user_id, academy_id)
);
```

### invite_codes 테이블
```sql
CREATE TABLE invite_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(8) UNIQUE NOT NULL,
    academy_id INT NOT NULL,
    created_by INT NOT NULL,
    usage_count INT DEFAULT 0,
    max_usage INT DEFAULT 100,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_code_active (code, is_active)
);
```

## 조직 관리 서비스

### 조직 구조 관리
```typescript
class OrganizationService {
  async getOrganizationHierarchy(): Promise<OrganizationHierarchy> {
    const query = `
      SELECT 
        s.id as subject_id, s.subject_name, s.display_name as subject_display_name,
        b.id as branch_id, b.branch_name, b.branch_code, b.manager_name,
        a.id as academy_id, a.academy_name, a.academy_code, a.invite_code,
        a.director_name, a.contact_phone, a.contact_email,
        (SELECT COUNT(*) FROM user_organization_assignments uoa 
         WHERE uoa.academy_id = a.id AND uoa.is_active = TRUE) as user_count
      FROM subjects s
      LEFT JOIN branches b ON s.id = b.subject_id AND b.is_active = TRUE
      LEFT JOIN academies a ON b.id = a.branch_id AND a.is_active = TRUE
      WHERE s.is_active = TRUE
      ORDER BY s.sort_order, s.subject_name, b.branch_name, a.academy_name
    `;

    const results = await this.db.query(query);
    return this.buildHierarchyTree(results);
  }

  private buildHierarchyTree(flatData: any[]): OrganizationHierarchy {
    const hierarchy: OrganizationHierarchy = {
      subjects: []
    };

    const subjectMap = new Map<number, Subject>();
    const branchMap = new Map<number, Branch>();

    flatData.forEach(row => {
      // Subject 처리
      if (!subjectMap.has(row.subject_id)) {
        const subject: Subject = {
          id: row.subject_id,
          subjectName: row.subject_name,
          displayName: row.subject_display_name,
          branches: []
        };
        subjectMap.set(row.subject_id, subject);
        hierarchy.subjects.push(subject);
      }

      // Branch 처리
      if (row.branch_id && !branchMap.has(row.branch_id)) {
        const branch: Branch = {
          id: row.branch_id,
          branchName: row.branch_name,
          branchCode: row.branch_code,
          managerName: row.manager_name,
          academies: []
        };
        branchMap.set(row.branch_id, branch);
        subjectMap.get(row.subject_id)!.branches.push(branch);
      }

      // Academy 처리
      if (row.academy_id) {
        const academy: Academy = {
          id: row.academy_id,
          academyName: row.academy_name,
          academyCode: row.academy_code,
          inviteCode: row.invite_code,
          directorName: row.director_name,
          contactPhone: row.contact_phone,
          contactEmail: row.contact_email,
          userCount: row.user_count || 0
        };
        branchMap.get(row.branch_id)!.academies.push(academy);
      }
    });

    return hierarchy;
  }

  async createAcademy(academyData: CreateAcademyData): Promise<Academy> {
    const inviteCode = this.generateInviteCode();
    
    const result = await this.db.query(`
      INSERT INTO academies (
        branch_id, academy_name, academy_code, invite_code,
        director_name, contact_phone, contact_email, address,
        registration_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      academyData.branchId,
      academyData.academyName,
      academyData.academyCode,
      inviteCode,
      academyData.directorName,
      academyData.contactPhone,
      academyData.contactEmail,
      academyData.address,
      academyData.registrationDate
    ]);

    // 가입 코드 테이블에도 등록
    await this.createInviteCode({
      code: inviteCode,
      academyId: result.insertId,
      maxUsage: 100,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후 만료
    });

    return await this.findAcademyById(result.insertId);
  }

  private generateInviteCode(): string {
    // 8자리 숫자 코드 생성 (중복 방지)
    let code: string;
    let isUnique = false;
    
    do {
      code = Math.floor(10000000 + Math.random() * 90000000).toString();
      isUnique = await this.isInviteCodeUnique(code);
    } while (!isUnique);

    return code;
  }

  private async isInviteCodeUnique(code: string): Promise<boolean> {
    const existing = await this.db.query(
      'SELECT id FROM academies WHERE invite_code = ?',
      [code]
    );
    return existing.length === 0;
  }
}
```

### CSV 일괄 등록 서비스
```typescript
class CSVParsingService {
  async processBulkOrganizationUpload(
    file: Express.Multer.File,
    adminId: number
  ): Promise<BulkOperationResult> {
    // CSV 파일 파싱
    const csvData = await this.parseCSVFile(file);
    
    // 데이터 검증
    const validationResult = await this.validateOrganizationData(csvData);
    if (validationResult.errors.length > 0) {
      throw new Error(`CSV 검증 오류: ${validationResult.errors.join(', ')}`);
    }

    // 일괄 작업 생성
    const operationId = await this.createBulkOperation('organization_import', adminId, csvData.length);
    
    // 비동기 처리
    this.processBulkOrganizationCreation(operationId, csvData, adminId);
    
    return { operationId, status: 'pending', totalRecords: csvData.length };
  }

  private async parseCSVFile(file: Express.Multer.File): Promise<OrganizationCSVRow[]> {
    return new Promise((resolve, reject) => {
      const results: OrganizationCSVRow[] = [];
      const fs = require('fs');
      const csv = require('csv-parser');

      fs.createReadStream(file.path)
        .pipe(csv())
        .on('data', (row: any) => {
          results.push({
            subjectName: row['과목'] || row['subject'],
            branchName: row['지사'] || row['branch'],
            branchCode: row['지사코드'] || row['branch_code'],
            managerName: row['지사장'] || row['manager'],
            academyName: row['학원명'] || row['academy'],
            academyCode: row['학원코드'] || row['academy_code'],
            directorName: row['원장명'] || row['director'],
            contactPhone: row['연락처'] || row['phone'],
            contactEmail: row['이메일'] || row['email'],
            address: row['주소'] || row['address'],
            registrationDate: row['등록일'] || row['registration_date']
          });
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  private async validateOrganizationData(data: OrganizationCSVRow[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const allowedSubjects = ['미래엔영어', '미래엔수학', '미래엔독서'];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      // 필수 필드 검증
      if (!row.subjectName) errors.push(`${rowNum}행: 과목명 필수`);
      if (!row.branchName) errors.push(`${rowNum}행: 지사명 필수`);
      if (!row.academyName) errors.push(`${rowNum}행: 학원명 필수`);

      // 과목명 검증
      if (row.subjectName && !allowedSubjects.includes(row.subjectName)) {
        errors.push(`${rowNum}행: 허용되지 않은 과목 (${row.subjectName})`);
      }

      // 이메일 형식 검증
      if (row.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.contactEmail)) {
        warnings.push(`${rowNum}행: 잘못된 이메일 형식 (${row.contactEmail})`);
      }

      // 전화번호 형식 검증
      if (row.contactPhone && !/^[\d-]{10,15}$/.test(row.contactPhone)) {
        warnings.push(`${rowNum}행: 전화번호 형식 확인 필요 (${row.contactPhone})`);
      }

      // 등록일 형식 검증
      if (row.registrationDate && !this.isValidDate(row.registrationDate)) {
        warnings.push(`${rowNum}행: 등록일 형식 확인 필요 (${row.registrationDate})`);
      }
    }

    // 중복 검증
    const duplicates = this.findDuplicateAcademies(data);
    duplicates.forEach(duplicate => {
      errors.push(`중복된 학원: ${duplicate.academyName} (${duplicate.rows.join(', ')}행)`);
    });

    return { errors, warnings };
  }

  private async processBulkOrganizationCreation(
    operationId: number,
    data: OrganizationCSVRow[],
    adminId: number
  ): Promise<void> {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    await this.updateBulkOperationStatus(operationId, 'processing');

    for (const row of data) {
      try {
        await this.db.transaction(async (trx) => {
          // 과목 생성/조회
          let subject = await this.findOrCreateSubject(row.subjectName, trx);
          
          // 지사 생성/조회
          let branch = await this.findOrCreateBranch(subject.id, row, trx);
          
          // 학원 생성
          await this.createAcademyFromRow(branch.id, row, trx);
        });
        
        successful++;
      } catch (error) {
        failed++;
        errors.push({
          row: processed + 1,
          academyName: row.academyName,
          error: error.message
        });
      }
      
      processed++;
      
      // 진행률 업데이트 (10개마다)
      if (processed % 10 === 0) {
        await this.updateBulkOperationProgress(operationId, processed, successful, failed);
      }
    }

    await this.completeBulkOperation(operationId, processed, successful, failed, errors);
  }

  async generateCSVTemplate(): Promise<string> {
    const template = [
      ['과목', '지사', '지사코드', '지사장', '학원명', '학원코드', '원장명', '연락처', '이메일', '주소', '등록일'],
      ['미래엔영어', '강남지사', 'GN001', '홍길동', 'ABC영어학원', 'ABC001', '김영희', '02-1234-5678', 'director@abc.com', '서울시 강남구', '2025-01-01'],
      ['미래엔수학', '강남지사', 'GN001', '홍길동', 'XYZ수학학원', 'XYZ001', '이철수', '02-8765-4321', 'director@xyz.com', '서울시 강남구', '2025-01-02']
    ];

    return template.map(row => row.join(',')).join('\n');
  }
}
```

### 사용자 조직 배정 서비스
```typescript
class UserAssignmentService {
  async assignUserToOrganization(
    userId: number,
    organizationData: UserOrganizationAssignment,
    adminId: number
  ): Promise<void> {
    // 기존 배정 해제
    await this.unassignUser(userId, adminId, false);

    // 새로운 배정
    await this.db.query(`
      INSERT INTO user_organization_assignments (
        user_id, subject_id, branch_id, academy_id,
        assignment_type, assigned_by, assigned_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      organizationData.subjectId,
      organizationData.branchId,
      organizationData.academyId,
      organizationData.assignmentType || 'staff',
      adminId
    ]);

    // 사용자 테이블의 branch_name 업데이트
    const academy = await this.getAcademyInfo(organizationData.academyId);
    await this.db.query(`
      UPDATE users SET branch_name = ? WHERE id = ?
    `, [academy.fullName, userId]);

    // 활동 로그 기록
    await this.logActivity(userId, 'organization_assigned', {
      assignedBy: adminId,
      organizationData,
      academyName: academy.academyName
    });
  }

  async bulkAssignUsers(
    assignments: BulkUserAssignment[],
    adminId: number
  ): Promise<BulkOperationResult> {
    const operationId = await this.createBulkOperation('user_assignment', adminId, assignments.length);
    
    this.processBulkUserAssignment(operationId, assignments, adminId);
    
    return { operationId, status: 'pending', totalRecords: assignments.length };
  }

  async getUsersWithoutOrganization(page: number = 1, limit: number = 50): Promise<PaginatedUsers> {
    const offset = (page - 1) * limit;
    
    const [users, countResult] = await Promise.all([
      this.db.query(`
        SELECT u.id, u.email, u.name, u.created_at
        FROM users u
        LEFT JOIN user_organization_assignments uoa ON u.id = uoa.user_id AND uoa.is_active = TRUE
        WHERE uoa.id IS NULL AND u.role != 'admin'
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]),
      
      this.db.query(`
        SELECT COUNT(*) as total
        FROM users u
        LEFT JOIN user_organization_assignments uoa ON u.id = uoa.user_id AND uoa.is_active = TRUE
        WHERE uoa.id IS NULL AND u.role != 'admin'
      `)
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

  async getOrganizationUsers(
    organizationId: number,
    organizationType: 'subject' | 'branch' | 'academy'
  ): Promise<OrganizationUser[]> {
    let whereClause = '';
    
    switch (organizationType) {
      case 'subject':
        whereClause = 'WHERE uoa.subject_id = ?';
        break;
      case 'branch':
        whereClause = 'WHERE uoa.branch_id = ?';
        break;
      case 'academy':
        whereClause = 'WHERE uoa.academy_id = ?';
        break;
    }

    const users = await this.db.query(`
      SELECT 
        u.id, u.email, u.name, u.role,
        uoa.assignment_type, uoa.assigned_at,
        s.subject_name, b.branch_name, a.academy_name
      FROM user_organization_assignments uoa
      JOIN users u ON uoa.user_id = u.id
      JOIN subjects s ON uoa.subject_id = s.id
      JOIN branches b ON uoa.branch_id = b.id
      JOIN academies a ON uoa.academy_id = a.id
      ${whereClause} AND uoa.is_active = TRUE
      ORDER BY uoa.assigned_at DESC
    `, [organizationId]);

    return users.map(user => ({
      ...user,
      organizationPath: `${user.subject_name} > ${user.branch_name} > ${user.academy_name}`,
      assignedDate: new Date(user.assigned_at).toLocaleDateString()
    }));
  }
}
```

### 가입 코드 관리 서비스
```typescript
class InviteCodeService {
  async validateInviteCode(code: string): Promise<InviteCodeValidation> {
    const result = await this.db.query(`
      SELECT 
        ic.*,
        a.academy_name,
        b.branch_name,
        s.subject_name
      FROM invite_codes ic
      JOIN academies a ON ic.academy_id = a.id
      JOIN branches b ON a.branch_id = b.id
      JOIN subjects s ON b.subject_id = s.id
      WHERE ic.code = ? AND ic.is_active = TRUE
    `, [code]);

    if (!result.length) {
      return { isValid: false, error: '유효하지 않은 가입 코드입니다.' };
    }

    const inviteCode = result[0];

    // 만료 여부 확인
    if (inviteCode.expires_at && new Date() > new Date(inviteCode.expires_at)) {
      return { isValid: false, error: '만료된 가입 코드입니다.' };
    }

    // 사용 횟수 확인
    if (inviteCode.usage_count >= inviteCode.max_usage) {
      return { isValid: false, error: '사용 한도를 초과한 가입 코드입니다.' };
    }

    return {
      isValid: true,
      inviteCode: {
        id: inviteCode.id,
        code: inviteCode.code,
        academyId: inviteCode.academy_id,
        academyName: inviteCode.academy_name,
        branchName: inviteCode.branch_name,
        subjectName: inviteCode.subject_name,
        usageCount: inviteCode.usage_count,
        maxUsage: inviteCode.max_usage,
        expiresAt: inviteCode.expires_at
      }
    };
  }

  async useInviteCode(code: string, userId: number): Promise<void> {
    await this.db.transaction(async (trx) => {
      // 가입 코드 유효성 재확인
      const validation = await this.validateInviteCode(code);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 사용 횟수 증가
      await trx.query(`
        UPDATE invite_codes 
        SET usage_count = usage_count + 1 
        WHERE code = ?
      `, [code]);

      // 사용자 조직 배정
      const inviteCode = validation.inviteCode!;
      await trx.query(`
        INSERT INTO user_organization_assignments (
          user_id, academy_id, assignment_type, assigned_at
        ) VALUES (?, ?, 'staff', NOW())
        ON DUPLICATE KEY UPDATE
          academy_id = VALUES(academy_id),
          assignment_type = VALUES(assignment_type),
          assigned_at = NOW(),
          is_active = TRUE
      `, [userId, inviteCode.academyId]);

      // 사용자 branch_name 업데이트
      await trx.query(`
        UPDATE users 
        SET branch_name = ? 
        WHERE id = ?
      `, [`${inviteCode.subjectName} > ${inviteCode.branchName} > ${inviteCode.academyName}`, userId]);

      // 사용 로그 기록
      await trx.query(`
        INSERT INTO invite_code_usage_logs (
          invite_code_id, user_id, used_at
        ) VALUES (?, ?, NOW())
      `, [inviteCode.id, userId]);
    });
  }

  async regenerateInviteCode(academyId: number, adminId: number): Promise<string> {
    const newCode = this.generateInviteCode();

    await this.db.transaction(async (trx) => {
      // 기존 코드 비활성화
      await trx.query(`
        UPDATE invite_codes 
        SET is_active = FALSE 
        WHERE academy_id = ? AND is_active = TRUE
      `, [academyId]);

      // 새 코드 생성
      await trx.query(`
        INSERT INTO invite_codes (
          code, academy_id, created_by, max_usage, 
          expires_at, created_at
        ) VALUES (?, ?, ?, 100, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
      `, [newCode, academyId, adminId]);

      // 학원 테이블의 invite_code 업데이트
      await trx.query(`
        UPDATE academies 
        SET invite_code = ? 
        WHERE id = ?
      `, [newCode, academyId]);
    });

    return newCode;
  }

  async getInviteCodeStats(): Promise<InviteCodeStats> {
    const stats = await this.db.query(`
      SELECT 
        COUNT(*) as total_codes,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_codes,
        SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_codes,
        SUM(usage_count) as total_usage,
        AVG(usage_count) as avg_usage_per_code
      FROM invite_codes
    `);

    const topUsedCodes = await this.db.query(`
      SELECT 
        ic.code,
        ic.usage_count,
        a.academy_name,
        b.branch_name,
        s.subject_name
      FROM invite_codes ic
      JOIN academies a ON ic.academy_id = a.id
      JOIN branches b ON a.branch_id = b.id
      JOIN subjects s ON b.subject_id = s.id
      WHERE ic.is_active = TRUE
      ORDER BY ic.usage_count DESC
      LIMIT 10
    `);

    return {
      totalCodes: stats[0].total_codes,
      activeCodes: stats[0].active_codes,
      expiredCodes: stats[0].expired_codes,
      totalUsage: stats[0].total_usage,
      averageUsage: parseFloat(stats[0].avg_usage_per_code || '0'),
      topUsedCodes
    };
  }
}
```

## 프론트엔드 컴포넌트

### 조직 구조 트리 뷰
```typescript
import React, { useState, useEffect } from 'react';

const OrganizationTree: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<OrganizationHierarchy | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizationHierarchy();
  }, []);

  const loadOrganizationHierarchy = async () => {
    try {
      const response = await api.get('/organization/structure');
      setHierarchy(response.data);
    } catch (error) {
      console.error('조직 구조 로드 실패:', error);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderSubject = (subject: Subject) => (
    <div key={subject.id} className="tree-node subject-node">
      <div 
        className={`node-label ${selectedNode === `subject-${subject.id}` ? 'selected' : ''}`}
        onClick={() => {
          toggleNode(`subject-${subject.id}`);
          setSelectedNode(`subject-${subject.id}`);
        }}
      >
        <span className="expand-icon">
          {expandedNodes.has(`subject-${subject.id}`) ? '▼' : '▶'}
        </span>
        <span className="node-icon">📚</span>
        <span className="node-text">{subject.displayName}</span>
        <span className="node-count">({subject.branches.length}개 지사)</span>
      </div>
      
      {expandedNodes.has(`subject-${subject.id}`) && (
        <div className="node-children">
          {subject.branches.map(branch => renderBranch(branch, subject.id))}
        </div>
      )}
    </div>
  );

  const renderBranch = (branch: Branch, subjectId: number) => (
    <div key={branch.id} className="tree-node branch-node">
      <div 
        className={`node-label ${selectedNode === `branch-${branch.id}` ? 'selected' : ''}`}
        onClick={() => {
          toggleNode(`branch-${branch.id}`);
          setSelectedNode(`branch-${branch.id}`);
        }}
      >
        <span className="expand-icon">
          {expandedNodes.has(`branch-${branch.id}`) ? '▼' : '▶'}
        </span>
        <span className="node-icon">🏢</span>
        <span className="node-text">{branch.branchName}</span>
        <span className="node-manager">({branch.managerName})</span>
        <span className="node-count">({branch.academies.length}개 학원)</span>
      </div>
      
      {expandedNodes.has(`branch-${branch.id}`) && (
        <div className="node-children">
          {branch.academies.map(academy => renderAcademy(academy))}
        </div>
      )}
    </div>
  );

  const renderAcademy = (academy: Academy) => (
    <div key={academy.id} className="tree-node academy-node">
      <div 
        className={`node-label ${selectedNode === `academy-${academy.id}` ? 'selected' : ''}`}
        onClick={() => setSelectedNode(`academy-${academy.id}`)}
      >
        <span className="node-icon">🎓</span>
        <span className="node-text">{academy.academyName}</span>
        <span className="node-director">({academy.directorName})</span>
        <span className="invite-code">코드: {academy.inviteCode}</span>
        <span className="user-count">{academy.userCount}명</span>
      </div>
    </div>
  );

  if (!hierarchy) return <div className="loading">조직 구조를 로드하는 중...</div>;

  return (
    <div className="organization-tree">
      <div className="tree-header">
        <h3>조직 구조</h3>
        <button onClick={loadOrganizationHierarchy} className="refresh-btn">
          새로고침
        </button>
      </div>
      
      <div className="tree-container">
        {hierarchy.subjects.map(subject => renderSubject(subject))}
      </div>

      {selectedNode && (
        <NodeDetailsPanel 
          nodeId={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
};
```

### CSV 업로드 컴포넌트
```typescript
import React, { useState } from 'react';

const CSVUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [operationId, setOperationId] = useState<number | null>(null);
  const [progress, setProgress] = useState<BulkOperationStatus | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        alert('CSV 파일만 업로드 가능합니다.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/organization/bulk/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setOperationId(response.data.operationId);
      startProgressTracking(response.data.operationId);
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      alert('파일 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const startProgressTracking = (opId: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/organization/bulk/status/${opId}`);
        setProgress(response.data);
        
        if (response.data.status === 'completed' || response.data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('진행 상황 조회 실패:', error);
        clearInterval(interval);
      }
    }, 2000);
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/organization/bulk/template');
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'organization_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error);
    }
  };

  return (
    <div className="csv-uploader">
      <div className="uploader-header">
        <h3>조직 구조 일괄 등록</h3>
        <button onClick={downloadTemplate} className="template-btn">
          템플릿 다운로드
        </button>
      </div>

      <div className="upload-section">
        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="file-input"
          />
          {file && (
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        <button 
          onClick={uploadFile} 
          disabled={!file || uploading}
          className="upload-btn"
        >
          {uploading ? '업로드 중...' : '업로드 시작'}
        </button>
      </div>

      {progress && (
        <div className="progress-section">
          <h4>처리 진행 상황</h4>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          
          <div className="progress-stats">
            <div>전체: {progress.totalRecords}</div>
            <div>처리: {progress.processedRecords}</div>
            <div>성공: {progress.successfulRecords}</div>
            <div>실패: {progress.failedRecords}</div>
          </div>

          <div className="progress-status">
            상태: {getStatusLabel(progress.status)}
          </div>

          {progress.errors.length > 0 && (
            <div className="error-list">
              <h5>오류 목록</h5>
              {progress.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="error-item">
                  {error.row}행: {error.error}
                </div>
              ))}
              {progress.errors.length > 5 && (
                <div className="error-more">
                  외 {progress.errors.length - 5}개 오류...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## 트러블슈팅

### 성능 최적화
```typescript
class OrganizationPerformanceOptimizer {
  // 조직 구조 캐싱
  private hierarchyCache: { data: OrganizationHierarchy; timestamp: number } | null = null;
  private readonly CACHE_TTL = 300000; // 5분

  async getCachedHierarchy(): Promise<OrganizationHierarchy> {
    if (this.hierarchyCache && Date.now() - this.hierarchyCache.timestamp < this.CACHE_TTL) {
      return this.hierarchyCache.data;
    }

    const hierarchy = await this.organizationService.getOrganizationHierarchy();
    this.hierarchyCache = { data: hierarchy, timestamp: Date.now() };
    
    return hierarchy;
  }

  // 대량 작업 최적화
  async optimizedBulkInsert(data: OrganizationCSVRow[]): Promise<void> {
    const batchSize = 100;
    const batches = this.chunkArray(data, batchSize);

    for (const batch of batches) {
      await this.db.transaction(async (trx) => {
        // 배치 단위로 처리
        const subjectQueries = batch.map(row => 
          trx.query('INSERT IGNORE INTO subjects (subject_name, display_name) VALUES (?, ?)', 
            [row.subjectName, row.subjectName])
        );
        
        await Promise.all(subjectQueries);
        
        // 이후 branch, academy도 배치 처리
        // ... 구현 생략
      });
      
      // 배치 간 잠시 대기 (DB 부하 분산)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
```

## 업데이트 로그

### v1.3.0 (2025-08-25)
- CSV 일괄 등록 성능 최적화
- 조직 구조 시각화 개선
- 가입 코드 통계 분석 추가

### v1.2.0 (2025-08-10)
- 사용자 조직 배정 자동화
- 가입 코드 사용량 추적
- 조직별 권한 관리 강화

### v1.1.0 (2025-07-25)
- CSV 업로드 진행률 표시
- 조직 구조 트리 뷰 구현
- 대량 사용자 배정 기능

### v1.0.0 (2025-07-10)
- 기본 조직 구조 관리
- 가입 코드 시스템 구현
- CSV 일괄 등록 기능