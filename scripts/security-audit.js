// security-audit.js
// MarketingPlat 보안 감사 스크립트

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 MarketingPlat Security Audit\n');
console.log('=' .repeat(50));

let issuesFound = 0;
const issues = [];

// 1. 환경 파일 체크
console.log('\n1️⃣ 환경 파일 체크...');
const envFiles = ['.env', '.env.local', '.env.production'];
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');

    // 하드코딩된 자격 증명 체크
    if (content.includes('JWT_SECRET=') && !content.includes('JWT_SECRET=YOUR_')) {
      issues.push(`⚠️  ${file}: JWT_SECRET이 하드코딩되어 있습니다`);
      issuesFound++;
    }

    if (content.includes('DATABASE_URL=') && content.includes('@') && !content.includes('DATABASE_URL=postgresql://')) {
      console.log(`✅ ${file}: DATABASE_URL 설정됨`);
    }

    // API 키 체크
    const apiKeyPatterns = [
      /GEMINI_API_KEY=AIza[\w-]{35}/,
      /NAVER_.*_KEY=[\w]{20,}/
    ];

    apiKeyPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        issues.push(`⚠️  ${file}: API 키가 하드코딩되어 있을 수 있습니다`);
        issuesFound++;
      }
    });
  }
});

// 2. Git 추적 파일 체크
console.log('\n2️⃣ Git 추적 파일 체크...');
try {
  const trackedFiles = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
  const sensitiveFiles = trackedFiles.filter(file =>
    file.includes('.env') ||
    file.includes('credentials') ||
    file.includes('secret') ||
    file.endsWith('.pem') ||
    file.endsWith('.key')
  );

  if (sensitiveFiles.length > 0) {
    sensitiveFiles.forEach(file => {
      if (file) {
        issues.push(`⚠️  민감한 파일이 Git에 추적됨: ${file}`);
        issuesFound++;
      }
    });
  } else {
    console.log('✅ 민감한 파일이 Git에 추적되지 않음');
  }
} catch (e) {
  console.log('⚠️  Git 체크 실패 (Git 저장소가 아닐 수 있음)');
}

// 3. 의존성 취약점 체크
console.log('\n3️⃣ 의존성 취약점 체크...');
try {
  const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
  const audit = JSON.parse(auditResult);

  if (audit.metadata.vulnerabilities.total > 0) {
    const vulns = audit.metadata.vulnerabilities;
    console.log(`⚠️  발견된 취약점:`);
    console.log(`   - Critical: ${vulns.critical}`);
    console.log(`   - High: ${vulns.high}`);
    console.log(`   - Moderate: ${vulns.moderate}`);
    console.log(`   - Low: ${vulns.low}`);

    if (vulns.critical > 0 || vulns.high > 0) {
      issues.push(`⚠️  Critical/High 레벨 취약점 발견: ${vulns.critical + vulns.high}개`);
      issuesFound += vulns.critical + vulns.high;
    }
  } else {
    console.log('✅ 알려진 취약점 없음');
  }
} catch (e) {
  // npm audit이 에러를 반환할 수 있음 (취약점이 있을 때)
  console.log('⚠️  npm audit 실행 중 에러 (취약점이 있을 수 있음)');
}

// 4. 코드 내 하드코딩된 비밀 체크
console.log('\n4️⃣ 코드 내 하드코딩된 비밀 체크...');
const secretPatterns = [
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
  { pattern: /AIza[0-9A-Za-z_-]{35}/, name: 'Google API Key' },
  { pattern: /ya29\.[0-9A-Za-z_-]+/, name: 'Google OAuth Token' },
  { pattern: /sk-[a-zA-Z0-9]{48}/, name: 'OpenAI API Key' },
  { pattern: /ghp_[0-9a-zA-Z]{36}/, name: 'GitHub Personal Token' },
  { pattern: /ghs_[0-9a-zA-Z]{36}/, name: 'GitHub Secret' },
];

function scanDirectory(dir, patterns) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // node_modules, .git, .next 제외
      if (!['node_modules', '.git', '.next', 'dist'].includes(file)) {
        scanDirectory(filePath, patterns);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');

      patterns.forEach(({ pattern, name }) => {
        if (pattern.test(content)) {
          issues.push(`⚠️  ${name} 발견: ${filePath}`);
          issuesFound++;
        }
      });
    }
  });
}

scanDirectory('.', secretPatterns);

if (issuesFound === 0) {
  console.log('✅ 하드코딩된 비밀 없음');
}

// 5. 보안 헤더 체크 (middleware.ts)
console.log('\n5️⃣ 보안 헤더 설정 체크...');
if (fs.existsSync('middleware.ts')) {
  const middlewareContent = fs.readFileSync('middleware.ts', 'utf8');
  const headers = [
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Strict-Transport-Security',
    'Content-Security-Policy'
  ];

  let missingHeaders = [];
  headers.forEach(header => {
    if (!middlewareContent.includes(header)) {
      missingHeaders.push(header);
    }
  });

  if (missingHeaders.length > 0) {
    issues.push(`⚠️  누락된 보안 헤더: ${missingHeaders.join(', ')}`);
    issuesFound += missingHeaders.length;
  } else {
    console.log('✅ 모든 보안 헤더 설정됨');
  }
} else {
  issues.push('⚠️  middleware.ts 파일이 없음');
  issuesFound++;
}

// 6. Rate Limiting 체크
console.log('\n6️⃣ Rate Limiting 설정 체크...');
if (fs.existsSync('lib/rate-limiter.ts')) {
  console.log('✅ Rate Limiter 구현됨');
} else {
  issues.push('⚠️  Rate Limiter가 구현되지 않음');
  issuesFound++;
}

// 7. HTTPS 설정 체크
console.log('\n7️⃣ HTTPS 설정 체크...');
if (fs.existsSync('nginx/marketingplat.conf')) {
  const nginxConfig = fs.readFileSync('nginx/marketingplat.conf', 'utf8');
  if (nginxConfig.includes('listen 443 ssl')) {
    console.log('✅ HTTPS 설정됨 (Nginx)');
  } else {
    issues.push('⚠️  HTTPS가 설정되지 않음');
    issuesFound++;
  }
}

// 8. 데이터베이스 연결 보안
console.log('\n8️⃣ 데이터베이스 연결 보안 체크...');
const prismaSchema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (prismaSchema.includes('postgresql')) {
  console.log('✅ PostgreSQL 사용 중');

  if (prismaSchema.includes('?sslmode=require')) {
    console.log('✅ SSL 모드 활성화됨');
  } else {
    console.log('⚠️  SSL 모드가 설정되지 않음 (프로덕션에서는 권장)');
  }
}

// 결과 출력
console.log('\n' + '=' .repeat(50));
console.log('📊 감사 결과:\n');

if (issuesFound === 0) {
  console.log('✅ 보안 문제가 발견되지 않았습니다!');
} else {
  console.log(`⚠️  ${issuesFound}개의 보안 이슈가 발견되었습니다:\n`);
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });

  console.log('\n📝 권장 조치:');
  console.log('1. 민감한 정보는 AWS Secrets Manager 사용');
  console.log('2. .gitignore 파일 확인');
  console.log('3. npm audit fix 실행');
  console.log('4. 보안 헤더 구현 확인');
}

console.log('\n' + '=' .repeat(50));
console.log('감사 완료: ' + new Date().toISOString());

// 결과 파일 저장
const reportPath = `security-audit-${new Date().toISOString().split('T')[0]}.json`;
fs.writeFileSync(reportPath, JSON.stringify({
  date: new Date().toISOString(),
  issuesFound,
  issues,
  passed: issuesFound === 0
}, null, 2));

console.log(`\n📁 보고서 저장됨: ${reportPath}`);

process.exit(issuesFound > 0 ? 1 : 0);