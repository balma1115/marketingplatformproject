'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle, Building2, Globe, Key, User, Lock, School, MapPin, Mail } from 'lucide-react'
import Header from '@/components/layout/Header'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // 사용자 정보
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    academyName: '',
    academyAddress: '',
  })

  // 조직 정보
  const [organizationInfo, setOrganizationInfo] = useState({
    subjects: [] as any[],
    branches: [] as any[],
    academies: [] as any[]
  })

  // 비밀번호 변경
  const [passwordInfo, setPasswordInfo] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // 스마트플레이스 정보
  const [smartPlaceInfo, setSmartPlaceInfo] = useState({
    placeId: '',
    placeName: '',
    address: '',
    phone: '',
  })

  // 블로그 정보
  const [blogInfo, setBlogInfo] = useState({
    blogUrl: '',
    blogName: '',
    blogId: '',
  })

  // 네이버 광고 API 정보
  const [naverAdsInfo, setNaverAdsInfo] = useState({
    customerId: '',
    apiKey: '',
    secretKey: '',
  })

  // 데이터 불러오기
  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchUserData()
    fetchOrganizationData()
  }, [user])

  const fetchUserData = async () => {
    try {
      // 사용자 기본 정보
      const userRes = await fetch('/api/user/profile')
      if (userRes.ok) {
        const userData = await userRes.json()
        setUserInfo({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          academyName: userData.academyName || '',
          academyAddress: userData.academyAddress || '',
        })
      }

      // 스마트플레이스 정보
      const spRes = await fetch('/api/smartplace-keywords/my-place')
      if (spRes.ok) {
        const spData = await spRes.json()
        if (spData.smartPlace) {
          setSmartPlaceInfo({
            placeId: spData.smartPlace.placeId || '',
            placeName: spData.smartPlace.placeName || '',
            address: spData.smartPlace.address || '',
            phone: spData.smartPlace.phone || '',
          })
        }
      }

      // 블로그 정보
      const blogRes = await fetch('/api/blog-keywords/my-blog')
      if (blogRes.ok) {
        const blogData = await blogRes.json()
        if (blogData.project) {
          setBlogInfo({
            blogUrl: blogData.project.blogUrl || '',
            blogName: blogData.project.blogName || '',
            blogId: blogData.project.blogId || '',
          })
        }
      }

      // 네이버 광고 API 정보
      const adsRes = await fetch('/api/user/naver-ads-config')
      if (adsRes.ok) {
        const adsData = await adsRes.json()
        if (adsData.config) {
          setNaverAdsInfo({
            customerId: adsData.config.customerId || '',
            apiKey: adsData.config.apiKey || '',
            secretKey: adsData.config.secretKey || '',
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' })
    }
  }

  // 조직 정보 불러오기
  const fetchOrganizationData = async () => {
    try {
      const orgRes = await fetch('/api/user/organization')
      if (orgRes.ok) {
        const orgData = await orgRes.json()
        setOrganizationInfo(orgData)
      }
    } catch (error) {
      console.error('Failed to fetch organization data:', error)
    }
  }

  // 사용자 정보 저장
  const saveUserInfo = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userInfo),
      })

      if (!res.ok) throw new Error('Failed to update user info')

      setMessage({ type: 'success', text: '사용자 정보가 저장되었습니다.' })
      refreshUser()
    } catch (error) {
      setMessage({ type: 'error', text: '사용자 정보 저장에 실패했습니다.' })
    }
  }

  // 스마트플레이스 정보 저장
  const saveSmartPlaceInfo = async () => {
    try {
      const res = await fetch('/api/smartplace-keywords/update-place', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smartPlaceInfo),
      })

      if (!res.ok) throw new Error('Failed to update SmartPlace info')

      setMessage({ type: 'success', text: '스마트플레이스 정보가 저장되었습니다.' })
    } catch (error) {
      setMessage({ type: 'error', text: '스마트플레이스 정보 저장에 실패했습니다.' })
    }
  }

  // 블로그 정보 저장
  const saveBlogInfo = async () => {
    try {
      const res = await fetch('/api/blog-keywords/update-blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blogInfo),
      })

      if (!res.ok) throw new Error('Failed to update blog info')

      setMessage({ type: 'success', text: '블로그 정보가 저장되었습니다.' })
    } catch (error) {
      setMessage({ type: 'error', text: '블로그 정보 저장에 실패했습니다.' })
    }
  }

  // 네이버 광고 API 정보 저장
  const saveNaverAdsInfo = async () => {
    try {
      const res = await fetch('/api/user/naver-ads-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(naverAdsInfo),
      })

      if (!res.ok) throw new Error('Failed to update Naver Ads config')

      setMessage({ type: 'success', text: '네이버 광고 API 정보가 저장되었습니다.' })
    } catch (error) {
      setMessage({ type: 'error', text: '네이버 광고 API 정보 저장에 실패했습니다.' })
    }
  }

  // 비밀번호 변경
  const changePassword = async () => {
    if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
      setMessage({ type: 'error', text: '새 비밀번호가 일치하지 않습니다.' })
      return false
    }

    if (passwordInfo.newPassword.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 6자 이상이어야 합니다.' })
      return false
    }

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordInfo.currentPassword,
          newPassword: passwordInfo.newPassword
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to change password')
      }

      setPasswordInfo({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setMessage({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      return true
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '비밀번호 변경에 실패했습니다.' })
      return false
    }
  }

  // 모든 정보 저장
  const saveAllSettings = async () => {
    setLoading(true)
    setMessage(null)

    try {
      // 비밀번호 변경이 있으면 먼저 처리
      if (passwordInfo.newPassword || passwordInfo.confirmPassword) {
        const passwordChanged = await changePassword()
        if (!passwordChanged) {
          setLoading(false)
          return
        }
      }

      await Promise.all([
        saveUserInfo(),
        smartPlaceInfo.placeName && saveSmartPlaceInfo(),
        blogInfo.blogUrl && saveBlogInfo(),
        naverAdsInfo.customerId && saveNaverAdsInfo(),
      ].filter(Boolean))

      setMessage({ type: 'success', text: '모든 설정이 저장되었습니다.' })
    } catch (error) {
      setMessage({ type: 'error', text: '일부 설정 저장에 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="min-h-screen pt-20 bg-gray-50">
        <div className="container max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">설정</h1>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <AlertCircle size={20} />
            <span>{message.text}</span>
          </div>
        )}

        {/* 계정 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Mail className="text-gray-600" size={20} />
            <h2 className="text-xl font-bold">계정 정보</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">아이디 (이메일)</label>
              <input
                type="email"
                value={userInfo.email}
                disabled
                className="input input-bordered w-full bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">이름</label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">전화번호</label>
              <input
                type="tel"
                value={userInfo.phone}
                onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">학원명</label>
              <input
                type="text"
                value={userInfo.academyName}
                onChange={(e) => setUserInfo({ ...userInfo, academyName: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">학원 주소</label>
              <input
                type="text"
                value={userInfo.academyAddress}
                onChange={(e) => setUserInfo({ ...userInfo, academyAddress: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* 조직 정보 표시 */}
          {organizationInfo.subjects.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium mb-3">소속 정보</h3>
              <div className="space-y-2 text-sm">
                {organizationInfo.subjects.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <School className="text-gray-400" size={16} />
                    <span>
                      <span className="font-medium">{item.subjectName}</span> ›
                      <span className="ml-1">{item.branchName}</span>
                      {item.academyName && (
                        <span className="ml-1">› {item.academyName}</span>
                      )}
                      {item.isBranchManager && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">지사장</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 비밀번호 변경 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Lock className="text-gray-600" size={20} />
            <h2 className="text-xl font-bold">비밀번호 변경</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">현재 비밀번호</label>
              <input
                type="password"
                value={passwordInfo.currentPassword}
                onChange={(e) => setPasswordInfo({ ...passwordInfo, currentPassword: e.target.value })}
                className="input input-bordered w-full"
                placeholder="현재 비밀번호"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">새 비밀번호</label>
              <input
                type="password"
                value={passwordInfo.newPassword}
                onChange={(e) => setPasswordInfo({ ...passwordInfo, newPassword: e.target.value })}
                className="input input-bordered w-full"
                placeholder="6자 이상"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">새 비밀번호 확인</label>
              <input
                type="password"
                value={passwordInfo.confirmPassword}
                onChange={(e) => setPasswordInfo({ ...passwordInfo, confirmPassword: e.target.value })}
                className="input input-bordered w-full"
                placeholder="비밀번호 재입력"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            ※ 비밀번호를 변경하지 않으려면 비워두세요
          </p>
        </div>

        {/* 스마트플레이스 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Building2 className="text-gray-600" size={20} />
            <h2 className="text-xl font-bold">스마트플레이스 정보</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">플레이스 ID</label>
              <input
                type="text"
                value={smartPlaceInfo.placeId}
                onChange={(e) => setSmartPlaceInfo({ ...smartPlaceInfo, placeId: e.target.value })}
                className="input input-bordered w-full"
                placeholder="예: 1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">업체명</label>
              <input
                type="text"
                value={smartPlaceInfo.placeName}
                onChange={(e) => setSmartPlaceInfo({ ...smartPlaceInfo, placeName: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">주소</label>
              <input
                type="text"
                value={smartPlaceInfo.address}
                onChange={(e) => setSmartPlaceInfo({ ...smartPlaceInfo, address: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">전화번호</label>
              <input
                type="tel"
                value={smartPlaceInfo.phone}
                onChange={(e) => setSmartPlaceInfo({ ...smartPlaceInfo, phone: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        {/* 블로그 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="text-gray-600" size={20} />
            <h2 className="text-xl font-bold">블로그 정보</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">블로그 URL</label>
              <input
                type="url"
                value={blogInfo.blogUrl}
                onChange={(e) => setBlogInfo({ ...blogInfo, blogUrl: e.target.value })}
                className="input input-bordered w-full"
                placeholder="예: https://blog.naver.com/myblog"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">블로그명</label>
              <input
                type="text"
                value={blogInfo.blogName}
                onChange={(e) => setBlogInfo({ ...blogInfo, blogName: e.target.value })}
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">블로그 ID</label>
              <input
                type="text"
                value={blogInfo.blogId}
                onChange={(e) => setBlogInfo({ ...blogInfo, blogId: e.target.value })}
                className="input input-bordered w-full"
                placeholder="예: myblog"
              />
            </div>
          </div>
        </div>

        {/* 네이버 광고 API 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="text-gray-600" size={20} />
            <h2 className="text-xl font-bold">네이버 광고 API 설정</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Customer ID</label>
              <input
                type="text"
                value={naverAdsInfo.customerId}
                onChange={(e) => setNaverAdsInfo({ ...naverAdsInfo, customerId: e.target.value })}
                className="input input-bordered w-full"
                placeholder="예: 1234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">API Key</label>
              <input
                type="password"
                value={naverAdsInfo.apiKey}
                onChange={(e) => setNaverAdsInfo({ ...naverAdsInfo, apiKey: e.target.value })}
                className="input input-bordered w-full font-mono text-sm"
                placeholder="0100000000..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Secret Key</label>
              <input
                type="password"
                value={naverAdsInfo.secretKey}
                onChange={(e) => setNaverAdsInfo({ ...naverAdsInfo, secretKey: e.target.value })}
                className="input input-bordered w-full font-mono text-sm"
                placeholder="AQAAAAxx..."
              />
            </div>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={saveAllSettings}
            disabled={loading}
            className="px-6 py-3 bg-accent-blue hover:bg-secondary-blue text-white rounded-lg font-medium
                     transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center space-x-2 shadow-sm hover:shadow-md"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <Save size={18} />
            )}
            <span>모든 설정 저장</span>
          </button>
        </div>
      </div>
      </div>
    </>
  )
}