'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Menu, X, ChevronDown, User, LogOut, Settings, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface MenuItem {
  label: string
  href: string
  subItems?: {
    label: string
    href: string
  }[]
}

// Dashboard href will be dynamically set based on user role
const getDashboardHref = (role?: string) => {
  if (!role) return '/dashboard'
  
  switch (role) {
    case 'user':
      return '/dashboard/user'
    case 'academy':
      return '/dashboard/academy'
    case 'branch':
      return '/dashboard/branch'
    case 'agency':
      return '/dashboard/agency'
    case 'admin':
      return '/dashboard/admin'
    default:
      return '/dashboard'
  }
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  // Create menuItems dynamically based on user role
  const menuItems: MenuItem[] = [
    {
      label: '대시보드',
      href: getDashboardHref(user?.role)
    },
    {
      label: '진단',
      href: '/diagnosis',
      subItems: [
        { label: '스플 진단', href: '/diagnosis/smartplace' },
        { label: '내블로그 진단', href: '/diagnosis/blog' },
        { label: '인스타그램 진단', href: '/diagnosis/instagram' }
      ]
    },
    {
      label: '관리',
      href: '/management',
      subItems: [
        { label: '중점키워드 관리', href: '/management/keywords' },
        { label: '광고 상태', href: '/management/ads-status' }
      ]
    },
    {
      label: '블로그',
      href: '/blog',
      subItems: [
        { label: '블로그 원고생성', href: '/blog/content' },
        { label: '블로그 키워드 관리', href: '/blog/keywords' },
        { label: '키워드 분석', href: '/blog/analysis' }
      ]
    },
    {
      label: '스플',
      href: '/smartplace',
      subItems: [
        { label: '스플키워드관리', href: '/smartplace/keywords' }
      ]
    },
    {
      label: '인스타',
      href: '/instagram',
      subItems: [
        { label: '인스타 트렌드', href: '/instagram/trends' }
      ]
    },
    {
      label: '디자인',
      href: '/design',
      subItems: [
        { label: '썸네일 제작기', href: '/design/thumbnail' },
        { label: '숏폼 생성기', href: '/design/shortform' }
      ]
    }
  ]

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'
      )}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-brand-navy rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              <span className="font-bold text-xl text-brand-navy hidden sm:block">
                MarketingPlat
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {menuItems.map((item) => (
              <NavDropdown key={item.label} item={item} />
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-accent-blue/10 rounded-full flex items-center justify-center">
                    <User size={16} className="text-accent-blue" />
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <div className="p-4 border-b border-gray-100">
                        <p className="font-bold text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-600">플랜: <span className="font-medium capitalize">{user.plan}</span></span>
                          <Link
                            href="/dashboard/plan"
                            onClick={() => setUserMenuOpen(false)}
                            className="text-xs text-accent-blue hover:underline"
                          >
                            플랜 관리
                          </Link>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link
                          href={getDashboardHref(user.role)}
                          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User size={16} className="text-gray-500" />
                          <span className="text-sm">대시보드</span>
                        </Link>
                        <Link
                          href="/dashboard/plan"
                          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <CreditCard size={16} className="text-gray-500" />
                          <span className="text-sm">플랜 관리</span>
                        </Link>
                        <Link
                          href="/mypage/settings"
                          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings size={16} className="text-gray-500" />
                          <span className="text-sm">설정</span>
                        </Link>
                        <hr className="my-2" />
                        <button
                          onClick={() => {
                            logout()
                            setUserMenuOpen(false)
                          }}
                          className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
                        >
                          <LogOut size={16} className="text-gray-500" />
                          <span className="text-sm">로그아웃</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="btn btn-ghost btn-sm">
                  로그인
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm hidden sm:inline-flex">
                  무료 시작하기
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <MobileMenu 
          items={menuItems} 
          user={user}
          logout={logout}
          onClose={() => setMobileMenuOpen(false)} 
        />
      )}
    </header>
  )
}

// Desktop Dropdown Component
function NavDropdown({ item }: { item: MenuItem }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Link
        href={item.href}
        className="nav-item flex items-center space-x-1"
      >
        <span>{item.label}</span>
        {item.subItems && <ChevronDown size={14} />}
      </Link>

      {item.subItems && isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg dropdown-shadow animate-slide-down">
          {item.subItems.map((subItem) => (
            <Link
              key={subItem.href}
              href={subItem.href}
              className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-brand-navy transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              {subItem.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// Mobile Menu Component
function MobileMenu({ 
  items, 
  user,
  logout,
  onClose 
}: { 
  items: MenuItem[]
  user: any
  logout: () => void
  onClose: () => void 
}) {
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }

  return (
    <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-white border-t border-gray-200 overflow-y-auto">
      <nav className="container py-4">
        {!user && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <Link
              href="/register"
              className="btn btn-primary btn-md w-full mb-2"
              onClick={onClose}
            >
              무료 시작하기
            </Link>
            <Link
              href="/login"
              className="btn btn-secondary btn-md w-full"
              onClick={onClose}
            >
              로그인
            </Link>
          </div>
        )}

        {items.map((item) => (
          <div key={item.label} className="mb-2">
            <div className="flex items-center justify-between">
              <Link
                href={item.href}
                className="flex-1 px-4 py-3 text-base font-bold text-gray-700 hover:text-brand-navy"
                onClick={onClose}
              >
                {item.label}
              </Link>
              {item.subItems && (
                <button
                  onClick={() => toggleExpand(item.label)}
                  className="p-3"
                >
                  <ChevronDown
                    size={16}
                    className={cn(
                      'transition-transform',
                      expandedItems.includes(item.label) && 'rotate-180'
                    )}
                  />
                </button>
              )}
            </div>
            
            {item.subItems && expandedItems.includes(item.label) && (
              <div className="ml-4 mt-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className="block px-4 py-2.5 text-sm text-gray-600 hover:text-brand-navy"
                    onClick={onClose}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}

        {user && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="px-4 py-3 mb-2 bg-gray-50 rounded-lg">
              <p className="font-bold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-600">플랜: <span className="font-medium capitalize">{user.plan}</span></span>
                <Link
                  href="/dashboard/plan"
                  onClick={onClose}
                  className="text-xs text-accent-blue hover:underline"
                >
                  플랜 관리
                </Link>
              </div>
            </div>
            <Link
              href={getDashboardHref(user.role)}
              className="block px-4 py-3 text-base font-bold text-gray-700 hover:text-brand-navy"
              onClick={onClose}
            >
              대시보드
            </Link>
            <button
              className="block w-full text-left px-4 py-3 text-base font-bold text-gray-700 hover:text-brand-navy"
              onClick={() => {
                logout()
                onClose()
              }}
            >
              로그아웃
            </button>
          </div>
        )}
      </nav>
    </div>
  )
}