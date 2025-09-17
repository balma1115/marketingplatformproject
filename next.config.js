/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // 이미지 도메인 허용
  images: {
    domains: ['localhost', 'miraenad.com', 'images.unsplash.com'],
  },

  // API 요청 크기 제한 증가
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },

  // 서버 설정
  serverOptions: {
    bodyParser: {
      sizeLimit: '10mb',
    },
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
}

module.exports = nextConfig