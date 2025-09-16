'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, X } from 'lucide-react'

interface NegativeKeyword {
  keyword: string
  type: 'KEYWORD_PLUS_RESTRICT' | 'PHRASE_KEYWORD_RESTRICT' | 'EXACT_KEYWORD_RESTRICT'
  regTm?: string
  editTm?: string
}

export default function NegativeKeywordsTab({ adgroupId }: { adgroupId: string }) {
  const [negativeKeywords, setNegativeKeywords] = useState<NegativeKeyword[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [newKeywords, setNewKeywords] = useState('')
  const [keywordType, setKeywordType] = useState<NegativeKeyword['type']>('KEYWORD_PLUS_RESTRICT')

  // 제외 키워드 조회
  const fetchNegativeKeywords = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/ads/adgroups/${adgroupId}/negative-keywords`)
      if (response.ok) {
        const data = await response.json()
        setNegativeKeywords(data)
      }
    } catch (error) {
      console.error('Failed to fetch negative keywords:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNegativeKeywords()
  }, [adgroupId])

  // 제외 키워드 추가
  const handleAddKeywords = async () => {
    const keywords = newKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .map(keyword => ({ keyword, type: keywordType }))

    if (keywords.length === 0) return

    setLoading(true)
    try {
      const response = await fetch(`/api/ads/adgroups/${adgroupId}/negative-keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      })

      if (response.ok) {
        await fetchNegativeKeywords()
        setNewKeywords('')
        setShowAddModal(false)
      } else {
        const error = await response.json()
        alert(`제외 키워드 추가 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to add negative keywords:', error)
      alert('제외 키워드 추가 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 제외 키워드 삭제
  const handleDeleteKeywords = async () => {
    if (selectedKeywords.size === 0) {
      alert('삭제할 키워드를 선택해주세요')
      return
    }

    if (!confirm(`선택한 ${selectedKeywords.size}개의 키워드를 삭제하시겠습니까?`)) {
      return
    }

    setLoading(true)
    try {
      const ids = Array.from(selectedKeywords).join(',')
      const response = await fetch(
        `/api/ads/adgroups/${adgroupId}/negative-keywords?ids=${encodeURIComponent(ids)}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        await fetchNegativeKeywords()
        setSelectedKeywords(new Set())
      } else {
        const error = await response.json()
        alert(`제외 키워드 삭제 실패: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to delete negative keywords:', error)
      alert('제외 키워드 삭제 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 키워드 선택 토글
  const toggleKeywordSelection = (keyword: string) => {
    const newSelection = new Set(selectedKeywords)
    if (newSelection.has(keyword)) {
      newSelection.delete(keyword)
    } else {
      newSelection.add(keyword)
    }
    setSelectedKeywords(newSelection)
  }

  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedKeywords.size === negativeKeywords.length) {
      setSelectedKeywords(new Set())
    } else {
      setSelectedKeywords(new Set(negativeKeywords.map(k => k.keyword)))
    }
  }

  const getTypeLabel = (type: NegativeKeyword['type']) => {
    switch(type) {
      case 'KEYWORD_PLUS_RESTRICT':
        return '확장 제외'
      case 'PHRASE_KEYWORD_RESTRICT':
        return '구문 제외'
      case 'EXACT_KEYWORD_RESTRICT':
        return '정확 제외'
      default:
        return type
    }
  }

  return (
    <div>
      {/* 헤더 및 액션 버튼 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          제외 키워드 ({negativeKeywords.length}개)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteKeywords}
            disabled={selectedKeywords.size === 0 || loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Trash2 size={16} />
            선택 삭제 ({selectedKeywords.size})
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus size={16} />
            제외 키워드 추가
          </button>
        </div>
      </div>

      {/* 제외 키워드 테이블 */}
      <div className="bg-white rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={negativeKeywords.length > 0 && selectedKeywords.size === negativeKeywords.length}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="p-3 text-left">키워드</th>
              <th className="p-3 text-left">유형</th>
              <th className="p-3 text-left">등록일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : negativeKeywords.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  제외 키워드가 없습니다
                </td>
              </tr>
            ) : (
              negativeKeywords.map((keyword) => (
                <tr 
                  key={keyword.keyword} 
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedKeywords.has(keyword.keyword)}
                      onChange={() => toggleKeywordSelection(keyword.keyword)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-medium">{keyword.keyword}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {getTypeLabel(keyword.type)}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600">
                    {keyword.regTm ? new Date(keyword.regTm).toLocaleString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 제외 키워드 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">제외 키워드 추가</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                제외 유형
              </label>
              <select
                value={keywordType}
                onChange={(e) => setKeywordType(e.target.value as NegativeKeyword['type'])}
                className="w-full p-2 border rounded"
              >
                <option value="KEYWORD_PLUS_RESTRICT">확장 제외</option>
                <option value="PHRASE_KEYWORD_RESTRICT">구문 제외</option>
                <option value="EXACT_KEYWORD_RESTRICT">정확 제외</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                제외할 키워드 (한 줄에 하나씩)
              </label>
              <textarea
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                rows={8}
                placeholder="제외할 키워드를 입력하세요&#10;예:&#10;무료&#10;할인&#10;이벤트"
                className="w-full p-2 border rounded"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleAddKeywords}
                disabled={loading || newKeywords.trim() === ''}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}