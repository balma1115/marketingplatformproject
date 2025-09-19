'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle, Building2, Globe, Key, User } from 'lucide-react'
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

  // 모든 정보 저장
  const saveAllSettings = async () => {
    setLoading(true)
    setMessage(null)

    try {
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

        {/* 사용자 정보 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <User className="text-gray-600" size={20} />
            <h2 className="text-xl font-bold">사용자 정보</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium mb-2">이메일</label>
              <input
                type="email"
                value={userInfo.email}
                disabled
                className="input input-bordered w-full bg-gray-50"
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
            className="btn btn-primary"
          >
            {loading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <Save size={20} />
            )}
            <span>모든 설정 저장</span>
          </button>
        </div>
      </div>
      </div>
    </>
  )
}