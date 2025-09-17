'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import Link from 'next/link'
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Download,
  ArrowRight,
  Sparkles,
  Clock,
  Shield,
  Zap
} from 'lucide-react'

export default function PlanManagementPage() {
  const { user } = useAuth()
  const [selectedTab, setSelectedTab] = useState('current')

  const currentPlanDetails = {
    basic: {
      name: 'Basic',
      price: '무료',
      billing: '무료 체험',
      features: [
        { name: '기본 템플릿', value: '5개', available: true },
        { name: '월 콘텐츠 생성', value: '3개', available: true },
        { name: '기본 분석 도구', value: '제한적', available: true },
        { name: 'AI 콘텐츠 생성', value: '-', available: false },
        { name: '고급 분석', value: '-', available: false },
        { name: '1:1 컨설팅', value: '-', available: false },
        { name: '우선 지원', value: '-', available: false }
      ]
    },
    platinum: {
      name: 'Platinum',
      price: '₩99,000',
      billing: '월간 결제',
      features: [
        { name: '프리미엄 템플릿', value: '50개', available: true },
        { name: '월 콘텐츠 생성', value: '50개', available: true },
        { name: 'AI 콘텐츠 생성', value: '무제한', available: true },
        { name: '고급 분석 도구', value: '전체', available: true },
        { name: '우선 지원', value: '24시간', available: true },
        { name: '1:1 컨설팅', value: '-', available: false },
        { name: 'API 접근', value: '제한적', available: true }
      ]
    },
    premium: {
      name: 'Premium',
      price: '₩199,000',
      billing: '월간 결제',
      features: [
        { name: '모든 템플릿', value: '무제한', available: true },
        { name: '월 콘텐츠 생성', value: '무제한', available: true },
        { name: 'AI 콘텐츠 생성', value: '무제한', available: true },
        { name: '고급 분석 도구', value: '전체', available: true },
        { name: '최우선 지원', value: '연중무휴', available: true },
        { name: '1:1 컨설팅', value: '월 2회', available: true },
        { name: 'API 접근', value: '무제한', available: true }
      ]
    }
  }

  const billingHistory = [
    { date: '2024-12-01', amount: '₩99,000', status: '결제완료', invoice: 'INV-2024-12-001' },
    { date: '2024-11-01', amount: '₩99,000', status: '결제완료', invoice: 'INV-2024-11-001' },
    { date: '2024-10-01', amount: '₩99,000', status: '결제완료', invoice: 'INV-2024-10-001' },
    { date: '2024-09-01', amount: '₩99,000', status: '결제완료', invoice: 'INV-2024-09-001' }
  ]

  const currentPlan = currentPlanDetails[(user?.plan || 'basic') as keyof typeof currentPlanDetails]

  const upgradePlans = [
    {
      name: 'Platinum',
      price: '₩99,000',
      period: '/월',
      description: '성장하는 학원을 위한 플랜',
      highlights: [
        'AI 콘텐츠 생성 50회/월',
        '프리미엄 템플릿 50개',
        '우선 지원'
      ],
      color: 'blue',
      available: user?.plan !== 'platinum' && user?.plan !== 'premium'
    },
    {
      name: 'Premium',
      price: '₩199,000',
      period: '/월',
      description: '전문 마케팅을 위한 플랜',
      highlights: [
        '무제한 AI 콘텐츠 생성',
        '모든 템플릿 무제한',
        '1:1 컨설팅 월 2회'
      ],
      color: 'purple',
      available: user?.plan !== 'premium'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
            <Link href={`/dashboard/${user?.role}`} className="hover:text-accent-blue">
              대시보드
            </Link>
            <span>/</span>
            <span className="text-gray-900">플랜 관리</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">플랜 및 결제 관리</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Current Plan Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">현재 플랜</h2>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  user?.plan === 'premium' ? 'bg-purple-100 text-purple-700' :
                  user?.plan === 'platinum' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {currentPlan.name}
                </span>
              </div>
              <p className="text-gray-600">
                {user?.plan === 'basic'
                  ? `무료 체험 기간: ${(user as any)?.planExpiry || '2025-01-31'}까지`
                  : `다음 결제일: ${(user as any)?.planExpiry || '2025-01-31'}`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{currentPlan.price}</p>
              <p className="text-sm text-gray-600">{currentPlan.billing}</p>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">블로그 포스트</span>
                <span className="text-sm font-medium">
                  {(user as any)?.usage?.blogPosts || 0}/{(user as any)?.usage?.blogPostsLimit === 999999 ? '∞' : ((user as any)?.usage?.blogPostsLimit || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ 
                    width: (user as any)?.usage?.blogPostsLimit === 999999 
                      ? '0%' 
                      : `${(((user as any)?.usage?.blogPosts || 0) / ((user as any)?.usage?.blogPostsLimit || 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">키워드 분석</span>
                <span className="text-sm font-medium">
                  {(user as any)?.usage?.keywords || 0}/{(user as any)?.usage?.keywordsLimit === 999999 ? '∞' : ((user as any)?.usage?.keywordsLimit || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: (user as any)?.usage?.keywordsLimit === 999999 
                      ? '0%' 
                      : `${(((user as any)?.usage?.keywords || 0) / ((user as any)?.usage?.keywordsLimit || 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">썸네일 생성</span>
                <span className="text-sm font-medium">
                  {(user as any)?.usage?.thumbnails || 0}/{(user as any)?.usage?.thumbnailsLimit === 999999 ? '∞' : ((user as any)?.usage?.thumbnailsLimit || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ 
                    width: (user as any)?.usage?.thumbnailsLimit === 999999 
                      ? '0%' 
                      : `${(((user as any)?.usage?.thumbnails || 0) / ((user as any)?.usage?.thumbnailsLimit || 1)) * 100}%` 
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {user?.plan !== 'premium' && (
              <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors">
                업그레이드
              </button>
            )}
            {user?.plan !== 'basic' && (
              <>
                <button className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  결제 방법 변경
                </button>
                <button className="px-6 py-2 bg-white border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors">
                  구독 취소
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setSelectedTab('current')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedTab === 'current' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            플랜 상세
          </button>
          <button
            onClick={() => setSelectedTab('upgrade')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedTab === 'upgrade' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            업그레이드
          </button>
          <button
            onClick={() => setSelectedTab('billing')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              selectedTab === 'billing' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            결제 내역
          </button>
        </div>

        {/* Tab Content */}
        {selectedTab === 'current' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">플랜 기능</h3>
            <div className="space-y-4">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    {feature.available ? (
                      <CheckCircle className="text-green-500" size={20} />
                    ) : (
                      <XCircle className="text-gray-300" size={20} />
                    )}
                    <span className={`font-medium ${feature.available ? 'text-gray-900' : 'text-gray-400'}`}>
                      {feature.name}
                    </span>
                  </div>
                  <span className={`font-medium ${feature.available ? 'text-gray-900' : 'text-gray-400'}`}>
                    {feature.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'upgrade' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upgradePlans.map((plan, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-sm border ${
                !plan.available ? 'border-gray-100 opacity-60' : 'border-accent-blue'
              } p-6`}>
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm">{plan.description}</p>
                </div>
                
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start">
                      <Sparkles className="text-yellow-500 mr-2 mt-0.5" size={16} />
                      <span className="text-sm text-gray-700">{highlight}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  disabled={!plan.available}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    plan.available 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {!plan.available ? '현재 플랜' : '업그레이드'}
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'billing' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">결제 내역</h3>
            {user?.plan === 'basic' ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-600">아직 결제 내역이 없습니다</p>
                <p className="text-sm text-gray-500 mt-2">유료 플랜으로 업그레이드하면 여기에서 결제 내역을 확인할 수 있습니다</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                      <th className="pb-3">날짜</th>
                      <th className="pb-3">금액</th>
                      <th className="pb-3">상태</th>
                      <th className="pb-3">인보이스</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingHistory.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-4 text-sm text-gray-900">{item.date}</td>
                        <td className="py-4 text-sm font-medium text-gray-900">{item.amount}</td>
                        <td className="py-4">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-gray-600">{item.invoice}</td>
                        <td className="py-4">
                          <button className="text-accent-blue hover:underline text-sm flex items-center">
                            <Download size={14} className="mr-1" />
                            다운로드
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}