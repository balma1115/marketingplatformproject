'use client'

import { useState, useEffect } from 'react'

interface SystemSettings {
  maintenance: boolean
  allowRegistration: boolean
  defaultPlan: string
  defaultCoins: number
  maxApiCallsPerDay: number
  features: {
    smartPlace: boolean
    blogTracking: boolean
    naverAds: boolean
    keywordAnalysis: boolean
  }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    maintenance: false,
    allowRegistration: true,
    defaultPlan: 'basic',
    defaultCoins: 100,
    maxApiCallsPerDay: 1000,
    features: {
      smartPlace: true,
      blogTracking: true,
      naverAds: true,
      keywordAnalysis: true
    }
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings || settings)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (response.ok) {
        alert('설정이 저장되었습니다.')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('설정 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">시스템 설정</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* General Settings */}
        <div>
          <h2 className="text-lg font-semibold mb-4">일반 설정</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.maintenance}
                  onChange={(e) => setSettings({ ...settings, maintenance: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span>유지보수 모드</span>
              </label>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.allowRegistration}
                  onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span>신규 가입 허용</span>
              </label>
            </div>
          </div>
        </div>

        {/* Default Values */}
        <div>
          <h2 className="text-lg font-semibold mb-4">기본값</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기본 플랜
              </label>
              <select
                value={settings.defaultPlan}
                onChange={(e) => setSettings({ ...settings, defaultPlan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                초기 코인
              </label>
              <input
                type="number"
                value={settings.defaultCoins}
                onChange={(e) => setSettings({ ...settings, defaultCoins: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                일일 API 호출 제한
              </label>
              <input
                type="number"
                value={settings.maxApiCallsPerDay}
                onChange={(e) => setSettings({ ...settings, maxApiCallsPerDay: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Feature Toggles */}
        <div>
          <h2 className="text-lg font-semibold mb-4">기능 설정</h2>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.features.smartPlace}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, smartPlace: e.target.checked }
                })}
                className="rounded border-gray-300 text-blue-600"
              />
              <span>스마트플레이스 추적</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.features.blogTracking}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, blogTracking: e.target.checked }
                })}
                className="rounded border-gray-300 text-blue-600"
              />
              <span>블로그 순위 추적</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.features.naverAds}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, naverAds: e.target.checked }
                })}
                className="rounded border-gray-300 text-blue-600"
              />
              <span>네이버 광고 관리</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.features.keywordAnalysis}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, keywordAnalysis: e.target.checked }
                })}
                className="rounded border-gray-300 text-blue-600"
              />
              <span>키워드 분석</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}