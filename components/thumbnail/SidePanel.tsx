'use client'

import { useState } from 'react'
import { Type, Image, Wand2, Layout, Shapes, Upload } from 'lucide-react'
import TemplateTab from './tabs/TemplateTab'
import TextTab from './tabs/TextTab'
import ImageTab from './tabs/ImageTab'
import AIImageTab from './tabs/AIImageTab'

interface SidePanelProps {
  activeTab: 'template' | 'text' | 'image' | 'ai'
  onTabChange: (tab: 'template' | 'text' | 'image' | 'ai') => void
  onAddLayer: (layer: any) => void
  canvasSize: { width: number; height: number }
}

export default function SidePanel({ activeTab, onTabChange, onAddLayer, canvasSize }: SidePanelProps) {
  const tabs = [
    { id: 'template', label: '템플릿', icon: Layout },
    { id: 'text', label: '텍스트', icon: Type },
    { id: 'image', label: '이미지', icon: Image },
    { id: 'ai', label: 'AI 이미지', icon: Wand2 },
  ]

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Tab Navigation */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id as any)}
              className={`
                flex flex-col items-center justify-center p-3 transition-colors
                ${activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
              `}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'template' && (
          <TemplateTab onAddLayer={onAddLayer} canvasSize={canvasSize} />
        )}
        {activeTab === 'text' && (
          <TextTab onAddLayer={onAddLayer} />
        )}
        {activeTab === 'image' && (
          <ImageTab onAddLayer={onAddLayer} />
        )}
        {activeTab === 'ai' && (
          <AIImageTab onAddLayer={onAddLayer} canvasSize={canvasSize} />
        )}
      </div>
    </div>
  )
}