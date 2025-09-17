'use client'

import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy, Layers } from 'lucide-react'

interface Layer {
  id: string
  type: string
  name?: string
  visible: boolean
  locked: boolean
  opacity: number
}

interface LayerPanelProps {
  layers: Layer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string) => void
  onDeleteLayer: (layerId: string) => void
  onReorderLayers: (layers: Layer[]) => void
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void
}

export default function LayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onDeleteLayer,
  onReorderLayers,
  onUpdateLayer
}: LayerPanelProps) {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(layers)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update z-index based on new order
    const reorderedWithZIndex = items.map((item, index) => ({
      ...item,
      zIndex: index
    }))

    onReorderLayers(reorderedWithZIndex)
  }

  const handleDuplicateLayer = (layer: Layer) => {
    const newLayer = {
      ...layer,
      id: `${layer.id}-copy-${Date.now()}`,
      name: `${layer.name || layer.type} 복사본`,
      position: {
        x: (layer as any).position?.x + 20 || 20,
        y: (layer as any).position?.y + 20 || 20
      }
    }
    // This would be handled by parent component
    console.log('Duplicate layer:', newLayer)
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <Layers className="w-4 h-4 mr-2" />
          레이어
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="layers">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="p-2 space-y-1"
              >
                {[...layers].reverse().map((layer, index) => (
                  <Draggable
                    key={layer.id}
                    draggableId={layer.id}
                    index={index}
                    isDragDisabled={layer.locked}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`
                          flex items-center space-x-2 p-2 rounded-lg cursor-pointer
                          transition-all duration-200
                          ${selectedLayerId === layer.id
                            ? 'bg-blue-50 border border-blue-300'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'}
                          ${snapshot.isDragging ? 'shadow-lg opacity-90' : ''}
                        `}
                        onClick={() => onSelectLayer(layer.id)}
                      >
                        {/* Layer Type Icon */}
                        <div className="flex-1 flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-600 uppercase">
                            {layer.type === 'text' && '텍스트'}
                            {layer.type === 'image' && '이미지'}
                            {layer.type === 'shape' && '도형'}
                            {layer.type === 'template' && '템플릿'}
                          </span>
                        </div>

                        {/* Layer Controls */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onUpdateLayer(layer.id, { visible: !layer.visible })
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {layer.visible ? (
                              <Eye className="w-3.5 h-3.5 text-gray-600" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onUpdateLayer(layer.id, { locked: !layer.locked })
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {layer.locked ? (
                              <Lock className="w-3.5 h-3.5 text-gray-600" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicateLayer(layer)
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Copy className="w-3.5 h-3.5 text-gray-600" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteLayer(layer.id)
                            }}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Layer Properties */}
      {selectedLayerId && (
        <div className="border-t border-gray-200 p-3">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">투명도</label>
              <input
                type="range"
                min="0"
                max="100"
                value={(layers.find(l => l.id === selectedLayerId)?.opacity || 1) * 100}
                onChange={(e) => {
                  onUpdateLayer(selectedLayerId, {
                    opacity: Number(e.target.value) / 100
                  })
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}