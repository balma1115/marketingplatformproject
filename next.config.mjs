/** @type {import('next').NextConfig} */
const nextConfig = {
  // 프로덕션에서 도메인 사용 강제
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://www.marekplace.co.kr' : '',

  // Next.js 15에서는 experimental.serverComponentsExternalPackages가 serverExternalPackages로 이동
  serverExternalPackages: ['playwright', 'playwright-core', 'playwright-chromium'],
  
  // 작업 공간 루트를 동적으로 설정 (AWS 배포용)
  outputFileTracingRoot: process.cwd(),
  
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Playwright를 서버 사이드에서만 사용하도록 설정
      config.externals.push('playwright', 'playwright-core', 'playwright-chromium')
    }
    
    // Jest worker 에러 해결: 개발 모드에서만 최적화 비활성화
    if (dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        minimize: false,
        minimizer: [],
      }
      
      // Worker pool 크기 제한
      config.parallelism = 1
    }
    
    return config
  },
  
  // 추가 설정
  poweredByHeader: false,
  compress: true,

  // 이미지 최적화 설정
  images: {
    domains: ['localhost', 'marekplace.co.kr', 'www.marekplace.co.kr'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // 프로덕션 환경에서 HTTPS 강제 및 보안 헤더
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production'
              ? "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:;"
              : "default-src 'self' http: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:; style-src 'self' 'unsafe-inline' http: https:; img-src 'self' data: http: https:; font-src 'self' data: http: https:;",
          },
        ],
      },
    ]
  },

  // TypeScript 및 ESLint 에러 무시 (프로덕션 빌드용)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig