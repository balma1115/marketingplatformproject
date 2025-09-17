import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // HTTPS 리디렉션 비활성화 - HTTP만 사용
  // if (process.env.NODE_ENV === 'production') {
  //   const proto = request.headers.get('x-forwarded-proto');
  //   const host = request.headers.get('host');

  //   // HTTP로 들어온 요청을 HTTPS로 리디렉션
  //   if (proto === 'http' && host) {
  //     const httpsUrl = `https://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
  //     return NextResponse.redirect(httpsUrl, 301);
  //   }

  //   // www 없는 도메인을 www로 리디렉션
  //   if (host && host === 'marekplace.co.kr') {
  //     const wwwUrl = `https://www.marekplace.co.kr${request.nextUrl.pathname}${request.nextUrl.search}`;
  //     return NextResponse.redirect(wwwUrl, 301);
  //   }
  // }

  const response = NextResponse.next();

  // Security Headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS (HTTP Strict Transport Security) - Only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Content Security Policy - Adjust based on your needs
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com data:;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://*.naver.com https://*.googleapis.com wss: ws:;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\n/g, '');

  response.headers.set('Content-Security-Policy', cspHeader);

  // CORS Configuration for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');

    // Allowed origins - Update based on your domains
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://marekplace.co.kr', 'https://www.marekplace.co.kr']
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
  }

  // Rate limiting headers (informational - actual limiting done by Nginx)
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};