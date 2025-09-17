'use client'

import { useState } from 'react'
import ThumbnailEditor from '@/components/thumbnail/ThumbnailEditor'
import SidePanel from '@/components/thumbnail/SidePanel'
import TopToolbar from '@/components/thumbnail/TopToolbar'
import LayerPanel from '@/components/thumbnail/LayerPanel'

export default function ThumbnailCreatorPage() {
  const [activeTab, setActiveTab] = useState<'template' | 'text' | 'image' | 'ai'>('template')
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 })
  const [layers, setLayers] = useState<any[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  const handleCanvasSizeChange = (size: { width: number; height: number }) => {
    setCanvasSize(size)
  }

  const handleAddLayer = (layer: any) => {
    const newLayer = {
      ...layer,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      zIndex: layers.length
    }
    setLayers([...layers, newLayer])
    setSelectedLayerId(newLayer.id)
  }

  const handleUpdateLayer = (layerId: string, updates: any) => {
    setLayers(layers.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    ))
  }

  const handleDeleteLayer = (layerId: string) => {
    setLayers(layers.filter(layer => layer.id !== layerId))
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null)
    }
  }

  const handleReorderLayers = (newLayers: any[]) => {
    setLayers(newLayers)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50">
      {/* Top Toolbar */}
      <TopToolbar
        canvasSize={canvasSize}
        onCanvasSizeChange={handleCanvasSizeChange}
        layers={layers}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <SidePanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onAddLayer={handleAddLayer}
          canvasSize={canvasSize}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <ThumbnailEditor
            canvasSize={canvasSize}
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={handleUpdateLayer}
          />
        </div>

        {/* Right Sidebar - Layer Panel */}
        <LayerPanel
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onDeleteLayer={handleDeleteLayer}
          onReorderLayers={handleReorderLayers}
          onUpdateLayer={handleUpdateLayer}
        />
      </div>
    </div>
  )
}