'use client'

import { useState } from 'react'
import { Upload, Image as ImageIcon, Link } from 'lucide-react'

interface ImageTabProps {
  onAddLayer: (layer: any) => void
}

export default function ImageTab({ onAddLayer }: ImageTabProps) {
  const [imageUrl, setImageUrl] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string
        setUploadedImages(prev => [...prev, imageSrc])

        // Automatically add to canvas
        const img = new Image()
        img.onload = () => {
          const layer = {
            type: 'image' as const,
            content: {
              src: imageSrc,
              objectFit: 'cover',
              brightness: 100,
              contrast: 100,
              saturate: 100,
            },
            position: { x: 50, y: 50 },
            size: {
              width: Math.min(img.width, 400),
              height: Math.min(img.height, 400) * (img.height / img.width)
            },
            rotation: 0,
            opacity: 1,
            locked: false,
            visible: true,
            name: file.name
          }
          onAddLayer(layer)
        }
        img.src = imageSrc
      }
      reader.readAsDataURL(file)
    })
  }

  const handleUrlAdd = () => {
    if (!imageUrl) return

    const img = new Image()
    img.onload = () => {
      const layer = {
        type: 'image' as const,
        content: {
          src: imageUrl,
          objectFit: 'cover',
          brightness: 100,
          contrast: 100,
          saturate: 100,
        },
        position: { x: 50, y: 50 },
        size: {
          width: Math.min(img.width, 400),
          height: Math.min(img.height, 400) * (img.height / img.width)
        },
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        name: 'URL 이미지'
      }
      onAddLayer(layer)
      setImageUrl('')
    }
    img.src = imageUrl
  }

  const stockImages = [
    { id: 1, url: 'https://images.unsplash.com/photo-1506765515384-028b60a970df', name: '풍경' },
    { id: 2, url: 'https://images.unsplash.com/photo-1557683316-973673baf926', name: '그라데이션' },
    { id: 3, url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809', name: '추상' },
    { id: 4, url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', name: '패턴' },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* File Upload */}
      <div>
        <label className="block w-full">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">이미지 파일 업로드</p>
            <p className="text-xs text-gray-500 mt-1">클릭하거나 드래그하여 업로드</p>
          </div>
        </label>
      </div>

      {/* URL Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          이미지 URL
        </label>
        <div className="flex space-x-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUrlAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            추가
          </button>
        </div>
      </div>

      {/* Stock Images */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">스톡 이미지</h3>
        <div className="grid grid-cols-2 gap-2">
          {stockImages.map((img) => (
            <div
              key={img.id}
              onClick={() => {
                const layer = {
                  type: 'image' as const,
                  content: {
                    src: img.url,
                    objectFit: 'cover',
                    brightness: 100,
                    contrast: 100,
                    saturate: 100,
                  },
                  position: { x: 50, y: 50 },
                  size: { width: 400, height: 300 },
                  rotation: 0,
                  opacity: 1,
                  locked: false,
                  visible: true,
                  name: img.name
                }
                onAddLayer(layer)
              }}
              className="cursor-pointer group"
            >
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all">
                <img
                  src={`${img.url}?w=200&h=150&fit=crop`}
                  alt={img.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="mt-1 text-xs text-gray-600">{img.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Uploaded */}
      {uploadedImages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">최근 업로드</h3>
          <div className="grid grid-cols-2 gap-2">
            {uploadedImages.slice(-4).map((src, index) => (
              <div
                key={index}
                onClick={() => {
                  const layer = {
                    type: 'image' as const,
                    content: {
                      src,
                      objectFit: 'cover',
                      brightness: 100,
                      contrast: 100,
                      saturate: 100,
                    },
                    position: { x: 50, y: 50 },
                    size: { width: 400, height: 300 },
                    rotation: 0,
                    opacity: 1,
                    locked: false,
                    visible: true,
                    name: `이미지 ${index + 1}`
                  }
                  onAddLayer(layer)
                }}
                className="cursor-pointer"
              >
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all">
                  <img
                    src={src}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shapes */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">도형</h3>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              const layer = {
                type: 'shape' as const,
                content: {
                  backgroundColor: '#3B82F6',
                  borderRadius: 0,
                },
                position: { x: 100, y: 100 },
                size: { width: 200, height: 200 },
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                name: '사각형'
              }
              onAddLayer(layer)
            }}
            className="aspect-square border border-gray-300 rounded-lg hover:border-blue-500 flex items-center justify-center"
          >
            <div className="w-8 h-8 bg-blue-500"></div>
          </button>
          <button
            onClick={() => {
              const layer = {
                type: 'shape' as const,
                content: {
                  backgroundColor: '#10B981',
                  borderRadius: '50%',
                },
                position: { x: 100, y: 100 },
                size: { width: 200, height: 200 },
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                name: '원'
              }
              onAddLayer(layer)
            }}
            className="aspect-square border border-gray-300 rounded-lg hover:border-blue-500 flex items-center justify-center"
          >
            <div className="w-8 h-8 bg-green-500 rounded-full"></div>
          </button>
          <button
            onClick={() => {
              const layer = {
                type: 'shape' as const,
                content: {
                  backgroundColor: '#F59E0B',
                  borderRadius: 8,
                },
                position: { x: 100, y: 100 },
                size: { width: 200, height: 200 },
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                name: '둥근 사각형'
              }
              onAddLayer(layer)
            }}
            className="aspect-square border border-gray-300 rounded-lg hover:border-blue-500 flex items-center justify-center"
          >
            <div className="w-8 h-8 bg-amber-500 rounded"></div>
          </button>
        </div>
      </div>
    </div>
  )
}