// fix-nextjs15-params.js
// Next.js 15 동적 라우트 params Promise 처리 수정 스크립트

const fs = require('fs');
const path = require('path');

// 수정이 필요한 파일 패턴
const dynamicRoutePattern = /\[.*\]/;

// 수정이 필요한 파일들 찾기
function findDynamicRoutes(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // node_modules와 .next는 제외
      if (file !== 'node_modules' && file !== '.next') {
        findDynamicRoutes(filePath, fileList);
      }
    } else if (file === 'route.ts' || file === 'page.tsx') {
      // 부모 디렉토리가 동적 라우트인지 확인
      const parentDir = path.basename(path.dirname(filePath));
      if (dynamicRoutePattern.test(parentDir)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

// 파일 내용 수정
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Route handlers (GET, POST, PUT, DELETE, PATCH)
  const routeHandlerRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*{\s*params\s*}\s*:\s*{\s*params:\s*{[^}]+}\s*}\s*\)/g;

  if (routeHandlerRegex.test(content)) {
    // 백업 생성
    const backupPath = filePath + '.backup';
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, content);
    }

    // params를 Promise로 변경
    content = content.replace(
      /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*([^,]+),\s*{\s*params\s*}\s*:\s*{\s*params:\s*({[^}]+})\s*}\s*\)/g,
      (match, method, firstParam, paramsType) => {
        return `export async function ${method}(\n  ${firstParam},\n  props: { params: Promise<${paramsType}> }\n)`;
      }
    );

    // 함수 본문에서 params 사용 수정
    content = content.replace(
      /(export\s+async\s+function\s+(?:GET|POST|PUT|DELETE|PATCH)[^{]*{)/g,
      (match) => {
        const nextBrace = content.indexOf('{', match.length);
        const functionStart = content.substring(0, nextBrace + 1);
        const functionRest = content.substring(nextBrace + 1);

        // params를 await하는 코드 추가
        if (!functionRest.includes('await props.params') && !functionRest.includes('const params = await')) {
          return match + '\n  const params = await props.params;';
        }
        return match;
      }
    );

    modified = true;
  }

  // Page components
  const pageComponentRegex = /export\s+default\s+async\s+function\s+\w+\s*\([^)]*{\s*params\s*}\s*:\s*{\s*params:\s*{[^}]+}\s*}\s*\)/g;

  if (pageComponentRegex.test(content)) {
    content = content.replace(
      /export\s+default\s+async\s+function\s+(\w+)\s*\(\s*{\s*params\s*}\s*:\s*{\s*params:\s*({[^}]+})\s*}\s*\)/g,
      (match, funcName, paramsType) => {
        return `export default async function ${funcName}(props: { params: Promise<${paramsType}> })`;
      }
    );

    // 컴포넌트 본문에서 params 사용 수정
    if (!content.includes('await props.params')) {
      content = content.replace(
        /(export\s+default\s+async\s+function\s+\w+[^{]*{)/g,
        (match) => {
          return match + '\n  const params = await props.params;';
        }
      );
    }

    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }

  return false;
}

// 메인 실행
console.log('🔍 Searching for dynamic route files...\n');

const appDir = path.join(process.cwd(), 'app');
const dynamicRouteFiles = findDynamicRoutes(appDir);

console.log(`Found ${dynamicRouteFiles.length} dynamic route files:\n`);
dynamicRouteFiles.forEach(file => {
  console.log(`  - ${file.replace(process.cwd(), '.')}`);
});

console.log('\n🔧 Fixing files...\n');

let fixedCount = 0;
dynamicRouteFiles.forEach(file => {
  if (fixFile(file)) {
    fixedCount++;
  }
});

console.log(`\n✨ Fixed ${fixedCount} files!`);

if (fixedCount > 0) {
  console.log('\n⚠️  Backup files created with .backup extension');
  console.log('📝 Please review the changes and test your application');
}