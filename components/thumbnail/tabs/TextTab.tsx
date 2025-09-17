'use client'

import { useState } from 'react'
import { Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

interface TextTabProps {
  onAddLayer: (layer: any) => void
}

const fontFamilies = [
  { value: 'sans-serif', label: '고딕체' },
  { value: 'serif', label: '명조체' },
  { value: 'monospace', label: '고정폭' },
  { value: '"Noto Sans KR"', label: 'Noto Sans KR' },
  { value: '"Nanum Gothic"', label: '나눔고딕' },
  { value: '"Nanum Myeongjo"', label: '나눔명조' },
]

const textPresets = [
  { id: 'title', label: '제목', fontSize: 48, fontWeight: 'bold' },
  { id: 'subtitle', label: '부제목', fontSize: 32, fontWeight: 'normal' },
  { id: 'body', label: '본문', fontSize: 18, fontWeight: 'normal' },
  { id: 'caption', label: '캡션', fontSize: 14, fontWeight: 'normal' },
]

export default function TextTab({ onAddLayer }: TextTabProps) {
  const [textContent, setTextContent] = useState('텍스트 입력')
  const [fontSize, setFontSize] = useState(24)
  const [fontFamily, setFontFamily] = useState('sans-serif')
  const [fontWeight, setFontWeight] = useState('normal')
  const [fontStyle, setFontStyle] = useState('normal')
  const [textDecoration, setTextDecoration] = useState('none')
  const [textAlign, setTextAlign] = useState('center')
  const [color, setColor] = useState('#000000')
  const [backgroundColor, setBackgroundColor] = useState('transparent')
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [lineHeight, setLineHeight] = useState(1.5)

  const handleAddText = () => {
    const layer = {
      type: 'text' as const,
      content: {
        text: textContent,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        textDecoration,
        textAlign,
        color,
        backgroundColor,
        letterSpacing,
        lineHeight,
        style: {
          padding: '10px'
        }
      },
      position: { x: 100, y: 100 },
      size: { width: 300, height: 100 },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: '텍스트 레이어'
    }
    onAddLayer(layer)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Text Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          텍스트 내용
        </label>
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          placeholder="텍스트를 입력하세요"
        />
      </div>

      {/* Preset Styles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          빠른 스타일
        </label>
        <div className="grid grid-cols-2 gap-2">
          {textPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setFontSize(preset.fontSize)
                setFontWeight(preset.fontWeight)
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          글꼴
        </label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {fontFamilies.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          크기: {fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="120"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Text Style Buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          스타일
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
            className={`p-2 rounded-lg border ${
              fontWeight === 'bold' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => setFontStyle(fontStyle === 'italic' ? 'normal' : 'italic')}
            className={`p-2 rounded-lg border ${
              fontStyle === 'italic' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTextDecoration(textDecoration === 'underline' ? 'none' : 'underline')}
            className={`p-2 rounded-lg border ${
              textDecoration === 'underline' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
            }`}
          >
            <Underline className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          정렬
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => setTextAlign('left')}
            className={`p-2 rounded-lg border ${
              textAlign === 'left' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTextAlign('center')}
            className={`p-2 rounded-lg border ${
              textAlign === 'center' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
            }`}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTextAlign('right')}
            className={`p-2 rounded-lg border ${
              textAlign === 'right' ? 'bg-blue-50 border-blue-500' : 'border-gray-300'
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            글자색
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배경색
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={backgroundColor === 'transparent' ? '#ffffff' : backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Letter Spacing */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          자간: {letterSpacing}px
        </label>
        <input
          type="range"
          min="-5"
          max="20"
          value={letterSpacing}
          onChange={(e) => setLetterSpacing(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Line Height */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          줄간격: {lineHeight}
        </label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={lineHeight}
          onChange={(e) => setLineHeight(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddText}
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        텍스트 추가
      </button>
    </div>
  )
}