'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const auth = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showTestAccounts, setShowTestAccounts] = useState(true)
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const success = await auth.login(formData.email, formData.password)
    
    if (!success) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
    }
  }

  const quickLogin = (email: string, password: string) => {
    setFormData({ email, password })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Simple Header */}
      <header className="absolute top-0 left-0 right-0 z-10">
        <div className="container py-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-navy rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-bold text-xl text-brand-navy">MarketingPlat</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                다시 오신 것을 환영합니다
              </h1>
              <p className="text-gray-600">
                계정에 로그인하여 서비스를 이용하세요
              </p>
            </div>

            {/* Social Login */}
            <div className="space-y-3 mb-6">
              <button className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                <span className="text-sm font-medium text-gray-700">Google로 계속하기</span>
              </button>
              <button className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-5 h-5 bg-[#03C75A] rounded-sm flex items-center justify-center">
                  <span className="text-white font-bold text-xs">N</span>
                </div>
                <span className="text-sm font-medium text-gray-700">네이버로 계속하기</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">또는</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle size={16} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="form-label">
                  이메일
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="form-input pl-10"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="form-label mb-0">
                    비밀번호
                  </label>
                  <Link href="/forgot-password" className="text-sm text-accent-blue hover:underline">
                    비밀번호 찾기
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-accent-blue border-gray-300 rounded focus:ring-accent-blue"
                />
                <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                  로그인 상태 유지
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "btn btn-primary btn-lg w-full",
                  loading && "opacity-70 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    로그인 중...
                  </div>
                ) : (
                  '로그인'
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">
                아직 계정이 없으신가요?{' '}
                <Link href="/register" className="text-accent-blue font-bold hover:underline">
                  회원가입
                </Link>
              </span>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              로그인하면 MarketingPlat의{' '}
              <Link href="/terms" className="underline">이용약관</Link>과{' '}
              <Link href="/privacy" className="underline">개인정보처리방침</Link>에
              동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}