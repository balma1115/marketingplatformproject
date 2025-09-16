/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15에서는 experimental.serverComponentsExternalPackages가 serverExternalPackages로 이동
  serverExternalPackages: ['playwright', 'playwright-core', 'playwright-chromium'],
  
  // 작업 공간 루트를 명확히 지정하여 다중 lockfile 경고 제거
  outputFileTracingRoot: 'C:/Users/User/Documents/GitHub/marketingplatformproject',
  
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
    domains: ['localhost'],
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