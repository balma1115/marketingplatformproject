'use client'

import { useState } from 'react'
import { Download, Upload, Undo, Redo, Save } from 'lucide-react'
import html2canvas from 'html2canvas'

interface TopToolbarProps {
  canvasSize: { width: number; height: number }
  onCanvasSizeChange: (size: { width: number; height: number }) => void
  layers: any[]
}

const presets = [
  { name: '유튜브 썸네일', width: 1280, height: 720 },
  { name: '인스타그램 정방형', width: 1080, height: 1080 },
  { name: '인스타그램 세로형', width: 1080, height: 1350 },
  { name: '페이스북 커버', width: 1200, height: 630 },
  { name: '트위터 헤더', width: 1500, height: 500 },
]

export default function TopToolbar({ canvasSize, onCanvasSizeChange, layers }: TopToolbarProps) {
  const [customWidth, setCustomWidth] = useState(canvasSize.width)
  const [customHeight, setCustomHeight] = useState(canvasSize.height)

  const handlePresetSelect = (preset: typeof presets[0]) => {
    onCanvasSizeChange({ width: preset.width, height: preset.height })
    setCustomWidth(preset.width)
    setCustomHeight(preset.height)
  }

  const handleCustomSizeApply = () => {
    onCanvasSizeChange({ width: customWidth, height: customHeight })
  }

  const handleDownload = async () => {
    const canvasElement = document.getElementById('thumbnail-canvas')
    if (!canvasElement) return

    try {
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: null,
        scale: 2,
      })

      const link = document.createElement('a')
      link.download = `thumbnail-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Failed to download canvas:', error)
    }
  }

  const handleSaveProject = () => {
    const projectData = {
      canvasSize,
      layers,
      timestamp: Date.now()
    }

    const dataStr = JSON.stringify(projectData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)

    const link = document.createElement('a')
    link.download = `thumbnail-project-${Date.now()}.json`
    link.href = dataUri
    link.click()
  }

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target?.result as string)
        if (projectData.canvasSize) {
          onCanvasSizeChange(projectData.canvasSize)
          setCustomWidth(projectData.canvasSize.width)
          setCustomHeight(projectData.canvasSize.height)
        }
        // Note: Layer loading would be handled by parent component
      } catch (error) {
        console.error('Failed to load project:', error)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Canvas Size Presets */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">템플릿:</label>
            <select
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => {
                const preset = presets.find(p => p.name === e.target.value)
                if (preset) handlePresetSelect(preset)
              }}
            >
              <option value="">사이즈 선택</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name} ({preset.width}x{preset.height})
                </option>
              ))}
            </select>
          </div>

          {/* Custom Size Input */}
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(Number(e.target.value))}
              className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              placeholder="가로"
            />
            <span className="text-gray-500">×</span>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(Number(e.target.value))}
              className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-lg"
              placeholder="세로"
            />
            <button
              onClick={handleCustomSizeApply}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              적용
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <Undo className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <Redo className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-gray-300 mx-2" />

          <button
            onClick={handleSaveProject}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="프로젝트 저장"
          >
            <Save className="w-5 h-5" />
          </button>

          <label className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer">
            <Upload className="w-5 h-5" />
            <input
              type="file"
              accept=".json"
              onChange={handleLoadProject}
              className="hidden"
            />
          </label>

          <button
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">다운로드</span>
          </button>
        </div>
      </div>

      {/* Current Canvas Info */}
      <div className="mt-2 text-xs text-gray-500">
        현재 캔버스: {canvasSize.width}px × {canvasSize.height}px
      </div>
    </div>
  )
}