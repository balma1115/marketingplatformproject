'use client'

import { useState } from 'react'

interface TemplateTabProps {
  onAddLayer: (layer: any) => void
  canvasSize: { width: number; height: number }
}

const templates = [
  {
    id: 'youtube-1',
    name: '유튜브 썸네일 1',
    preview: '/templates/youtube-1.jpg',
    category: 'youtube',
    elements: [
      {
        type: 'text',
        text: '제목을 입력하세요',
        style: {
          position: 'absolute',
          top: '20%',
          left: '10%',
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
        },
        editable: true
      }
    ]
  },
  {
    id: 'instagram-1',
    name: '인스타그램 포스트 1',
    preview: '/templates/instagram-1.jpg',
    category: 'instagram',
    elements: [
      {
        type: 'text',
        text: '여기에 텍스트 입력',
        style: {
          position: 'absolute',
          bottom: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '32px',
          color: '#ffffff',
          textAlign: 'center'
        },
        editable: true
      }
    ]
  },
  {
    id: 'blog-1',
    name: '블로그 헤더 1',
    preview: '/templates/blog-1.jpg',
    category: 'blog',
    elements: [
      {
        type: 'text',
        text: '블로그 제목',
        style: {
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '42px',
          fontWeight: 'bold',
          color: '#333333'
        },
        editable: true
      }
    ]
  }
]

const categories = [
  { id: 'all', name: '전체' },
  { id: 'youtube', name: '유튜브' },
  { id: 'instagram', name: '인스타그램' },
  { id: 'blog', name: '블로그' },
  { id: 'facebook', name: '페이스북' },
]

export default function TemplateTab({ onAddLayer, canvasSize }: TemplateTabProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory)

  const handleTemplateSelect = (template: typeof templates[0]) => {
    const layer = {
      type: 'template' as const,
      content: {
        backgroundImage: template.preview,
        elements: template.elements,
        templateId: template.id
      },
      position: { x: 0, y: 0 },
      size: { width: canvasSize.width, height: canvasSize.height },
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      name: template.name
    }
    onAddLayer(layer)
  }

  return (
    <div className="p-4">
      {/* Category Filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                px-3 py-1 text-sm font-medium rounded-full transition-colors
                ${selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}
              `}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className="cursor-pointer group"
          >
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all">
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <span className="text-xs text-gray-500">{template.name}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-600 group-hover:text-blue-600 transition-colors">
              {template.name}
            </p>
          </div>
        ))}
      </div>

      {/* Custom Template Upload */}
      <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
        <label className="block text-center cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = (event) => {
                  const layer = {
                    type: 'image' as const,
                    content: {
                      src: event.target?.result as string
                    },
                    position: { x: 0, y: 0 },
                    size: { width: canvasSize.width, height: canvasSize.height },
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    name: '커스텀 템플릿'
                  }
                  onAddLayer(layer)
                }
                reader.readAsDataURL(file)
              }
            }}
          />
          <div className="text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">커스텀 템플릿 업로드</span>
          </div>
        </label>
      </div>
    </div>
  )
}