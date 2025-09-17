import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 보안 헤더만 추가 (리다이렉트 없음)
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  return response;
}

export const config = {
  matcher: [
    // API 라우트와 정적 파일은 제외
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};