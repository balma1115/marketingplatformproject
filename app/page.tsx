'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { 
  Search, 
  Settings, 
  FileText, 
  MapPin, 
  Instagram, 
  Palette,
  ChevronRight,
  Check,
  ArrowRight,
  Star,
  TrendingUp,
  Users,
  BarChart,
  Zap,
  Shield,
  Clock
} from 'lucide-react'

export default function LandingPage() {
  return (
    <>
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-white to-gray-50 overflow-hidden pt-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="container relative">
          <div className="py-20 md:py-32">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center px-4 py-2 bg-accent-blue/10 text-accent-blue rounded-full text-sm font-bold mb-6">
                <Zap size={16} className="mr-2" />
                AI 기반 마케팅 자동화
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                학원 마케팅의 모든 것을
                <span className="text-accent-blue block mt-2">한 곳에서 관리하세요</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                AI 기반 콘텐츠 생성부터 스마트플레이스 관리까지,
                학원 성장을 위한 통합 마케팅 플랫폼
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register" className="btn btn-primary btn-lg">
                  무료로 시작하기
                  <ArrowRight size={20} className="ml-2" />
                </Link>
                <Link href="#demo" className="btn btn-secondary btn-lg">
                  데모 보기
                </Link>
              </div>
              
              <div className="mt-12 flex items-center justify-center space-x-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <Check size={16} className="text-green-500 mr-2" />
                  신용카드 불필요
                </div>
                <div className="flex items-center">
                  <Check size={16} className="text-green-500 mr-2" />
                  14일 무료 체험
                </div>
                <div className="hidden sm:flex items-center">
                  <Check size={16} className="text-green-500 mr-2" />
                  언제든 취소 가능
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              강력한 마케팅 도구
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              학원 운영에 필요한 모든 마케팅 기능을 하나의 플랫폼에서 제공합니다
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Search />}
              title="진단"
              description="스마트플레이스, 블로그, 인스타그램 현황을 한눈에 진단하고 개선점을 파악하세요"
              features={['스플 진단', '내블로그 진단', '인스타그램 진단']}
            />
            <FeatureCard
              icon={<Settings />}
              title="관리"
              description="중점키워드와 광고 상태를 체계적으로 관리하여 효율을 극대화하세요"
              features={['중점키워드 관리', '광고 상태 모니터링', '성과 분석']}
            />
            <FeatureCard
              icon={<FileText />}
              title="블로그"
              description="AI가 작성하는 SEO 최적화된 블로그 콘텐츠로 검색 순위를 높이세요"
              features={['AI 원고생성', '키워드 관리', '성과 분석']}
            />
            <FeatureCard
              icon={<MapPin />}
              title="스마트플레이스"
              description="네이버 스마트플레이스 순위를 추적하고 최적화 전략을 수립하세요"
              features={['키워드 관리', '순위 추적', '경쟁사 분석']}
            />
            <FeatureCard
              icon={<Instagram />}
              title="인스타그램"
              description="인스타그램 트렌드를 분석하고 효과적인 콘텐츠 전략을 수립하세요"
              features={['트렌드 분석', '해시태그 추천', '콘텐츠 아이디어']}
            />
            <FeatureCard
              icon={<Palette />}
              title="디자인"
              description="전문가 수준의 썸네일과 숏폼을 쉽고 빠르게 제작하세요"
              features={['썸네일 제작기', '숏폼 생성기', '템플릿 라이브러리']}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section bg-brand-navy text-white">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard number="1,234+" label="활성 학원" />
            <StatCard number="98%" label="만족도" />
            <StatCard number="2.5M+" label="생성된 콘텐츠" />
            <StatCard number="24/7" label="고객 지원" />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section bg-gray-50">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                왜 MarketingPlat인가?
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <BenefitCard
                icon={<TrendingUp />}
                title="매출 증대"
                description="체계적인 마케팅으로 평균 35% 매출 증가"
              />
              <BenefitCard
                icon={<Clock />}
                title="시간 절약"
                description="마케팅 업무 시간을 80% 단축"
              />
              <BenefitCard
                icon={<Users />}
                title="학생 증가"
                description="효과적인 홍보로 신규 학생 유입 증가"
              />
              <BenefitCard
                icon={<Shield />}
                title="안정적 운영"
                description="데이터 기반 의사결정으로 리스크 최소화"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              합리적인 요금제
            </h2>
            <p className="text-lg text-gray-600">
              학원 규모에 맞는 플랜을 선택하세요
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Basic"
              price="29,900"
              description="소규모 학원에 적합"
              features={[
                '블로그 원고생성 (월 10회)',
                '내블로그 진단',
                '중점키워드 관리 (5개)',
                '이메일 지원'
              ]}
            />
            <PricingCard
              name="Platinum"
              price="79,900"
              description="성장하는 학원에 최적"
              features={[
                '블로그 원고생성 (월 50회)',
                '모든 진단 기능',
                '중점키워드 관리 (20개)',
                '썸네일 제작기',
                '우선 지원'
              ]}
              highlighted={true}
            />
            <PricingCard
              name="Premium"
              price="149,900"
              description="대형 학원 & 프랜차이즈"
              features={[
                '모든 기능 무제한',
                '전담 매니저 배정',
                '맞춤형 교육',
                'API 접근 권한',
                '24/7 전화 지원'
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-to-r from-brand-navy to-accent-blue text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              지금 시작하세요
            </h2>
            <p className="text-lg mb-8 text-white/90">
              14일 무료 체험으로 MarketingPlat의 모든 기능을 경험해보세요
            </p>
            <Link href="/register" className="btn bg-white text-brand-navy hover:bg-gray-100 btn-lg">
              무료 체험 시작하기
              <ArrowRight size={20} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-brand-navy font-bold text-lg">M</span>
                </div>
                <span className="font-bold text-xl text-white">MarketingPlat</span>
              </div>
              <p className="text-sm">
                학원 성장을 위한<br />통합 마케팅 플랫폼
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">제품</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">주요 기능</Link></li>
                <li><Link href="/pricing" className="hover:text-white">요금제</Link></li>
                <li><Link href="/case-studies" className="hover:text-white">성공 사례</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">회사</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">회사 소개</Link></li>
                <li><Link href="/blog" className="hover:text-white">블로그</Link></li>
                <li><Link href="/contact" className="hover:text-white">문의하기</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">법적 고지</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="hover:text-white">이용약관</Link></li>
                <li><Link href="/privacy" className="hover:text-white">개인정보처리방침</Link></li>
              </ul>
            </div>
          </div>
          
          <hr className="border-gray-800 my-8" />
          
          <div className="text-center text-sm">
            © 2024 MarketingPlat. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}

// Feature Card Component
function FeatureCard({ 
  icon, 
  title, 
  description, 
  features 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  features: string[]
}) {
  return (
    <div className="card hover:shadow-xl transition-all duration-300 group">
      <div className="card-body">
        <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-blue/20 transition-colors">
          <div className="text-accent-blue">{icon}</div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-500">
              <Check size={16} className="text-green-500 mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold mb-2">{number}</div>
      <div className="text-sm text-white/70">{label}</div>
    </div>
  )
}

// Benefit Card Component
function BenefitCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex space-x-4">
      <div className="flex-shrink-0">
        <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center">
          <div className="text-accent-blue">{icon}</div>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  )
}

// Pricing Card Component
function PricingCard({ 
  name, 
  price, 
  description, 
  features, 
  highlighted = false 
}: { 
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
}) {
  return (
    <div className={`card ${highlighted ? 'ring-2 ring-accent-blue' : ''}`}>
      <div className="card-body">
        {highlighted && (
          <div className="inline-flex items-center px-3 py-1 bg-accent-blue text-white rounded-full text-xs font-bold mb-4">
            <Star size={12} className="mr-1" />
            BEST VALUE
          </div>
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="mb-6">
          <span className="text-3xl font-bold text-gray-900">₩{price}</span>
          <span className="text-gray-500">/월</span>
        </div>
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
        <Link 
          href="/register" 
          className={`btn btn-md w-full ${highlighted ? 'btn-primary' : 'btn-secondary'}`}
        >
          시작하기
        </Link>
      </div>
    </div>
  )
}