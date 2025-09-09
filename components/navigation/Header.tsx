'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  LogOut, 
  Menu, 
  X, 
  Home,
  FileSearch,
  TrendingUp,
  BookOpen,
  MapPin,
  FileText,
  Settings,
  CreditCard,
  BarChart3
} from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  // 공통 메뉴 아이템 (일반 사용자용)
  const commonMenuItems = [
    { 
      label: '진단', 
      icon: FileSearch,
      children: [
        { href: '/diagnosis/smartplace', label: '스마트플레이스 진단' },
        { href: '/diagnosis/blog', label: '블로그 진단' },
        { href: '/diagnosis/instagram', label: '인스타그램 진단' }
      ]
    },
    {
      label: '관리',
      icon: TrendingUp,
      children: [
        { href: '/management/keywords', label: '중점키워드 관리' },
        { href: '/blog/keywords', label: '블로그키워드 관리' },
        { href: '/smartplace/keywords', label: '스마트플레이스 키워드관리' },
        { href: '/dashboard/ads', label: '광고 현황' }
      ]
    },
    {
      label: '블로그',
      icon: BookOpen,
      children: [
        { href: '/blog/titles', label: '블로그 제목 생성' },
        { href: '/blog/content', label: '블로그 본문 생성' },
        { href: '/blog/keywords', label: '블로그 키워드 관리' }
      ]
    },
    {
      label: '스마트플레이스',
      icon: MapPin,
      children: [
        { href: '/smartplace/introduction', label: '소개글 생성' },
        { href: '/smartplace/keywords', label: '키워드 관리' }
      ]
    },
    {
      label: '인스타',
      icon: FileText,
      children: [
        { href: '/other/instagram', label: '인스타그램 생성' },
        { href: '/other/thumbnail', label: '썸네일 생성' }
      ]
    }
  ]

  // 학원/지사용 메뉴 - 대시보드만 추가
  let menuItems = [...commonMenuItems]
  
  if (user && (user.role === 'academy' || user.role === 'agency')) {
    // 학원/지사는 대시보드 메뉴를 맨 앞에 추가
    menuItems = [
      { href: '/dashboard', label: '대시보드', icon: Home },
      ...commonMenuItems
    ]
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {menuItems.map((item) => (
              <div key={item.label} className="relative group">
                {item.children ? (
                  <>
                    <button className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-brand-navy hover:bg-gray-50 rounded-md flex items-center space-x-1">
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </button>
                    <div className="absolute left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-navy ${
                            pathname === child.href ? 'bg-gray-50 text-brand-navy font-medium' : ''
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={`px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-1 ${
                      pathname === item.href
                        ? 'text-brand-navy bg-gray-50'
                        : 'text-gray-700 hover:text-brand-navy hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">
                      {user.role === 'admin' ? '관리자' : user.role === 'agency' ? '대행사' : '사용자'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/account/settings"
                      className="p-2 text-gray-600 hover:text-gray-900"
                      title="설정"
                    >
                      <Settings size={20} />
                    </Link>
                    <Link
                      href="/account/billing"
                      className="p-2 text-gray-600 hover:text-gray-900"
                      title="결제"
                    >
                      <CreditCard size={20} />
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-gray-600 hover:text-gray-900"
                      title="로그아웃"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 text-gray-600 hover:text-gray-900"
                >
                  {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <nav className="px-4 py-2 space-y-1">
            {menuItems.map((item) => (
              <div key={item.label}>
                {item.children ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-sm font-medium text-gray-900 flex items-center space-x-1">
                      <item.icon size={16} />
                      <span>{item.label}</span>
                    </div>
                    <div className="pl-7 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-3 py-2 text-sm rounded-md ${
                            pathname === child.href
                              ? 'text-brand-navy bg-gray-50 font-medium'
                              : 'text-gray-700 hover:text-brand-navy hover:bg-gray-50'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-3 py-2 text-sm rounded-md flex items-center space-x-1 ${
                      pathname === item.href
                        ? 'text-brand-navy bg-gray-50 font-medium'
                        : 'text-gray-700 hover:text-brand-navy hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            ))}
            
            {/* Mobile User Info */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
              >
                로그아웃
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}