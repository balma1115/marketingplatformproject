'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  CreditCard,
  Shield,
  Settings,
  Key,
  BarChart,
  TrendingUp,
  FileText,
  ArrowRight,
  Check,
  AlertCircle,
  Download,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MyPage() {
  const [activeTab, setActiveTab] = useState('overview')
  
  // Mock user data
  const userData = {
    name: '홍길동',
    email: 'hong@example.com',
    phone: '010-1234-5678',
    academyName: 'ABC영어학원',
    accountType: 'academy',
    joinDate: '2024-01-15',
    plan: 'platinum',
    planExpiry: '2024-12-15',
    usage: {
      blogPosts: 35,
      blogPostsLimit: 50,
      keywords: 15,
      keywordsLimit: 20,
      thumbnails: 28,
      thumbnailsLimit: 100
    }
  }

  return (
    <>
      <Header />
      
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">마이페이지</h1>
            <p className="text-gray-600">계정 정보와 이용 현황을 관리하세요</p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors",
                      activeTab === 'overview' 
                        ? "bg-accent-blue/10 text-accent-blue" 
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <User size={18} />
                    <span className="font-bold">개요</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('billing')}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors",
                      activeTab === 'billing' 
                        ? "bg-accent-blue/10 text-accent-blue" 
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <CreditCard size={18} />
                    <span className="font-bold">결제 및 요금제</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('usage')}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors",
                      activeTab === 'usage' 
                        ? "bg-accent-blue/10 text-accent-blue" 
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <BarChart size={18} />
                    <span className="font-bold">사용량</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('api')}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors",
                      activeTab === 'api' 
                        ? "bg-accent-blue/10 text-accent-blue" 
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <Key size={18} />
                    <span className="font-bold">API 키</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors",
                      activeTab === 'settings' 
                        ? "bg-accent-blue/10 text-accent-blue" 
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <Settings size={18} />
                    <span className="font-bold">설정</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === 'overview' && <OverviewSection userData={userData} />}
              {activeTab === 'billing' && <BillingSection userData={userData} />}
              {activeTab === 'usage' && <UsageSection userData={userData} />}
              {activeTab === 'api' && <ApiSection />}
              {activeTab === 'settings' && <SettingsSection userData={userData} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// Overview Section Component
function OverviewSection({ userData }: any) {
  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">프로필 정보</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-500">이름</label>
            <div className="flex items-center mt-1">
              <User size={18} className="text-gray-400 mr-2" />
              <span className="font-bold">{userData.name}</span>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-500">이메일</label>
            <div className="flex items-center mt-1">
              <Mail size={18} className="text-gray-400 mr-2" />
              <span className="font-bold">{userData.email}</span>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-500">연락처</label>
            <div className="flex items-center mt-1">
              <Phone size={18} className="text-gray-400 mr-2" />
              <span className="font-bold">{userData.phone}</span>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-500">학원명</label>
            <div className="flex items-center mt-1">
              <Building size={18} className="text-gray-400 mr-2" />
              <span className="font-bold">{userData.academyName}</span>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-500">계정 유형</label>
            <div className="flex items-center mt-1">
              <Shield size={18} className="text-gray-400 mr-2" />
              <span className="font-bold capitalize">{userData.accountType}</span>
            </div>
          </div>
          
          <div>
            <label className="text-sm text-gray-500">가입일</label>
            <div className="flex items-center mt-1">
              <Calendar size={18} className="text-gray-400 mr-2" />
              <span className="font-bold">{userData.joinDate}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex space-x-3">
          <button className="btn btn-secondary btn-sm">
            프로필 수정
          </button>
          <button className="btn btn-ghost btn-sm">
            비밀번호 변경
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="text-accent-blue" size={24} />
            <span className="text-xs text-gray-500">이번 달</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{userData.usage.blogPosts}</div>
          <div className="text-sm text-gray-600">생성된 블로그 포스트</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="text-green-500" size={24} />
            <span className="text-xs text-gray-500">전체</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{userData.usage.keywords}</div>
          <div className="text-sm text-gray-600">관리중인 키워드</div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="text-brand-navy" size={24} />
            <span className="text-xs text-gray-500">현재</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 capitalize">{userData.plan}</div>
          <div className="text-sm text-gray-600">구독 플랜</div>
        </div>
      </div>
    </div>
  )
}

// Billing Section Component
function BillingSection({ userData }: any) {
  const planDetails = {
    basic: { name: 'Basic', price: '29,900', color: 'gray' },
    platinum: { name: 'Platinum', price: '79,900', color: 'accent-blue' },
    premium: { name: 'Premium', price: '149,900', color: 'brand-navy' }
  }
  
  const currentPlan = planDetails[userData.plan as keyof typeof planDetails]
  
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">현재 요금제</h2>
        
        <div className={cn(
          "border-2 rounded-lg p-6",
          userData.plan === 'platinum' ? "border-accent-blue bg-accent-blue/5" : 
          userData.plan === 'premium' ? "border-brand-navy bg-brand-navy/5" : 
          "border-gray-200 bg-gray-50"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{currentPlan.name}</h3>
              <p className="text-gray-600">월 ₩{currentPlan.price}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">다음 결제일</p>
              <p className="font-bold">{userData.planExpiry}</p>
            </div>
          </div>
          
          <div className="space-y-2 mb-6">
            <div className="flex items-center text-sm">
              <Check size={16} className="text-green-500 mr-2" />
              <span>블로그 원고생성 월 {userData.usage.blogPostsLimit}회</span>
            </div>
            <div className="flex items-center text-sm">
              <Check size={16} className="text-green-500 mr-2" />
              <span>중점키워드 관리 {userData.usage.keywordsLimit}개</span>
            </div>
            <div className="flex items-center text-sm">
              <Check size={16} className="text-green-500 mr-2" />
              <span>썸네일 제작 월 {userData.usage.thumbnailsLimit}회</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Link href="/pricing" className="btn btn-primary btn-sm">
              플랜 업그레이드
            </Link>
            <button className="btn btn-secondary btn-sm">
              결제 관리
            </button>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">결제 내역</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-bold text-gray-700">날짜</th>
                <th className="text-left py-3 px-2 text-sm font-bold text-gray-700">상품</th>
                <th className="text-left py-3 px-2 text-sm font-bold text-gray-700">금액</th>
                <th className="text-left py-3 px-2 text-sm font-bold text-gray-700">상태</th>
                <th className="text-left py-3 px-2 text-sm font-bold text-gray-700">영수증</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-2 text-sm">2024-11-15</td>
                <td className="py-3 px-2 text-sm">Platinum 월간</td>
                <td className="py-3 px-2 text-sm">₩79,900</td>
                <td className="py-3 px-2">
                  <span className="inline-flex px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">
                    완료
                  </span>
                </td>
                <td className="py-3 px-2">
                  <button className="text-accent-blue hover:underline text-sm">
                    <Download size={16} className="inline mr-1" />
                    다운로드
                  </button>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-2 text-sm">2024-10-15</td>
                <td className="py-3 px-2 text-sm">Platinum 월간</td>
                <td className="py-3 px-2 text-sm">₩79,900</td>
                <td className="py-3 px-2">
                  <span className="inline-flex px-2 py-1 text-xs font-bold bg-green-100 text-green-700 rounded-full">
                    완료
                  </span>
                </td>
                <td className="py-3 px-2">
                  <button className="text-accent-blue hover:underline text-sm">
                    <Download size={16} className="inline mr-1" />
                    다운로드
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Usage Section Component
function UsageSection({ userData }: any) {
  return (
    <div className="space-y-6">
      {/* Usage Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">이용 현황</h2>
        
        <div className="space-y-6">
          {/* Blog Posts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-900">블로그 포스트</h3>
                <p className="text-sm text-gray-500">이번 달 생성된 포스트</p>
              </div>
              <span className="text-sm font-bold">
                {userData.usage.blogPosts} / {userData.usage.blogPostsLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-accent-blue h-2 rounded-full transition-all"
                style={{ width: `${(userData.usage.blogPosts / userData.usage.blogPostsLimit) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Keywords */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-900">중점 키워드</h3>
                <p className="text-sm text-gray-500">관리중인 키워드</p>
              </div>
              <span className="text-sm font-bold">
                {userData.usage.keywords} / {userData.usage.keywordsLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${(userData.usage.keywords / userData.usage.keywordsLimit) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Thumbnails */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-900">썸네일 제작</h3>
                <p className="text-sm text-gray-500">이번 달 제작된 썸네일</p>
              </div>
              <span className="text-sm font-bold">
                {userData.usage.thumbnails} / {userData.usage.thumbnailsLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${(userData.usage.thumbnails / userData.usage.thumbnailsLimit) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {userData.plan !== 'premium' && (
          <div className="mt-6 p-4 bg-accent-blue/10 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              더 많은 기능이 필요하신가요?
            </p>
            <Link href="/pricing" className="btn btn-primary btn-sm">
              플랜 업그레이드
              <ArrowRight size={16} className="ml-2" />
            </Link>
          </div>
        )}
      </div>

      {/* Usage History */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">최근 활동</h2>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3 pb-4 border-b">
            <div className="w-8 h-8 bg-accent-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-accent-blue" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">블로그 포스트 생성</p>
              <p className="text-sm text-gray-600">"효과적인 영어 학습법 10가지"</p>
              <p className="text-xs text-gray-500 mt-1">2시간 전</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 pb-4 border-b">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">키워드 순위 상승</p>
              <p className="text-sm text-gray-600">"강남 영어학원" 5위 → 3위</p>
              <p className="text-xs text-gray-500 mt-1">5시간 전</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Settings size={16} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">썸네일 제작</p>
              <p className="text-sm text-gray-600">"수능 대비 특강" 썸네일</p>
              <p className="text-xs text-gray-500 mt-1">1일 전</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// API Section Component
function ApiSection() {
  const [showKey, setShowKey] = useState(false)
  const apiKey = 'sk-proj-abcdefghijklmnopqrstuvwxyz123456789'
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">API 키 관리</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertCircle className="text-amber-500 mt-0.5 mr-2 flex-shrink-0" size={18} />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">보안 주의사항</p>
              <p>API 키는 중요한 보안 정보입니다. 절대 공개적으로 노출하지 마세요.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Production API Key</label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  readOnly
                  className="form-input font-mono text-sm pr-20"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showKey ? '숨기기' : '보기'}
                </button>
              </div>
              <button className="btn btn-secondary btn-sm">
                복사
              </button>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="btn btn-primary btn-sm">
              새 키 생성
            </button>
            <button className="btn btn-ghost btn-sm text-red-600">
              키 삭제
            </button>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-bold text-gray-900 mb-3">API 사용량</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">오늘</p>
              <p className="text-xl font-bold">1,234</p>
              <p className="text-xs text-gray-500">요청</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">이번 달</p>
              <p className="text-xl font-bold">45,678</p>
              <p className="text-xs text-gray-500">요청</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">한도</p>
              <p className="text-xl font-bold">100,000</p>
              <p className="text-xs text-gray-500">요청/월</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Settings Section Component
function SettingsSection({ userData }: any) {
  return (
    <div className="space-y-6">
      {/* Account Settings */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">계정 설정</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">이메일 알림</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">마케팅 정보 수신</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">중요 공지사항</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">주간 리포트</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">언어 설정</label>
            <select className="form-input w-full max-w-xs">
              <option>한국어</option>
              <option>English</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">시간대</label>
            <select className="form-input w-full max-w-xs">
              <option>서울 (GMT+9)</option>
              <option>도쿄 (GMT+9)</option>
              <option>뉴욕 (GMT-5)</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t">
          <h3 className="font-bold text-gray-900 mb-3">위험 구역</h3>
          <div className="space-y-3">
            <button className="btn btn-secondary btn-sm">
              데이터 내보내기
            </button>
            <div>
              <button className="btn btn-ghost btn-sm text-red-600">
                계정 삭제
              </button>
              <p className="text-xs text-gray-500 mt-1">
                계정 삭제 시 모든 데이터가 영구적으로 삭제됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}