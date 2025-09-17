import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const response = NextResponse.next();

  // Skip middleware for static files and images
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('/favicon.ico') ||
    url.pathname.includes('.') // Skip all file extensions
  ) {
    return response;
  }

  // API 라우트는 리다이렉트하지 않음
  if (url.pathname.startsWith('/api/')) {
    // CORS Configuration for API routes
    const origin = request.headers.get('origin');

    // Allowed origins - Update for miraenad.com
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://miraenad.com', 'https://www.miraenad.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'];

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  }

  // 프로덕션 환경에서만 리다이렉션 처리
  if (process.env.NODE_ENV === 'production') {
    const host = request.headers.get('host');

    // localhost는 리다이렉션 하지 않음
    if (host && !host.includes('localhost')) {
      // Cloudflare를 사용하는 경우, CF-Visitor 헤더 확인
      const cfVisitor = request.headers.get('cf-visitor');
      let isHttps = false;

      if (cfVisitor) {
        try {
          const cfData = JSON.parse(cfVisitor);
          isHttps = cfData.scheme === 'https';
        } catch {
          // Fallback to x-forwarded-proto
          const proto = request.headers.get('x-forwarded-proto');
          isHttps = proto === 'https';
        }
      } else {
        // Cloudflare가 아닌 경우 x-forwarded-proto 사용
        const proto = request.headers.get('x-forwarded-proto');
        isHttps = proto === 'https';
      }

      // HTTPS 리다이렉션 (페이지만, Cloudflare가 처리하지 않는 경우)
      if (!isHttps && !cfVisitor) {
        // Cloudflare가 없을 때만 HTTPS로 리다이렉트
        return NextResponse.redirect(`https://${host}${url.pathname}${url.search}`, 301);
      }

      // www를 non-www로 리다이렉션
      if (host === 'www.miraenad.com') {
        return NextResponse.redirect(`https://miraenad.com${url.pathname}${url.search}`, 301);
      }
    }
  }

  // Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS - Only set if not using Cloudflare (they handle it)
  if (process.env.NODE_ENV === 'production' && !request.headers.get('cf-ray')) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};