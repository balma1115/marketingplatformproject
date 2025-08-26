'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, Phone, Building, AlertCircle, Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    academyName: '',
    academyAddress: '',
    accountType: 'academy', // academy, agency, branch
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false
  })

  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecial: false,
    hasUppercase: false
  })

  const validatePassword = (password: string) => {
    setPasswordValidation({
      minLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*]/.test(password),
      hasUppercase: /[A-Z]/.test(password)
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
      
      if (name === 'password') {
        validatePassword(value)
      }
    }
    
    setError('')
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate step 1
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('모든 필수 항목을 입력해주세요')
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }
    
    if (!Object.values(passwordValidation).every(v => v)) {
      setError('비밀번호 요구사항을 확인해주세요')
      return
    }
    
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate step 2
    if (!formData.name || !formData.phone || !formData.academyName) {
      setError('모든 필수 항목을 입력해주세요')
      return
    }
    
    if (!formData.agreeTerms || !formData.agreePrivacy) {
      setError('필수 약관에 동의해주세요')
      return
    }
    
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false)
      // Redirect to login on success
      router.push('/login?registered=true')
    }, 1500)
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
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                step >= 1 ? "bg-accent-blue text-white" : "bg-gray-200 text-gray-500"
              )}>
                1
              </div>
              <div className={cn(
                "w-20 h-1",
                step >= 2 ? "bg-accent-blue" : "bg-gray-200"
              )} />
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                step >= 2 ? "bg-accent-blue text-white" : "bg-gray-200 text-gray-500"
              )}>
                2
              </div>
            </div>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {step === 1 ? '계정 생성' : '학원 정보 입력'}
              </h1>
              <p className="text-gray-600">
                {step === 1 
                  ? 'MarketingPlat과 함께 시작하세요'
                  : '마지막 단계입니다'
                }
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle size={16} className="text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleNextStep} className="space-y-4">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="form-label">
                    이메일 <span className="text-red-500">*</span>
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
                  <label htmlFor="password" className="form-label">
                    비밀번호 <span className="text-red-500">*</span>
                  </label>
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

                  {/* Password Requirements */}
                  <div className="mt-2 space-y-1">
                    <div className={cn(
                      "flex items-center text-xs",
                      passwordValidation.minLength ? "text-green-600" : "text-gray-400"
                    )}>
                      <Check size={14} className="mr-1" />
                      8자 이상
                    </div>
                    <div className={cn(
                      "flex items-center text-xs",
                      passwordValidation.hasNumber ? "text-green-600" : "text-gray-400"
                    )}>
                      <Check size={14} className="mr-1" />
                      숫자 포함
                    </div>
                    <div className={cn(
                      "flex items-center text-xs",
                      passwordValidation.hasSpecial ? "text-green-600" : "text-gray-400"
                    )}>
                      <Check size={14} className="mr-1" />
                      특수문자 포함
                    </div>
                    <div className={cn(
                      "flex items-center text-xs",
                      passwordValidation.hasUppercase ? "text-green-600" : "text-gray-400"
                    )}>
                      <Check size={14} className="mr-1" />
                      대문자 포함
                    </div>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    비밀번호 확인 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="form-input pl-10 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Next Button */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                >
                  다음 단계
                  <ArrowRight size={20} className="ml-2" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Account Type */}
                <div>
                  <label htmlFor="accountType" className="form-label">
                    계정 유형 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="accountType"
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="academy">학원</option>
                    <option value="agency">에이전시</option>
                    <option value="branch">지사</option>
                  </select>
                </div>

                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="form-label">
                    담당자명 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="form-input pl-10"
                      placeholder="홍길동"
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="form-label">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-input pl-10"
                      placeholder="010-1234-5678"
                    />
                  </div>
                </div>

                {/* Academy Name Field */}
                <div>
                  <label htmlFor="academyName" className="form-label">
                    {formData.accountType === 'academy' ? '학원명' : 
                     formData.accountType === 'agency' ? '회사명' : '지사명'}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      id="academyName"
                      name="academyName"
                      type="text"
                      required
                      value={formData.academyName}
                      onChange={handleChange}
                      className="form-input pl-10"
                      placeholder={
                        formData.accountType === 'academy' ? 'OO학원' : 
                        formData.accountType === 'agency' ? 'OO회사' : 'OO지사'
                      }
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="space-y-3 pt-2">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      className="mt-0.5 mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      <span className="text-red-500">[필수]</span> 이용약관에 동의합니다
                    </span>
                  </label>
                  
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="agreePrivacy"
                      checked={formData.agreePrivacy}
                      onChange={handleChange}
                      className="mt-0.5 mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      <span className="text-red-500">[필수]</span> 개인정보처리방침에 동의합니다
                    </span>
                  </label>
                  
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      name="agreeMarketing"
                      checked={formData.agreeMarketing}
                      onChange={handleChange}
                      className="mt-0.5 mr-2"
                    />
                    <span className="text-sm text-gray-600">
                      [선택] 마케팅 정보 수신에 동의합니다
                    </span>
                  </label>
                </div>

                {/* Submit Buttons */}
                <div className="space-y-3">
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
                        가입 처리 중...
                      </div>
                    ) : (
                      '가입 완료'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn btn-secondary btn-lg w-full"
                    disabled={loading}
                  >
                    이전 단계
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="text-accent-blue font-bold hover:underline">
                로그인
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}