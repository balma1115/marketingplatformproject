'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Target, 
  Settings, 
  LogOut,
  Building,
  GraduationCap,
  Briefcase,
  UserCircle,
  ChevronRight,
  Bell,
  Search
} from 'lucide-react'

const roleMenus = {
  admin: [
    { href: '/dashboard/admin', label: '대시보드', icon: LayoutDashboard },
    { href: '/dashboard/admin/users', label: '사용자 관리', icon: Users },
    { href: '/dashboard/admin/agencies', label: '대행사 관리', icon: Building },
    { href: '/dashboard/admin/api', label: 'API 사용량', icon: Target },
    { href: '/dashboard/admin/settings', label: '시스템 설정', icon: Settings }
  ],
  agency: [
    { href: '/dashboard/agency', label: '대시보드', icon: LayoutDashboard },
    { href: '/dashboard/agency/branches', label: '지사 관리', icon: Building },
    { href: '/dashboard/agency/academies', label: '학원 관리', icon: GraduationCap },
    { href: '/dashboard/agency/campaigns', label: '캠페인 관리', icon: Target },
    { href: '/dashboard/agency/reports', label: '리포트', icon: FileText }
  ],
  branch: [
    { href: '/dashboard/branch', label: '대시보드', icon: LayoutDashboard },
    { href: '/dashboard/branch/academies', label: '학원 관리', icon: GraduationCap },
    { href: '/dashboard/branch/performance', label: '성과 분석', icon: Target },
    { href: '/dashboard/branch/reports', label: '리포트', icon: FileText }
  ],
  academy: [
    { href: '/dashboard/academy', label: '대시보드', icon: LayoutDashboard },
    { href: '/dashboard/academy/blog', label: '블로그 관리', icon: FileText },
    { href: '/dashboard/academy/smartplace', label: '스마트플레이스', icon: Building },
    { href: '/dashboard/academy/instagram', label: '인스타그램', icon: Target },
    { href: '/dashboard/academy/ads', label: '광고 관리', icon: Briefcase }
  ],
  user: [
    { href: '/dashboard/user', label: '대시보드', icon: LayoutDashboard },
    { href: '/dashboard/user/profile', label: '프로필', icon: UserCircle },
    { href: '/dashboard/user/subscription', label: '구독 관리', icon: Settings }
  ]
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    )
  }

  if (!user) return null

  const menus = roleMenus[user.role] || []

  // For branch, academy, and user roles, don't show the dashboard layout
  if (['branch', 'academy', 'user'].includes(user.role)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Only for admin and agency */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-brand-navy rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <span className="font-bold text-xl text-brand-navy hidden sm:block">MarketingPlat</span>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-8 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell size={20} />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500"></span>
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role === 'admin' ? '관리자' : '대행사'}</p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title="로그아웃"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {menus.map((menu) => {
              const Icon = menu.icon
              const isActive = pathname === menu.href
              return (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-accent-blue text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={20} />
                    <span className="font-medium">{menu.label}</span>
                  </div>
                  {isActive && <ChevronRight size={16} />}
                </Link>
              )
            })}
          </nav>

          {/* Plan Info */}
          <div className="p-4 border-t border-gray-200 mt-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">현재 플랜</p>
              <p className="font-bold text-accent-blue capitalize">{user.plan}</p>
              <p className="text-xs text-gray-500 mt-2">만료일: {user.planExpiry}</p>
              <Link 
                href="/dashboard/plan"
                className="mt-3 block text-center text-xs px-3 py-2 bg-white border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                플랜 관리 →
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}