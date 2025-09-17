'use client'

import { useRef, useEffect, useState } from 'react'
import { Rnd } from 'react-rnd'
import { Trash2, Copy, Lock, Unlock, Eye, EyeOff } from 'lucide-react'

interface Layer {
  id: string
  type: 'text' | 'image' | 'shape' | 'template'
  content: any
  position: { x: number; y: number }
  size: { width: number; height: number }
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
  zIndex: number
}

interface ThumbnailEditorProps {
  canvasSize: { width: number; height: number }
  layers: Layer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string | null) => void
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void
}

export default function ThumbnailEditor({
  canvasSize,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer
}: ThumbnailEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      if (canvasRef.current) {
        const container = canvasRef.current.parentElement
        if (container) {
          const containerWidth = container.clientWidth - 40
          const containerHeight = container.clientHeight - 40
          const scaleX = containerWidth / canvasSize.width
          const scaleY = containerHeight / canvasSize.height
          setScale(Math.min(scaleX, scaleY, 1))
        }
      }
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [canvasSize])

  const renderLayer = (layer: Layer) => {
    if (!layer.visible) return null

    const isSelected = layer.id === selectedLayerId

    const handleDragStop = (_: any, d: any) => {
      if (!layer.locked) {
        onUpdateLayer(layer.id, { position: { x: d.x, y: d.y } })
      }
    }

    const handleResizeStop = (_: any, __: any, ref: any, ___: any, position: any) => {
      if (!layer.locked) {
        onUpdateLayer(layer.id, {
          size: {
            width: ref.offsetWidth,
            height: ref.offsetHeight
          },
          position
        })
      }
    }

    const content = () => {
      switch (layer.type) {
        case 'text':
          return (
            <div
              style={{
                ...layer.content.style,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: layer.content.align || 'center',
                justifyContent: layer.content.justify || 'center',
                fontSize: layer.content.fontSize || 24,
                fontFamily: layer.content.fontFamily || 'sans-serif',
                fontWeight: layer.content.fontWeight || 'normal',
                color: layer.content.color || '#000000',
                textAlign: layer.content.textAlign || 'center',
                lineHeight: layer.content.lineHeight || 1.5,
                letterSpacing: layer.content.letterSpacing || 0,
              }}
              contentEditable={isSelected && !layer.locked}
              suppressContentEditableWarning={true}
              onBlur={(e) => {
                if (!layer.locked) {
                  onUpdateLayer(layer.id, {
                    content: {
                      ...layer.content,
                      text: e.currentTarget.innerText
                    }
                  })
                }
              }}
            >
              {layer.content.text || '텍스트를 입력하세요'}
            </div>
          )
        case 'image':
          return (
            <img
              src={layer.content.src}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: layer.content.objectFit || 'cover',
                filter: `brightness(${layer.content.brightness || 100}%) contrast(${layer.content.contrast || 100}%) saturate(${layer.content.saturate || 100}%)`
              }}
              draggable={false}
            />
          )
        case 'shape':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: layer.content.backgroundColor || '#3B82F6',
                borderRadius: layer.content.borderRadius || 0,
                border: layer.content.border || 'none',
                boxShadow: layer.content.boxShadow || 'none',
              }}
            />
          )
        case 'template':
          return (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${layer.content.backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {layer.content.elements?.map((element: any, index: number) => (
                <div
                  key={index}
                  style={element.style}
                  contentEditable={element.editable}
                  suppressContentEditableWarning={true}
                >
                  {element.text || element.content}
                </div>
              ))}
            </div>
          )
        default:
          return null
      }
    }

    return (
      <Rnd
        key={layer.id}
        position={layer.position}
        size={layer.size}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
        disableDragging={layer.locked}
        enableResizing={!layer.locked}
        onClick={(e: any) => {
          e.stopPropagation()
          onSelectLayer(layer.id)
        }}
        style={{
          opacity: layer.opacity,
          transform: `rotate(${layer.rotation}deg)`,
          zIndex: layer.zIndex,
          border: isSelected ? '2px solid #3B82F6' : 'none',
          boxShadow: isSelected ? '0 0 0 1px rgba(59, 130, 246, 0.5)' : 'none',
        }}
        className="cursor-move hover:outline hover:outline-2 hover:outline-blue-400"
      >
        {content()}
      </Rnd>
    )
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div
        className="relative bg-white shadow-2xl"
        style={{
          width: canvasSize.width * scale,
          height: canvasSize.height * scale,
          transform: `scale(${scale})`,
          transformOrigin: 'center',
        }}
      >
        <div
          ref={canvasRef}
          id="thumbnail-canvas"
          className="relative w-full h-full overflow-hidden bg-white"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
          }}
          onClick={() => onSelectLayer(null)}
        >
          {layers
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(layer => renderLayer(layer))}
        </div>
      </div>
    </div>
  )
}