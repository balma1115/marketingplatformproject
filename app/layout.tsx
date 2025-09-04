import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { QueryProvider } from '@/lib/providers/query-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MarketingPlat - AI 기반 학원 마케팅 플랫폼',
  description: 'AI 기반 콘텐츠 생성부터 스마트플레이스 관리까지, 학원 성장을 위한 통합 마케팅 플랫폼',
  keywords: '학원 마케팅, AI 블로그, 스마트플레이스, 인스타그램 마케팅, 네이버 광고',
  authors: [{ name: 'MarketingPlat' }],
  other: {
    charset: 'utf-8'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}