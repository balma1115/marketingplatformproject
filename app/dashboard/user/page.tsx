'use client'

import { useAuth } from '@/contexts/AuthContext'
import { mockDashboardData } from '@/lib/mockData'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import { 
  Clock, 
  Lock, 
  Rocket,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Trophy,
  Zap
} from 'lucide-react'

export default function UserDashboard() {
  const { user } = useAuth()
  const data = mockDashboardData.user

  const plans = [
    {
      name: 'Basic',
      price: '무료',
      period: '',
      features: [
        { text: '기본 템플릿 5개', available: true },
        { text: '월 3개 콘텐츠 생성', available: true },
        { text: '기본 분석 도구', available: true },
        { text: 'AI 콘텐츠 생성', available: false },
        { text: '고급 분석', available: false },
        { text: '1:1 컨설팅', available: false }
      ],
      current: user?.plan === 'basic',
      color: 'gray'
    },
    {
      name: 'Platinum',
      price: '₩99,000',
      period: '/월',
      features: [
        { text: '프리미엄 템플릿 50개', available: true },
        { text: '월 50개 콘텐츠 생성', available: true },
        { text: 'AI 콘텐츠 생성', available: true },
        { text: '고급 분석 도구', available: true },
        { text: '우선 지원', available: true },
        { text: '1:1 컨설팅', available: false }
      ],
      current: user?.plan === 'platinum',
      color: 'blue',
      popular: true
    },
    {
      name: 'Premium',
      price: '₩199,000',
      period: '/월',
      features: [
        { text: '모든 템플릿 무제한', available: true },
        { text: '무제한 콘텐츠 생성', available: true },
        { text: 'AI 콘텐츠 생성', available: true },
        { text: '고급 분석 도구', available: true },
        { text: '최우선 지원', available: true },
        { text: '월 2회 1:1 컨설팅', available: true }
      ],
      current: user?.plan === 'premium',
      color: 'purple'
    }
  ]

  const trialFeatures = [
    { icon: Sparkles, title: 'AI 블로그 작성', description: '키워드만 입력하면 자동으로 블로그 포스트 생성' },
    { icon: Trophy, title: '스마트플레이스 최적화', description: '네이버 스마트플레이스 자동 관리 및 최적화' },
    { icon: Zap, title: '인스타그램 자동화', description: '콘텐츠 자동 생성 및 예약 포스팅' }
  ]

  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">환영합니다, {user?.name}님!</h1>
          <p className="text-gray-600 mt-1">MarketingPlat과 함께 학원 마케팅을 시작해보세요</p>
        </div>

        {/* Trial Status - Only for Basic Plan */}
        {user?.plan === 'basic' && (
          <>
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">무료 체험 기간</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-1">{data.trialDaysLeft}일 남음</h2>
                  <p className="text-sm opacity-90">
                    프리미엄 기능을 체험하고 학원 마케팅을 혁신해보세요
                  </p>
                </div>
                <Link
                  href="/dashboard/user/subscription"
                  className="px-6 py-3 bg-white text-purple-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  지금 업그레이드
                </Link>
              </div>
            </div>

            {/* Features to Try - Only for Basic Plan */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">체험 가능한 프리미엄 기능</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trialFeatures.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                        <Icon className="text-white" size={24} />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                      <button className="mt-4 text-sm text-accent-blue font-medium hover:underline flex items-center">
                        체험하기 <ArrowRight size={14} className="ml-1" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Pricing Plans - Only for Basic Plan */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">요금제 선택</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-xl p-6 shadow-sm border ${
                      plan.current ? 'border-accent-blue ring-2 ring-accent-blue' : 'border-gray-100'
                    } relative`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          가장 인기
                        </span>
                      </div>
                    )}
                    
                    {plan.current && (
                      <div className="absolute -top-3 right-4">
                        <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          현재 플랜
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-500 ml-1">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          {feature.available ? (
                            <CheckCircle size={16} className="text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-gray-300 mt-0.5 mr-2 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${feature.available ? 'text-gray-700' : 'text-gray-400'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {!plan.current && (
                      <button className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        plan.name === 'Basic' 
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                      }`}>
                        {plan.name === 'Basic' ? '다운그레이드' : '업그레이드'}
                      </button>
                    )}
                    
                    {plan.current && (
                      <button className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed" disabled>
                        현재 이용 중
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Dashboard Content for Premium/Platinum Users */}
        {(user?.plan === 'premium' || user?.plan === 'platinum') && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Quick Stats */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-600 mb-2">활성 캠페인</h3>
                <p className="text-3xl font-bold text-gray-900">12</p>
                <p className="text-sm text-green-600 mt-1">+3 이번 주</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-600 mb-2">생성된 콘텐츠</h3>
                <p className="text-3xl font-bold text-gray-900">48</p>
                <p className="text-sm text-green-600 mt-1">+12 이번 달</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-600 mb-2">순위 상승 키워드</h3>
                <p className="text-3xl font-bold text-gray-900">23</p>
                <p className="text-sm text-green-600 mt-1">+5 이번 주</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">빠른 실행</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/dashboard/academy/blog" className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-colors text-center">
                  <Sparkles className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">AI 블로그 작성</p>
                </Link>
                <Link href="/smartplace/keywords" className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg hover:from-green-100 hover:to-teal-100 transition-colors text-center">
                  <Trophy className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">순위 추적</p>
                </Link>
                <Link href="/dashboard/academy/instagram" className="p-4 bg-gradient-to-r from-pink-50 to-orange-50 rounded-lg hover:from-pink-100 hover:to-orange-100 transition-colors text-center">
                  <Zap className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">인스타 콘텐츠</p>
                </Link>
                <Link href="/management/keywords" className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg hover:from-indigo-100 hover:to-blue-100 transition-colors text-center">
                  <Rocket className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">키워드 관리</p>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">최근 활동</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">블로그 포스트 발행</p>
                      <p className="text-xs text-gray-500">2시간 전</p>
                    </div>
                  </div>
                  <Link href="#" className="text-sm text-accent-blue hover:underline">보기</Link>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">키워드 순위 상승</p>
                      <p className="text-xs text-gray-500">5시간 전</p>
                    </div>
                  </div>
                  <Link href="#" className="text-sm text-accent-blue hover:underline">보기</Link>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">인스타그램 자동 포스팅</p>
                      <p className="text-xs text-gray-500">1일 전</p>
                    </div>
                  </div>
                  <Link href="#" className="text-sm text-accent-blue hover:underline">보기</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Getting Started Guide */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">시작하기 가이드</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/dashboard/user/profile" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-900 mb-1">1. 프로필 완성하기</h3>
              <p className="text-sm text-gray-600">학원 정보를 입력하고 프로필을 완성하세요</p>
            </Link>
            <Link href="/dashboard/academy/blog" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-900 mb-1">2. 첫 블로그 작성</h3>
              <p className="text-sm text-gray-600">AI로 첫 블로그 포스트를 생성해보세요</p>
            </Link>
            <Link href="/dashboard/academy/smartplace" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-900 mb-1">3. 스마트플레이스 연동</h3>
              <p className="text-sm text-gray-600">네이버 스마트플레이스를 연동하세요</p>
            </Link>
            <Link href="/dashboard/academy/instagram" className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h3 className="font-medium text-gray-900 mb-1">4. 인스타그램 시작</h3>
              <p className="text-sm text-gray-600">인스타그램 마케팅을 시작하세요</p>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}