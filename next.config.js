/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // !! 위험: 프로덕션 빌드에서 타입 오류를 무시합니다 !!
    // 임시 해결책으로만 사용하세요
    ignoreBuildErrors: true,
  },

  // workspace root 설정 (lockfile 경고 해결)
  outputFileTracingRoot: '/home/ubuntu/marketingplatformproject',

  // 이미지 도메인 허용
  images: {
    domains: ['localhost', 'miraenad.com', 'images.unsplash.com'],
  },

  // 환경 변수
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  },

  // Webpack 설정
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },

  // 실험적 기능 - 요청 크기 제한
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig